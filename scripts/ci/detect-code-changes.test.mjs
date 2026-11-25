/*
 * scripts/ci/detect-code-changes.sh：喺臨時 git repo 入面真係跑個 script（ci.yml `changes` job 叫嘅同一份）。
 * - 分類對象係成條 branch（同 origin/main 嘅 merge-base → SHA），唔係今次 push 嘅 delta：
 *   「code push 之後跟一個淨文件 push」仍然係 code=true
 * - 「淨文件」= 只掂冇任何 CI 檢查會驗嘅路徑（.proj-docs/、_mockups_/、_design_/、LICENSE）。
 *   其他 `.md`（README、.claude/CLAUDE.md）有 `prettier --check`，所以當 code
 * - `--no-renames`：source 檔 `git mv` 入文件路徑唔可以當淨文件
 * - 判斷唔到（冇 merge-base、冇 origin/main、diff 係空）一律 code=true
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./detect-code-changes.sh', import.meta.url));
const EXIT_USAGE_ERROR = 2;
const TEST_GIT_ENV = {
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'ci-test',
    GIT_AUTHOR_EMAIL: 'ci-test@example.invalid',
    GIT_COMMITTER_NAME: 'ci-test',
    GIT_COMMITTER_EMAIL: 'ci-test@example.invalid',
};

/**
 * 臨時 repo 用嘅 env：唔食用戶 / 系統 git 設定，亦唔承繼任何 `GIT_*`，
 * 另外清走 runner 自己嘅 `GITHUB_*`（呢個 test 喺 Actions 跑時有真嘅 GITHUB_SHA / GITHUB_OUTPUT，唔可以漏入 script）
 */
function isolatedEnv(inherited) {
    const kept = Object.entries(inherited).filter(
        ([name]) => !name.startsWith('GIT_') && !name.startsWith('GITHUB_'),
    );
    return { ...Object.fromEntries(kept), ...TEST_GIT_ENV };
}

const BASE_ENV = isolatedEnv(process.env);

const tempDirs = [];

function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, env: BASE_ENV, encoding: 'utf8' }).trim();
}

function commitFile(repo, path, content, message) {
    mkdirSync(join(repo, dirname(path)), { recursive: true });
    writeFileSync(join(repo, path), content);
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', message);
    return git(repo, 'rev-parse', 'HEAD');
}

/** main 有一個 source 檔同一個文件；`origin/main` 指住 main；停喺新 branch `feature` */
function createRepo() {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'detect-code-changes-')));
    tempDirs.push(repo);
    git(repo, 'init', '-q', '-b', 'main');
    commitFile(repo, 'src/a.ts', 'export const a = 1;\n', 'base: source');
    commitFile(repo, '.proj-docs/guide.md', '# guide\n', 'base: docs');
    git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(repo, 'checkout', '-q', '-b', 'feature');
    return repo;
}

