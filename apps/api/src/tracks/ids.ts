/* 管理端新增嘅歌 id（Technical Spec「數據庫設計 → tracks」）：`<albumId>-<6 位隨機細楷英數>` */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const TRACK_ID_SUFFIX_CHARS = 6;

/** crypto.getRandomValues（CSPRNG）；取模有少少偏差，對 id 冇影響（撞咗會重試） */
export const newTrackId = (albumId: string): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(TRACK_ID_SUFFIX_CHARS));
    const suffix = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('');
    return `${albumId}-${suffix}`;
};
