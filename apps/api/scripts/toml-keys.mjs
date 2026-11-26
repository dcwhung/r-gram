/*
 * wrangler.toml 入面用過嘅全部 key 名（S-234）：表頭 `[a.b]`／`[[a.b]]`、`key = value`（連 dotted key）、
 * inline table `{ k = v }` 入面嘅 key。key 可以係 bare、`"…"`（連 \uXXXX escape）或者 `'…'`。
 * 註解同字串值入面嘅字唔算。只係部署前檢查用：唔處理多行字串（wrangler.toml 冇用）
 */
const KEY_SEGMENT = /[ \t]*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([A-Za-z0-9_-]+))[ \t]*/y;
const STRING_START = /["']/;
const HEX_RADIX = 16;

const unescapeBasic = (raw) => {
    try {
        return JSON.parse(
            `"${raw.replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(parseInt(hex, HEX_RADIX)))}"`,
        );
    } catch {
        return raw;
    }
};

/** 由 `start` 讀一條 key 路徑（a."b".c）；讀唔到 = 空 */
const readKeyPath = (text, start) => {
    const segments = [];
    let pos = start;
    for (;;) {
        KEY_SEGMENT.lastIndex = pos;
        const match = KEY_SEGMENT.exec(text);
        if (!match) break;
        segments.push(match[1] !== undefined ? unescapeBasic(match[1]) : (match[2] ?? match[3]));
        pos = KEY_SEGMENT.lastIndex;
        if (text[pos] !== '.') break;
        pos += 1;
    }
    return { segments, end: pos };
};

/** 字串（引號開始）嘅結尾位置 */
const skipString = (text, start) => {
    const quote = text[start];
    let pos = start + 1;
    while (pos < text.length && text[pos] !== quote)
        pos += quote === '"' && text[pos] === '\\' ? 2 : 1;
    return pos + 1;
};

/** `key =`：成立就回 key 名 */
const assignedKeys = (text, start) => {
    const { segments, end } = readKeyPath(text, start);
    return segments.length > 0 && text[end] === '=' ? segments : [];
};

/** 值入面 inline table 嘅 key（`{` 或者 `,` 之後、喺大括號入面） */
const inlineKeys = (text, start) => {
    const keys = [];
    let depth = 0;
    for (let pos = start; pos < text.length;) {
        const char = text[pos];
        if (STRING_START.test(char)) pos = skipString(text, pos);
        else if (char === '#') break;
        else {
            if (char === '{') depth += 1;
            if (char === '}') depth -= 1;
            if (depth > 0 && (char === '{' || char === ','))
                keys.push(...assignedKeys(text, pos + 1));
            pos += 1;
        }
    }
    return keys;
};

const lineKeys = (line) => {
    const text = line.trim();
    if (text === '' || text.startsWith('#')) return [];
    if (text.startsWith('[')) return readKeyPath(text, text.startsWith('[[') ? 2 : 1).segments;
    const { segments, end } = readKeyPath(text, 0);
    if (segments.length === 0 || text[end] !== '=') return [];
    return [...segments, ...inlineKeys(text, end + 1)];
};

export const tomlKeyNames = (toml) => new Set(toml.split(/\r?\n/).flatMap(lineKeys));
