/*
 * T-113：臨時測試 catalog。由參考資料（apps/api/seed/discography.json、credits.json）砌一份靜態 catalog 文件，
 * 寫去 apps/player/public/test-catalog/catalog.json，等未有 Backend 都可以喺真機試播放端。唔係正式內容；
 * 第一次正式部署（T-041）之前要刪走。
 *
 *   node scripts/dev/build-test-catalog.mjs [--audio=all|none] [--out=<path>]（--out 相對 repo 根）
 *
 * - 砌法：packages/catalog 嘅 seedToCatalog()（同播放端開發 fixture 一樣），寫入前用 parseCatalogDocument() 驗證
 * - --audio=all（預設）：每首歌都當有音檔，key 跟資料夾規則 `<類別>-<NN>-<id>/<NN> <歌名>.m4a`；
 *   大部分檔暫時未存在（真播放 T-038 已做：檔唔存在嘅歌會顯示「未能播放」）。--audio=none：全部灰色行
 * - 封面、歌詞：冇（null），播放端畫佔位碟；專輯色係中性灰（正式由封面計）
 * - 輸出固定（generatedAt 寫死、次序跟 seed）：seed 或者 script 改咗先會變
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const OUTPUT_PATH = 'apps/player/public/test-catalog/catalog.json';
export const GENERATED_AT = '2026-11-26T00:00:00.000Z';
const AUDIO_MODES = ['all', 'none'];
const AUDIO_EXTENSION = '.m4a';
const JSON_INDENT = 4;
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CATALOG_ENTRY = join(REPO_ROOT, 'packages/catalog/src/index.ts');

/** `--audio=all|none`、`--out=<path>`；其他參數一律報錯 */
export const parseArgs = (argv) => {
    const options = { audio: 'all', out: OUTPUT_PATH };
    for (const arg of argv) {
        const [, name, value] = /^--(audio|out)=(.+)$/.exec(arg) ?? [];
        if (!name) throw new Error(`Unknown argument: ${arg}`);
        options[name] = value;
    }
    if (!AUDIO_MODES.includes(options.audio)) {
        throw new Error(`--audio must be one of: ${AUDIO_MODES.join(', ')}`);
    }
    return options;
};

/** wrangler.toml 入面 `NAME = "value"` 嘅值（同 Worker 嘅 catalogBases() 用同一啲設定） */
const wranglerVar = (toml, name) => {
    const value = new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, 'm').exec(toml)?.[1];
    if (!value) throw new Error(`${name} not found in apps/api/wrangler.toml`);
    return value;
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

export const readInputs = (root) => ({
    discography: readJson(join(root, 'apps/api/seed/discography.json')),
    credits: readJson(join(root, 'apps/api/seed/credits.json')),
    wrangler: readFileSync(join(root, 'apps/api/wrangler.toml'), 'utf8'),
});

/** 資料夾規則下音檔嘅 key：檔名同新歌曲文字檔一樣（去走檔名唔可以有嘅字），換副檔名 */
const audioKeyFor = (catalog, album, track) => {
    const folder = catalog.expectedFolder(album.category, album.categoryNo, album.id);
    const name = catalog.songTextFileName(track.no, track.title).replace(/\.txt$/, AUDIO_EXTENSION);
    return `${folder}/${name}`;
};

const mediaForAll = (catalog, discography) => {
    const albums = new Map(discography.albums.map((album) => [album.id, album]));
    return (albumId, track) => ({
        audio: audioKeyFor(catalog, albums.get(albumId), track),
        mv: null,
    });
};

/** `catalog` = @r-gram/catalog（由呼叫者載入：CLI 經 Vite，測試經 Vitest） */
export const buildTestCatalog = (catalog, { discography, credits, wrangler }, { audio }) => {
    const origin = wranglerVar(wrangler, 'WORKER_ORIGIN');
    return catalog.seedToCatalog(discography, credits, {
        generatedAt: GENERATED_AT,
        mediaBase: wranglerVar(wrangler, 'MEDIA_BASE'),
        // 封面同歌詞係 null：呢兩個 base 用唔到，照 Worker 嘅路徑寫（validator 要 https）
        imageBase: `${origin}/catalog/v1/img/`,
        lyricsBase: `${origin}/catalog/v1/lyrics/`,
        mediaFor: audio === 'all' ? mediaForAll(catalog, discography) : undefined,
    });
};

/** 驗唔過就連錯誤 path 一齊拋 */
export const validate = (catalog, document) => {
    const parsed = catalog.parseCatalogDocument(document);
    if (parsed.ok) return document;
    const errors = parsed.errors.map((error) => `${error.path}: ${error.code}`);
    throw new Error(`Generated catalog does not parse:\n${errors.join('\n')}`);
};

export const serialize = (document) => `${JSON.stringify(document, null, JSON_INDENT)}\n`;

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    // packages/catalog 係 TypeScript（import 冇副檔名）：經 Vite 載入
    const { runnerImport } = await import('vite');
    const { module: catalog } = await runnerImport(CATALOG_ENTRY);
    const document = validate(catalog, buildTestCatalog(catalog, readInputs(REPO_ROOT), options));
    const out = resolve(REPO_ROOT, options.out);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialize(document));
    const tracks = document.albums.reduce((sum, album) => sum + album.tracks.length, 0);
    console.log(`Wrote ${out}: ${document.albums.length} albums, ${tracks} tracks`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
