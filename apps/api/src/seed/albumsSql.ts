/*
 * Production 嘅初始資料（review W-034 定案）：由 discography.json 生成 seed/albums.sql（入 repo），
 * 由人用 `wrangler d1 execute r-gram --remote --file seed/albums.sql` 行一次；seed CLI（scripts/seed.mjs）只做本機。
 * 揀專輯用同本機 seed 一樣嘅 planAlbumSeed()；每句同 seedAlbums.ts 一樣：id 已有唔郁（ON CONFLICT DO NOTHING）、
 * 同類別序號有人用唔寫（NOT EXISTS），所以重跑冇害、唔蓋走管理端改過嘅專輯。
 * SQL 檔冇 parameter：值全部轉做 SQL literal（文字單引號加倍；有 NUL 或者唔係整數就 throw，唔寫一個靠唔住嘅檔）。
 * 輸出只由輸入決定（時間由 D1 行嗰陣用 strftime 填），所以入 repo 嘅檔可以同重新生成逐字比較
 */
import { NEUTRAL_ACCENT, planAlbumSeed, type SeedAlbum } from '@r-gram/catalog';

/** 同 seedAlbums.ts 嘅 INSERT 一樣嘅欄（created_at、updated_at 最後兩欄） */
export const SEED_ALBUM_COLUMNS =
    'id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at';

/** D1 行嗰陣嘅時間，同 `Date#toISOString()` 一樣嘅格式；同一句入面兩次都係同一個值 */
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const NUL = '\u0000';
const QUOTE = "'";

type SqlValue = string | number | null;

const sqlLiteral = (value: SqlValue): string => {
    if (value === null) return 'NULL';
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) throw new RangeError('seed value is not an integer');
        return String(value);
    }
    if (value.includes(NUL)) throw new RangeError('seed text contains NUL');
    return `${QUOTE}${value.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`;
};

const statementOf = (album: SeedAlbum): string => {
    const { id, title, wheelKey, year, category, categoryNo, label, order } = album;
    const values = [id, title, wheelKey, year, category, categoryNo, label, NEUTRAL_ACCENT, order];
    return [
        `INSERT INTO albums (${SEED_ALBUM_COLUMNS})`,
        `SELECT ${values.map(sqlLiteral).join(', ')}, ${NOW_SQL}, ${NOW_SQL}`,
        `WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = ${sqlLiteral(category)} AND category_no = ${sqlLiteral(categoryNo)})`,
        'ON CONFLICT (id) DO NOTHING;',
    ].join('\n');
};

/** 每張要新增嘅專輯一句（次序跟 discography.json） */
export const albumSeedStatements = (albums: readonly SeedAlbum[]): string[] =>
    planAlbumSeed(albums, []).insert.map(statementOf);

const HEADER = [
    '-- R Gram 初始資料（只有專輯）：production D1 用。由 seed/discography.json 生成，唔好人手改：',
    '--   npm run seed:sql -w apps/api',
    '-- 只可以由人喺 apps/api 行一次（agent 同 CI 一律唔行）：',
    '--   npx wrangler d1 execute r-gram --remote --file seed/albums.sql',
    '-- 重跑冇害：已有嘅 id 唔郁，同類別序號有人用就跳過。',
    '-- 行完之後一定要重新生成 catalog：登入管理端後叫 POST /api/catalog/rebuild（API-061）。',
    '-- 本機開發用 npm run seed -w apps/api（只寫本機資料）。',
];

/** 成個 seed/albums.sql（結尾有換行） */
export const albumsSqlFile = (albums: readonly SeedAlbum[]): string =>
    `${[...HEADER, '', albumSeedStatements(albums).join('\n\n')].join('\n')}\n`;
