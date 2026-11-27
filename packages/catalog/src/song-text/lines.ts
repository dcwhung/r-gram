/* 歌曲文字拆行（`parseSongText()`）：錯誤同提示嘅行號按呢度拆出嚟嘅行計 */

/** CRLF、LF、淨係 CR（舊 Mac 格式）都當換行（backlog B-042 ①） */
const LINE_BREAK = /\r\n?|\n/;
const BYTE_ORDER_MARK = /^\uFEFF/;

/** 去 BOM、拆行、每行去尾空白（空白行變成 `''`） */
export const songLines = (text: string): string[] =>
    text
        .replace(BYTE_ORDER_MARK, '')
        .split(LINE_BREAK)
        .map((line) => line.trimEnd());
