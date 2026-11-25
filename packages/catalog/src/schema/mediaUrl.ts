/**
 * 媒體檔網址：`base` + R2 key，每段路徑各自 `encodeURIComponent`（檔名有中文、空格、`#`、`?`）。
 * `base` 要以 `/` 結尾（catalog validator 已保證）。
 */
export const mediaUrl = (base: string, key: string): string =>
    base + key.split('/').map(encodeURIComponent).join('/');
