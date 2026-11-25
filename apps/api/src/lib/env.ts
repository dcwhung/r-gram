/* vars 讀取：逗號分隔 list（ADMIN_EMAILS、PLAYER_ORIGINS） */
export const csvList = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
