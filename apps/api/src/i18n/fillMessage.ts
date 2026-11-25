/* 語言檔句子嘅參數：`{name}` 換做 params[name]；冇對應參數嘅佔位保持原樣（測試見得到） */
const PLACEHOLDER = /\{(\w+)\}/g;

export type MessageParams = Readonly<Record<string, string | number>>;

export const fillMessage = (template: string, params: MessageParams = {}): string =>
    template.replace(PLACEHOLDER, (placeholder, name: string) =>
        Object.hasOwn(params, name) ? String(params[name]) : placeholder,
    );
