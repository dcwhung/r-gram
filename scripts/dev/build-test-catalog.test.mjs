/*
 * T-113：臨時測試 catalog（apps/player/public/test-catalog/catalog.json）。
 * 已 commit 嘅檔一定等於 script 而家生成嘅結果（唔可以人手改、唔會過時），而且播放端嘅 parser 讀得到。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as catalog from '../../packages/catalog/src/index.ts';
import {
    buildTestCatalog,
    GENERATED_AT,
    OUTPUT_PATH,
    parseArgs,
    readInputs,
    serialize,
    validate,
} from './build-test-catalog.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./build-test-catalog.mjs', import.meta.url));
const EXPECTED_ALBUMS = 21;
const EXPECTED_TRACKS = 291;
/** 成個 script（Vite 載入 packages/catalog）要幾秒 */
const CLI_TIMEOUT_MS = 60_000;

const inputs = readInputs(REPO_ROOT);
const generated = buildTestCatalog(catalog, inputs, { audio: 'all' });
const committed = readFileSync(join(REPO_ROOT, OUTPUT_PATH), 'utf8');
const tracksOf = (document) => document.albums.flatMap((album) => album.tracks);

describe('test catalog: committed file', () => {
    it('should equal what the script generates now', () => {
        expect(committed).toBe(serialize(generated));
    });

    it('should parse with the parser the player uses', () => {
        const parsed = catalog.parseCatalogDocument(JSON.parse(committed));
        expect(parsed.ok).toBe(true);
    });

    it('should carry all 21 releases and every track of the seed', () => {
        const document = JSON.parse(committed);
        expect(document.albums).toHaveLength(EXPECTED_ALBUMS);
        expect(tracksOf(document)).toHaveLength(EXPECTED_TRACKS);
    });
});

describe('buildTestCatalog', () => {
    it('should keep the product order, categories, numbers and years of the seed', () => {
        const folders = generated.albums.map((album) =>
            catalog.expectedFolder(album.category, album.categoryNo, album.id),
        );
        expect(folders[0]).toBe('album-01-apollo-18');
        expect(folders.at(-1)).toBe('single-02-joeng-sai-gaai-dou-dung');
        expect(generated.albums[0]).toMatchObject({ year: 2008, wheelKey: 'A' });
    });

    it('should use a fixed generatedAt and the media base of wrangler.toml', () => {
        expect(generated.generatedAt).toBe(GENERATED_AT);
        expect(generated.mediaBase).toMatch(/^https:\/\/pub-[0-9a-f]+\.r2\.dev\/$/);
    });

    it('should give every track an audio key under the folder rule (--audio=all)', () => {
        expect(tracksOf(generated).every((track) => track.audio !== null)).toBe(true);
        expect(generated.albums[0]?.tracks[0]?.audio).toBe('album-01-apollo-18/01 一早地下鐵.m4a');
    });

    it('should drop characters a file name cannot have from the audio key', () => {
        const keys = tracksOf(generated).map((track) => track.audio);
        expect(keys.every((key) => key.split('/').length === 2 && !/[?#]/.test(key))).toBe(true);
    });

    it('should leave covers out so the player draws its placeholder disc', () => {
        expect(generated.albums.every((album) => album.cover === null)).toBe(true);
        expect(generated.albums.every((album) => album.thumb === null)).toBe(true);
    });

    it('should mark no track as having audio with --audio=none', () => {
        const silent = buildTestCatalog(catalog, inputs, { audio: 'none' });
        expect(tracksOf(silent).every((track) => track.audio === null)).toBe(true);
    });
});

describe('validate', () => {
    it('should throw with the parser errors when the document does not parse', () => {
        expect(() => validate(catalog, { ...generated, mediaBase: 'http://x/' })).toThrow(
            /mediaBase/,
        );
    });

    it('should return the document when it parses', () => {
        expect(validate(catalog, generated)).toBe(generated);
    });
});

describe('parseArgs', () => {
    it('should default to every track having audio and the committed path', () => {
        expect(parseArgs([])).toEqual({ audio: 'all', out: OUTPUT_PATH });
    });

    it('should read --audio and --out', () => {
        expect(parseArgs(['--audio=none', '--out=x.json'])).toEqual({
            audio: 'none',
            out: 'x.json',
        });
    });

    it.each([['--audio=some'], ['--colour=red']])('should reject %s', (arg) => {
        expect(() => parseArgs([arg])).toThrow();
    });
});

describe('build-test-catalog CLI', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'r-gram-test-catalog-'));
    afterAll(() => rmSync(outDir, { recursive: true, force: true }));

    it(
        'should write the same file as the committed one',
        () => {
            const out = join(outDir, 'catalog.json');
            execFileSync(process.execPath, [SCRIPT, `--out=${out}`], { cwd: REPO_ROOT });
            expect(readFileSync(out, 'utf8')).toBe(committed);
        },
        CLI_TIMEOUT_MS,
    );
});
