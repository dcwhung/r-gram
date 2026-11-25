/* vars 讀取：逗號分隔 list（ADMIN_EMAILS、PLAYER_ORIGINS）同管理員白名單 */
export const csvList = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

/** email 唔分大小寫、唔計前後空白；白名單同 session 都用呢個寫法 */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/** 成個地址一樣先算（兩邊都 normalise）；空地址 / 空白名單一定唔中（csvList 已經濾走空項） */
export const isAdminEmail = (adminEmails: string, email: string): boolean =>
    csvList(adminEmails).map(normaliseEmail).includes(normaliseEmail(email));
