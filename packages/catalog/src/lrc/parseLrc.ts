/*
 * LRC 歌詞 parser（全 project 只有呢一份）：歌曲文字（`song-text/`）嘅同步歌詞交畀佢；轉歌詞 JSON 都喺度。
 * 時間戳：`[mm:ss]`、`[mm:ss.x]`、`[mm:ss.xx]`、`[mm:ss.xxx]`；一行可以有幾個；`[offset:±毫秒]` 會套用。
 * Metadata（`[ti:…]`、`[ar:…]` 等）要獨立一行先會被忽略；其他以 `[` 開頭而讀唔到時間戳嘅行一律報錯。
 */
export interface LyricLine {
    /** 毫秒 */
    t: number;
    /** 空白 = 間奏（播放端唔 highlight 任何一行） */
    text: string;
}

export type LrcErrorCode = 'EMPTY' | 'NO_TIMESTAMP' | 'INVALID_TIMESTAMP' | 'INVALID_OFFSET';

export interface LrcError {
    /** 第幾行（由 1 開始）；`EMPTY` 係 0 */
    line: number;
    code: LrcErrorCode;
    /** 出錯嗰行嘅原文（已 trim） */
    text: string;
}

export interface LrcResult {
    lines: LyricLine[];
    errors: LrcError[];
}

/** 純文字歌詞嘅一行（Functional Spec D32）：冇時間；空白 = 分段 */
export interface PlainLyricLine {
    text: string;
}

/** 歌詞檔（`/catalog/v1/lyrics/<hash>.json`）內容：`synced` = 有冇時間標記（播放端只喺同步歌詞跟歌行） */
export type LyricsJson =
    { synced: true; lines: LyricLine[] } | { synced: false; lines: PlainLyricLine[] };

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const FRACTION_DIGITS = 3;

/** 行頭嘅一個 `[…]` */
const LEADING_TAG = /^\[([^\]]*)\]/;
/** 分鐘 2–3 位（一首歌唔會長過 999 分鐘），秒 2 位，小數 1–3 位 */
const TIMESTAMP = /^(\d{2,3}):(\d{2})(?:\.(\d{1,3}))?$/;
/** 只有數字、冒號同點但格式錯（例如 `1:2`、`00:60.00`）：當錯誤，唔當 metadata（metadata 係 `字母:內容`） */
const TIMESTAMP_LIKE = /^[\d:.]+$/;
/**
 * Metadata（ID tag）：成行只有一個 `[key:value]`。key 係純英文字母或者 `#`（ti、ar、by、length…），
 * 所以有數字嘅 key（`[O0:16.80]`：時間戳打錯字）唔算；value 可以有方括號（`[ti:發現號 [Live]]`）。
 */
