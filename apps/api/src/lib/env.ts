/* vars 讀取：逗號分隔 list（ADMIN_EMAILS、PLAYER_ORIGINS）同管理員白名單 */
export const csvList = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

/** email 唔分大小寫、唔計前後空白；白名單同 session 都用呢個寫法 */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/** 可見 ASCII（冇空格、冇控制字元）。白名單同登入地址都要係呢個範圍 */
const ASCII_ADDRESS = /^[\x21-\x7e]+$/u;
export const isAsciiAddress = (email: string): boolean => ASCII_ADDRESS.test(email);

/**
 * 成個地址一樣先算（兩邊都 normalise）；空地址 / 空白名單一定唔中（csvList 已經濾走空項）。
 * 非 ASCII 地址一律唔中：`toLowerCase()` 會將某啲 Unicode 字（例如 U+212A Kelvin 符號）摺做 ASCII 字母，
 * 令一個唔喺白名單嘅地址比較時變成相等。
 */
export const isAdminEmail = (adminEmails: string, email: string): boolean => {
    const address = email.trim();
    if (!isAsciiAddress(address)) return false;
    return csvList(adminEmails).map(normaliseEmail).includes(normaliseEmail(address));
};
