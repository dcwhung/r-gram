/*
 * API-032 GET /api/media?prefix=（T-025）：媒體 bucket 一層（子資料夾 + 檔），管理端手動指定音檔 / MV 時揀檔用
 *（指定本身經 API-021，儲存前 head；套用後即時生效）。`prefix` = 空（最上層）或者 `/` 結尾嘅資料夾路徑；
 * 唔可以 `/` 開頭、唔可以有 `..`；`_` 開頭嘅資料夾（例如 `_fonts/`）唔係專輯：唔列，第一層亦唔可以開（CR-004）。
 * `truncated` = 讀到 list 頁數上限，列表唔齊（S-136）
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { scanValidationError } from './errors';
import { DELIMITER, listLevel } from './listing';

export const mediaRoutes = new Hono<AppEnv>();

const PREFIX_QUERY = 'prefix';
const RESERVED_START = '_';
const PARENT_SEGMENT = '..';

const isValidPrefix = (prefix: string): boolean =>
    prefix === '' ||
    (prefix.endsWith(DELIMITER) &&
        !prefix.startsWith(DELIMITER) &&
        !prefix.startsWith(RESERVED_START) &&
        !prefix.includes(PARENT_SEGMENT));

mediaRoutes.get('/', async (c) => {
    const prefix = c.req.query(PREFIX_QUERY) ?? '';
    if (!isValidPrefix(prefix))
        return scanValidationError(c, [{ path: PREFIX_QUERY, reason: 'INVALID_PREFIX' }]);
    const { files, folders, truncated } = await listLevel(c.env.MEDIA, prefix);
    const shown = folders.filter(
        (folder) => !folder.slice(prefix.length).startsWith(RESERVED_START),
    );
    return c.json({ prefix, folders: shown, files, truncated });
});