const METADATA_LINE = /^\[(?:[A-Za-z]+|#):.*\]$/;
const OFFSET_TAG = /^offset:(.*)$/i;
/** offset 係微調：最多 7 位毫秒（約 2.7 小時），再大當係打錯 */
const OFFSET_VALUE = /^[+-]?\d{1,7}$/;

/** `mm:ss.xxx` → 毫秒；格式或者範圍錯就 null */
const timestampToMs = (tag: string): number | null => {
    const match = TIMESTAMP.exec(tag);
    if (!match) return null;
    const [, minutes = '', seconds = '', fraction = ''] = match;
    if (Number(seconds) >= SECONDS_PER_MINUTE) return null;
    const ms = Number(fraction.padEnd(FRACTION_DIGITS, '0'));
    return (Number(minutes) * SECONDS_PER_MINUTE + Number(seconds)) * MS_PER_SECOND + ms;
};

type ParsedLine =
    | { kind: 'blank' | 'metadata' }
    | { kind: 'offset'; ms: number }
    | { kind: 'lyric'; times: number[]; text: string }
    | { kind: 'error'; code: LrcErrorCode };

/** 讀晒行頭嘅時間戳；遇到唔係時間戳嘅 tag 就停 */
const readTimestamps = (source: string): { times: (number | null)[]; rest: string } => {
    const times: (number | null)[] = [];
    let rest = source;
    for (let tag = LEADING_TAG.exec(rest); tag; tag = LEADING_TAG.exec(rest)) {
        const inner = tag[1] ?? '';
        const ms = timestampToMs(inner);
        if (ms === null && !TIMESTAMP_LIKE.test(inner)) break;
        times.push(ms);
        rest = rest.slice(tag[0].length).trimStart(); // 時間戳之間可以有空格
    }
    return { times, rest };
};

/**
 * 冇讀到時間戳嘅行。以 `[` 開頭但唔係獨立一行 metadata（例如 `[00:1O.00]歌詞`、`[Chorus]副歌`）
 * 當係打錯嘅時間戳報錯：唔可以冇聲冇氣咁掉咗一句歌詞（US-106：錯誤逐行指出）。
 */
const parseUntimedLine = (source: string): ParsedLine => {
    if (METADATA_LINE.test(source)) return { kind: 'metadata' };
    return { kind: 'error', code: LEADING_TAG.test(source) ? 'INVALID_TIMESTAMP' : 'NO_TIMESTAMP' };
};

/** 呢行（trim 之後）係咪以時間標記開頭；格式錯嘅時間標記（`[00:60.00]`）都算，metadata 唔算 */
export const startsWithTimestamp = (source: string): boolean =>
    readTimestamps(source.trim()).times.length > 0;

const parseLine = (source: string): ParsedLine => {
    if (source === '') return { kind: 'blank' };
    const offset = OFFSET_TAG.exec(LEADING_TAG.exec(source)?.[1] ?? '');
    if (offset) {
        const value = (offset[1] ?? '').trim();
        return OFFSET_VALUE.test(value)
            ? { kind: 'offset', ms: Number(value) }
            : { kind: 'error', code: 'INVALID_OFFSET' };
    }
    const { times, rest } = readTimestamps(source);
    if (times.length === 0) return parseUntimedLine(source);
    const valid = times.filter((ms): ms is number => ms !== null);
    if (valid.length !== times.length) return { kind: 'error', code: 'INVALID_TIMESTAMP' };
    return { kind: 'lyric', times: valid, text: rest.trim() };
};

/** LRC 慣例：offset 正數 = 歌詞早啲出。結果唔會細過 0 */
const applyOffset = (lines: LyricLine[], offsetMs: number): LyricLine[] =>
    lines.map((line) => ({ ...line, t: Math.max(0, line.t - offsetMs) }));

/**
 * 逐行解析 LRC。錯嘅行唔入 `lines`，喺 `errors` 列出（管理端逐行標示）；
 * 冇任何歌詞行 → 一個 `EMPTY` 錯誤。輸出按時間排序，同一時間保持原文次序。
 */
export const parseLrc = (source: string): LrcResult => {
    const lines: LyricLine[] = [];
    const errors: LrcError[] = [];
    let offsetMs = 0;
    source.split(/\r?\n/).forEach((raw, index) => {
        const text = raw.trim();
        const parsed = parseLine(text);
        if (parsed.kind === 'offset') offsetMs = parsed.ms;
        if (parsed.kind === 'error') errors.push({ line: index + 1, code: parsed.code, text });
        if (parsed.kind === 'lyric')
            parsed.times.forEach((t) => lines.push({ t, text: parsed.text }));
    });
    if (lines.length === 0 && errors.length === 0)
        errors.push({ line: 0, code: 'EMPTY', text: '' });
    // 先排序後套 offset：壓到 0 嘅行仍然跟原本時間先後。sort 係 stable：同一時間保持原文次序
    lines.sort((a, b) => a.t - b.t);
    return { lines: applyOffset(lines, offsetMs), errors };
};

/** 歌詞檔內容：只抄已知欄位（同步：`t`、`text`；純文字：`text`） */
export const toLyricsJson = (lyrics: LyricsJson): LyricsJson =>
    lyrics.synced
        ? { synced: true, lines: lyrics.lines.map(({ t, text }) => ({ t, text })) }
        : { synced: false, lines: lyrics.lines.map(({ text }) => ({ text })) };
