/* T-106：寫媒體 bucket（未實作） */
export type MediaTextTarget =
    | { kind: 'info'; folder: string; key: string }
    | { kind: 'text'; folder: string; key: string; no: number };

export const isWritableTextKey = (_target: MediaTextTarget): boolean => true;

export const normalizeText = (text: string): string => text;

export const putMediaText = async (
    _bucket: R2Bucket,
    _target: MediaTextTarget,
    _text: string,
    _etag: string | null,
): Promise<string | null> => null;
