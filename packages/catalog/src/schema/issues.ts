/* 驗證用嘅小工具：收集錯誤（path + code），唔拋 exception，等管理端可以一次過列晒 */
export type CatalogErrorCode =
    | 'NOT_AN_OBJECT'
    | 'UNSUPPORTED_VERSION'
    | 'INVALID_STRING'
    | 'INVALID_URL'
    | 'INVALID_DATE'
    | 'INVALID_ID'
    | 'INVALID_NUMBER'
    | 'INVALID_COLOUR'
    | 'INVALID_WHEEL_KEY'
    | 'INVALID_CATEGORY'
    | 'UNPAIRED_COVER2'
    | 'COVER2_WITHOUT_COVER'
    | 'NOT_AN_ARRAY'
    | 'DUPLICATE';

export interface CatalogError {
    /** 例如 `albums[0].tracks[2].no`；成份文件係 `$` */
    path: string;
    code: CatalogErrorCode;
}

export type Fields = Record<string, unknown>;

export const isRecord = (value: unknown): value is Fields =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim() !== '';

/** 收集器：`check(條件, path, code)`，條件唔成立就記一個錯 */
export class Issues {
    readonly errors: CatalogError[] = [];

    check(condition: boolean, path: string, code: CatalogErrorCode): boolean {
        if (!condition) this.errors.push({ path, code });
        return condition;
    }

    /** 字串；`nullable` 時容許 null；`allowEmpty` 時容許空字串 */
    text(
        value: unknown,
        path: string,
        options: { nullable?: boolean; allowEmpty?: boolean } = {},
    ): void {
        if (value === null && options.nullable) return;
        const valid = options.allowEmpty ? typeof value === 'string' : isNonEmptyString(value);
        this.check(valid, path, 'INVALID_STRING');
    }
}
