/* 管理端介面文字：`t(key, params)`，key 同參數名打錯 = 編譯錯（同播放端 src/i18n/t.ts 一樣嘅做法） */
import { zhHant } from './zh-Hant';

type Messages = typeof zhHant;

type LeafKeys<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafKeys<Messages>;

type MessageAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
        ? MessageAt<T[Head], Rest>
        : never
    : K extends keyof T
      ? T[K]
      : never;

type ParamNames<S> = S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamValue = string | number;
type ParamArgs<K extends MessageKey> = [ParamNames<MessageAt<Messages, K>>] extends [never]
    ? []
    : [params: Record<ParamNames<MessageAt<Messages, K>>, ParamValue>];

const PARAM_PATTERN = /\{(\w+)\}/g;

const lookup = (key: MessageKey): string =>
    key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], zhHant) as string;

/** 攞介面文字；runtime 遇到冇畀嘅參數會原樣保留佔位符 */
export const t = <K extends MessageKey>(key: K, ...[params]: ParamArgs<K>): string => {
    const values: Record<string, ParamValue> = params ?? {};
    return lookup(key).replace(PARAM_PATTERN, (placeholder, name: string) =>
        Object.hasOwn(values, name) ? String(values[name]) : placeholder,
    );
};
