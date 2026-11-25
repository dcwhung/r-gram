/*
 * 生成 seed/albums.sql（review W-034：production 嘅 21 張專輯由呢個檔入，唔經 seed CLI）。
 * 用法（apps/api）：`npm run seed:sql`。只讀 seed/discography.json、寫 seed/albums.sql，唔連任何資料庫。
 * 內容由 src/seed/albumsSql.ts 決定（同本機 seed 一樣嘅 planAlbumSeed）；佢係 TypeScript，所以先用 esbuild
 * 喺記憶體 bundle 再 import。test/albumsSql.test.ts 會比較入 repo 嘅檔同重新生成嘅結果
 */
import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const here = (path) => new URL(path, import.meta.url).pathname;

const loadGenerator = async () => {
    const bundled = await build({
        entryPoints: [here('../src/seed/albumsSql.ts')],
        bundle: true,
        format: 'esm',
        platform: 'node',
        write: false,
        logLevel: 'warning',
    });
    const [output] = bundled.outputFiles;
    const source = Buffer.from(output.contents).toString('base64');
    return import(`data:text/javascript;base64,${source}`);
};

const { albumsSqlFile } = await loadGenerator();
const { albums } = JSON.parse(await readFile(here('../seed/discography.json'), 'utf8'));
await writeFile(here('../seed/albums.sql'), albumsSqlFile(albums));
console.log(`已生成 seed/albums.sql（${albums.length} 張專輯）。`);
