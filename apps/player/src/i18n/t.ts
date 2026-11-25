import { zhHant } from './zh-Hant';

type Messages = typeof zhHant;

/** 將巢狀字典展平成 `favourites.title` 呢類 key；key 打錯 = 編譯錯 */
type LeafKeys<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafKeys<Messages>;
/** `a.b.c` → 字典入面嗰句（字面型別） */
type MessageAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
        ? MessageAt<T[Head], Rest>
        : never
    : K extends keyof T
      ? T[K]
      : never;

/** 一句入面所有 `{名}` */
type ParamNames<S> = S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamValue = string | number;
/** 呢個 key 要嘅參數：冇 `{名}` 就唔收第二個參數；有就一定要畀齊，名打錯 = 編譯錯 */
type ParamArgs<K extends MessageKey> = [ParamNames<MessageAt<Messages, K>>] extends [never]
    ? []
    : [params: Record<ParamNames<MessageAt<Messages, K>>, ParamValue>];

const PARAM_PATTERN = /\{(\w+)\}/g;

const lookup = (key: MessageKey): string =>
    key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], zhHant) as string;

/** 攞介面文字；`{名}` 由 params 填。型別已保證參數齊；runtime 遇到冇畀嘅參數會原樣保留佔位符 */
export const t = <K extends MessageKey>(key: K, ...[params]: ParamArgs<K>): string => {
    const values: Record<string, ParamValue> = params ?? {};
    return lookup(key).replace(PARAM_PATTERN, (placeholder, name: string) =>
        Object.hasOwn(values, name) ? String(values[name]) : placeholder,
    );
};
