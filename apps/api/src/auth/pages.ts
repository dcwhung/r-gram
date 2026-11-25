/*
 * 登入流程入面 Worker 自己出嘅頁：「沒有權限」（403）、登入逾時（400）、Google 登入失敗（502）。
 * Design Origin: none-required（管理端 mockup 係 T-050；到時跟 mockup 換樣式）。
 * 自成一頁：樣式 inline、冇 script、冇外部資源（管理端 SPA 嘅 CSS 檔名有 hash，唔可以 link），
 * 所以可以配最嚴嘅 CSP（AUTH_PAGE_CSP）。文字全部嚟自 i18n 語言檔
 */
import { html, raw } from 'hono/html';
import { zhHant } from '../i18n/zh-Hant';

/** 只准 inline style；其他資源、form、base、frame 一律唔准 */
export const AUTH_PAGE_CSP =
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const START_PATH = '/auth/google/start';
/** 轉用其他帳戶：叫 Google 出揀帳戶畫面（唔係就會即刻用返同一個帳戶） */
const SWITCH_ACCOUNT_PATH = `${START_PATH}?select_account=1`;

/** 深色 token（跟系統） */
const DARK_TOKENS =
    '--bg: #151412; --surface: #211f1c; --ink: #f1ede4; --muted: #a8a195; --primary: #f1ede4; --on-primary: #151412;';

const PAGE_STYLE = `
:root { color-scheme: light dark; --bg: #f4f1ea; --surface: #fff; --ink: #1d1b18; --muted: #6a645b;
  --primary: #1d1b18; --on-primary: #fff; }
@media (prefers-color-scheme: dark) { :root { ${DARK_TOKENS} } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 32px 20px;
  background: var(--bg); color: var(--ink);
  font: 15px/1.55 'Noto Sans HK', 'PingFang HK', -apple-system, 'Segoe UI', sans-serif; }
main { width: min(380px, 100%); padding: 32px 28px; border-radius: 16px; background: var(--surface);
  text-align: center; display: grid; gap: 12px; justify-items: center; }
h1 { margin: 0; font-size: 22px; font-weight: 600; }
p { margin: 0; color: var(--muted); font-size: 14px; }
code { font-family: inherit; color: var(--ink); font-weight: 500; overflow-wrap: anywhere; }
a { display: inline-block; margin-top: 8px; padding: 9px 18px; border-radius: 10px;
  background: var(--primary); color: var(--on-primary); font-weight: 500; font-size: 14px;
  text-decoration: none; }
a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
`;

interface PageText {
    title: string;
    message: string;
    action: string;
}

interface PageContent {
    text: PageText;
    /** 掣去邊（同站 path） */
    actionPath: string;
    /** 顯示喺說明下面嘅資料（例如登入用嘅 email）；html`` 會 escape */
    detail?: string;
}

const pageHead = (title: string) =>
    html`<head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>${title} · ${zhHant.appName}</title>
        <style>
            ${raw(PAGE_STYLE)}
        </style>
    </head>`;

const authPage = ({ text, actionPath, detail }: PageContent) =>
    html`<!doctype html>
        <html lang="zh-Hant">
            ${pageHead(text.title)}
            <body>
                <main>
                    <h1>${text.title}</h1>
                    <p>${text.message}</p>
                    ${detail === undefined ? '' : html`<p><code>${detail}</code></p>`}
                    <a href="${actionPath}">${text.action}</a>
                </main>
            </body>
        </html>`;

/** 白名單外（或者 email 未驗證）嘅帳戶：講明用緊邊個帳戶，畀佢轉帳戶 */
export const deniedPage = (email: string) =>
    authPage({ text: zhHant.auth.denied, actionPath: SWITCH_ACCOUNT_PATH, detail: email });

export const loginExpiredPage = () =>
    authPage({ text: zhHant.auth.loginExpired, actionPath: START_PATH });

export const loginFailedPage = () =>
    authPage({ text: zhHant.auth.loginFailed, actionPath: START_PATH });
