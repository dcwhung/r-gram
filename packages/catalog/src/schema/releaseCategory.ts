/*
 * 發行類別同專輯資料夾名（Functional Spec CR-004 D43、FR-124；Technical Spec「資料夾名同發行類別」）。
 * 短名串法係建議（D43 待用戶確認）：改呢度一個表，API、seed、管理端一齊跟。中文名喺各 app 嘅語言檔。
 * 次序 = 用戶歌單檔嘅類別次序（錄音室專輯、迷你專輯、精選、現場專輯、電影原聲、單曲；D47 嘅初始次序）
 */
export const RELEASE_CATEGORIES = ['album', 'ep', 'best', 'live', 'ost', 'single'] as const;

export type ReleaseCategory = (typeof RELEASE_CATEGORIES)[number];

/** 序號最少兩位（`01`）；100 以上照出全部位數 */
const ORDINAL_MIN_DIGITS = 2;

export const isReleaseCategory = (value: unknown): value is ReleaseCategory =>
    typeof value === 'string' && (RELEASE_CATEGORIES as readonly string[]).includes(value);

/**
 * 媒體 bucket 入面專輯資料夾嘅預期名：`<類別>-<NN>-<id>`，例如 `album-01-apollo-18`。
 * 由類別、序號、id 即時計，唔另外儲存；`albums.folder` 係 NULL 時就用呢個名
 */
export const expectedFolder = (category: ReleaseCategory, categoryNo: number, id: string): string =>
    `${category}-${String(categoryNo).padStart(ORDINAL_MIN_DIGITS, '0')}-${id}`;
