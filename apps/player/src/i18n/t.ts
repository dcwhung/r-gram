import { zhHant } from './zh-Hant';

type Messages = typeof zhHant;

/** 將巢狀字典展平成 `favourites.title` 呢類 key；key 打錯 = 編譯錯 */
type LeafKeys<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafKeys<Messages>;
export type MessageParams = Record<string, string | number>;

const PARAM_PATTERN = /\{(\w+)\}/g;

const lookup = (key: MessageKey): string =>
    key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], zhHant) as string;

/** 攞介面文字；`{名}` 由 params 填，冇畀嘅參數原樣保留（方便喺畫面上見到漏咗） */
export const t = (key: MessageKey, params: MessageParams = {}): string =>
    lookup(key).replace(PARAM_PATTERN, (placeholder, name: string) =>
        Object.hasOwn(params, name) ? String(params[name]) : placeholder,
    );