/** 跑 script；回 exit status、stdout / stderr、同寫入 GITHUB_OUTPUT 嘅內容 */
function detect(repo, sha, extraEnv = {}) {
    const outputFile = join(repo, '.git', 'github-output.txt');
    writeFileSync(outputFile, '');
    const result = spawnSync('bash', [SCRIPT], {
        cwd: repo,
        env: { ...BASE_ENV, GITHUB_SHA: sha, GITHUB_OUTPUT: outputFile, ...extraEnv },
        encoding: 'utf8',
    });
    return { ...result, output: readFileSync(outputFile, 'utf8') };
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** 喺 feature branch 逐個 commit 呢啲檔，回最後嘅 SHA */
function commitAll(repo, paths) {
    return paths.map((path) => commitFile(repo, path, `${path}\n`, `add ${path}`)).at(-1);
}

describe('detect-code-changes', () => {
    it('should not pass inherited GIT_* or GITHUB_* variables to the temp-repo calls', () => {
        const env = isolatedEnv({
            PATH: '/usr/bin',
            GIT_DIR: '/real/repo/.git',
            GITHUB_SHA: 'real-sha',
            GITHUB_OUTPUT: '/real/output',
        });

        expect(env).toEqual({ PATH: '/usr/bin', ...TEST_GIT_ENV });
    });

    it('should report code=false when the whole branch only touches unchecked docs paths', () => {
        const repo = createRepo();
        const head = commitAll(repo, [
            '.proj-docs/specs/spec.md',
            '_mockups_/admin/index.html',
            '_mockups_/admin/src/build.py',
            '_design_/HANDOFF.md',
            'LICENSE',
        ]);

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=false\n');
    });

    it('should report code=false when docs files have non-ASCII names and spaces', () => {
        const repo = createRepo();
        const head = commitAll(repo, ['.proj-docs/審查 報告/第 1 版.md', '_design_/設計 稿.png']);

        const result = detect(repo, head);

        expect(result.output).toBe('code=false\n');
    });

    // 呢啲檔有 CI 檢查（prettier / eslint / tsc / vitest）會驗：淨改佢哋都要跑
    it.each([
        'README.md',
        '.claude/CLAUDE.md',
        'apps/player/src/notes.md',
        'docs/guide.md',
        'LICENSE-check.ts',
        'packages/catalog/src/index.ts',
        '.github/workflows/ci.yml',
        'package.json',
        'src/工具 a.ts',
    ])('should report code=true when the branch touches %s', (path) => {
        const repo = createRepo();
        commitFile(repo, '.proj-docs/guide.md', '# guide v2\n', 'docs');
        const head = commitFile(repo, path, 'content\n', `touch ${path}`);

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a docs-only push follows a code push on the same branch', () => {
        const repo = createRepo();
        commitFile(repo, 'src/a.ts', 'export const a = 2;\n', 'code push');
        const docsPush = commitFile(repo, '.proj-docs/guide.md', '# guide v2\n', 'docs push');

        const result = detect(repo, docsPush);

        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a path still needs quoting (tab in a docs file name)', () => {
        const repo = createRepo();
        const head = commitFile(repo, '.proj-docs/a\tb.md', '# tab\n', 'docs file with a tab');

        const result = detect(repo, head);

        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a source file is renamed into a docs path', () => {
        const repo = createRepo();
        git(repo, 'mv', 'src/a.ts', '.proj-docs/a.md');
        git(repo, 'commit', '-q', '-m', 'rename source into docs');

        const result = detect(repo, git(repo, 'rev-parse', 'HEAD'));

        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when a source file is deleted', () => {
        const repo = createRepo();
        git(repo, 'rm', '-q', 'src/a.ts');
        git(repo, 'commit', '-q', '-m', 'delete source');

        const result = detect(repo, git(repo, 'rev-parse', 'HEAD'));

        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true when the branch has no merge-base with origin/main', () => {
        const repo = createRepo();
        git(repo, 'checkout', '-q', '--orphan', 'unrelated');
        git(repo, 'rm', '-rq', '--cached', '.');
        const head = commitFile(repo, '.proj-docs/only.md', '# unrelated history\n', 'orphan docs');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
        expect(result.stdout).toContain('base=none');
    });

    // 呢個 repo 而家嘅情況：未有 main
    it('should report code=true when origin/main does not exist', () => {
        const repo = createRepo();
        const head = commitFile(repo, '.proj-docs/guide.md', '# guide v2\n', 'docs');
        git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');

        const result = detect(repo, head);

        expect(result.status).toBe(0);
        expect(result.output).toBe('code=true\n');
    });

    it('should report code=true for a push to main itself (merge-base equals the SHA, empty diff)', () => {
        const repo = createRepo();

        const result = detect(repo, git(repo, 'rev-parse', 'origin/main'));

        expect(result.output).toBe('code=true\n');
    });

    it('should classify against the merge-base, not the main tip, when main moved on with code', () => {
        const repo = createRepo();
        const head = commitFile(repo, '.proj-docs/guide.md', '# guide v2\n', 'docs on branch');
        git(repo, 'checkout', '-q', 'main');
        commitFile(repo, 'src/a.ts', 'export const a = 3;\n', 'main moves on');
        git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

        const result = detect(repo, head);

        expect(result.output).toBe('code=false\n');
    });

    it('should exit 2 without writing an output when GITHUB_SHA is missing', () => {
        const repo = createRepo();

        const result = detect(repo, '');

        expect(result.status).toBe(EXIT_USAGE_ERROR);
        expect(result.output).toBe('');
    });
});
