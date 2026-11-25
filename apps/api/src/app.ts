/* Hono 共用型別：bindings + middleware 放入 context 嘅值 */
import type { Env } from './env';

export interface AppEnv {
    Bindings: Env;
    Variables: {
        /** requireSession 驗過嘅 admin email */
        email: string;
        /** 呢個寫入唔改 catalog 內容：afterWrite 唔行後置步驟（skipPostWrite 設；backlog B-043 ③） */
        skipPostWrite: boolean;
    };
}
