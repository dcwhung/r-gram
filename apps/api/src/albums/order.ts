/* API-015 body：`{ ids: string[] }`，唔可以重覆；唔啱 → undefined（400 INVALID_LIST） */
import type { JsonObject } from '../lib/http';

export const readOrder = (body: JsonObject | undefined): string[] | undefined => {
    const ids = body?.ids;
    if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === 'string')) {
        return undefined;
    }
    return new Set(ids).size === ids.length ? ids : undefined;
};
