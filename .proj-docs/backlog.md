# Backlog

Review 同 QA 留低、未有對應任務嘅項目。做完就刪走嗰行。

| # | 來源 | 項目 | 幾時做 |
| --- | --- | --- | --- |
| B-001 | Re-review T-001 / T-002（Observation） | Catalog validator 嘅 base URL 一定要 `https://`。播放端 E2E 嘅「假 catalog + 本機模擬媒體 server」唔可以用 `http://localhost`：用 Playwright 攔截 `https://` 請求，或者本機起 https | T-031、T-040 |
| B-002 | Review T-001 / T-002（Observation） | `_design_/HANDOFF.md` 仲寫 `data/…` 舊路徑；實際已搬去 `apps/api/seed/`。Functional Spec 嗰部分已喺 v1.4（CR-003）改咗 | 下次改 `_design_/` 時 |
| B-003 | Review T-001 / T-002（Observation） | 加 `vercel.json` 時一齊加 `.vercelignore`（`_mockups_/`、`_design_/`、`.proj-docs/`） | T-041 |
| B-004 | Re-review（Observation） | `generatedAt` 仍然收 `2026-02-30T…`（V8 `Date.parse` 寬鬆）。只係資訊欄，播放端唔靠佢做判斷 | 有需要先做 |
| B-005 | Review T-001 / T-002（Observation） | Catalog builder（`rebuildCatalog()`）要將 D1 入面嘅空字串轉做 `null`（validator 唔收空字串）。CR-003：冇草稿同發佈，每次寫入之後生成 | T-026 |
| B-006 | QA S1 catalog-core（Observation） | 字串長度上限未做（Technical Spec「安全設計」：`CREDIT_MAX_CHARS`、`LRC_MAX_BYTES` 等）。常數放 `packages/catalog`（管理端同 API 共用），API 入口驗。CR-003：`LRC_MAX_BYTES` 改做 `SONG_TEXT_MAX_BYTES` | T-029、T-023 |
| B-008 | T-030（`npm audit`） | `vite-plugin-pwa ^2.0.0` → `workbox-build` → `glob` / `minimatch` 有 4 個 moderate 警告（GHSA-3g3m-2fjr-6pw4、GHSA-g3hv-75wg-m249）。只喺 build 時用，glob pattern 係自己寫死嘅設定，唔食外來輸入；`npm audit fix` 會降去 `vite-plugin-pwa@1.1.0`（breaking）。同 903-player 用緊嘅版本一樣。等上游出修正版再升 | 上游有修正時 |
| B-011 | Review T-030（S-020、S-024） | `useStageFit` 量 `innerWidth` / `innerHeight`，但 CSS 容器係 `100dvh`；iOS 轉向後 `innerHeight` 有機會未更新。安全區亦只喺 `resize` / `orientationchange` 時重讀（stylesheet 遲載入就要等下一個 resize 先修正）。做法：對 `#root` 同安全區 probe 加 `ResizeObserver`，或者加聽 `visualViewport`；順手將 probe element 存起。要真機先重現到 | T-039（真機測試時） |
| B-013 | Review T-030（Observation） | T-039 要處理：`registerType: 'prompt'` 而家已經會自動註冊 Service Worker（未有 update manager）；`clientsClaim` 令第一次安裝都有 `controllerchange`，update manager 要「之前有 controller」先 reload；`orientation: 'portrait'` 同之後嘅橫向版面（Duo 打開、電腦）有衝突；加字體後 `woff2` 分片會全部 precache | T-039；字體 precache：T-044 |
| B-014 | Re-review T-030（S-025） | 安全區外面（狀態列、底部指示條後面，同闊畫面兩邊）由 `#root` 嘅 `--stage-backdrop` 填。每個場景要設返：Preload 黑底、歌單 / 歌書暗層、MV 淡白層。`black-translucent` 嘅狀態列字係白色，淺色主頁上面可能睇唔到，要真機確認再定 `apple-mobile-web-app-status-bar-style` | T-034、T-035 |
| B-016 | Review T-020 / T-021（S-031） | Env 驗證而家收 `wrangler.toml` 嘅 placeholder（`admin@example.com`、全 0 嘅 `database_id`）：安全（部署唔到、冇人登入到）但唔會即刻提示。部署前嘅檢查要擋 placeholder；`MEDIA_BASE` 唔應該收有 userinfo 嘅網址。⚠️ CR-010：`ADMIN_EMAILS` 改做 secret，冇或者係 placeholder 要擋（T-116 A6） | T-116（第一次部署前） |
| B-018 | Review T-020 / T-021（S-030） | 測試名同內容唔完全對應：`oauthCallback.test.ts`「use the state cookie once」只驗 Set-Cookie 有清；replay 測試同「Google rejects the code」實際一樣；`session.test.ts`「requested size」只試 32 | 下次改呢幾個檔時 |
| B-019 | Review T-020 / T-021（Observation） | 之後 Backend 任務要留意：① `/api` 守門靠註冊次序，新 route 一定要加喺 `use('*')` 之後；② `tracks (album_id, no)` UNIQUE 逐句檢查，重編歌號要分兩步；③ 重新登入唔會收返同一個瀏覽器之前嘅 session；④ `/auth/google/start` 同 callback 冇 rate limit；⑤ 自訂網域要加 HSTS；CI 未有 Worker bundle 檢查 | T-022、T-023、T-028 |
| B-020 | QA S1 api-auth（Minor） | `safeNext` 嘅長度上限按輸入嘅 UTF-8 byte 計，但放入 state cookie 嘅係編碼後嘅字串（每個中文字 9 個字元）再加 base64：`next` 有約 330 個中文字時 cookie 超過 4096 byte，瀏覽器唔收，callback 出「登入逾時」（再登入一次就得，冇安全影響）。上限改為按回傳嘅字串計；加測試「長中文 `next` → 當冇」 | T-023（T-022 冇掂嗰幾個檔，順延） |
| B-021 | QA S1 player-foundation | `robots.txt`：FR-011 同 Technical Spec「安全設計」有要求（Implementation Plan v1.1 已寫入 T-039、T-028）；而家 `/robots.txt` 回嘅係 `index.html`。播放端同 Worker 都要有 | T-039（播放端）、T-028（Worker） |
| B-022 | QA S1 api-auth（補測） | `test/oauthHelpers.ts` 嘅 `encodeJson` 用 `btoa`，非 Latin-1 字元會 throw，所以 W-008 只有 unit test。改做 UTF-8 安全，加一個經 callback 嘅 Kelvin 符號測試 | T-023（T-022 冇掂嗰幾個檔，順延） |
| B-023 | QA S1 player-foundation | 加 E2E 時，將 QA 嘅播放端 browser check（三個尺寸：舞台位置、`--u`、`lang`、robots、版本、manifest、冇 console error、頁面唔捲動）寫成 smoke spec | T-040 |
| B-025 | Review T-032 / T-033（S-039） | 測試名實不符：`MetalButton.test.tsx`「44pt rule」只驗 prop 原樣出返（真正嘅 44pt 喺 `TurntableShell.tsx`，冇測試）；`Icon.test.tsx` 只驗「有 path」，兩個 icon 對調都過；`Disc.test.tsx` 只驗 class 名（W-011 修正之後要再核對）。Platter、Screws、Metal、StageSvg 冇自己嘅測試（靠 `App.test.tsx`） | T-035（取代暫時外殼時） |
| B-026 | Review T-032 / T-033（S-040） | Focus 圈粗 3 單位 = 390pt 上約 1 px；唱片夾嗰個同唱片夾邊同一個半徑，一半被遮。另畫一個喺零件上面嘅圈，`vector-effect: non-scaling-stroke` + 2px | T-039（無障礙檢查） |
| B-027 | Review T-032 / T-033（S-041） | CSS / token：`MetalButton.tsx` 嘅 `ICON_COLOR` 重覆咗 `--color-icon`；`.stage-svg`（`app/app.css`）應該跟 `stage/StageSvg.tsx`；`--motion-feedback-toggle`、`--motion-feedback-swap` 冇人用（光圈同 icon 係即時切換），要定用定刪；`disc/disc.css` 嘅 `transform-box: fill-box` 以封面 bbox 中心做軸，內容唔對稱（Favourites 碟面）會偏心，刪走就同設計稿一樣用原點 | T-035；`transform-box` 要喺 T-070 之前 |
| B-028 | Review T-032 / T-033（S-042；Technical Spec 嗰部分已喺 v1.2 做咗） | TDD：`App.test.tsx` 4 個外殼測試同實作喺同一個 commit；`lathe.test.ts` 嘅期望值喺 feat commit 改過（146 → 142，係測試計錯）。之後嘅任務留意「先 commit 會 fail 嘅測試」。命名：`px()` 回傳嘅唔係 px（四捨五入到一位小數），`rot` 建議寫全 | 下次改呢幾個檔時 |
| B-029 | Review T-032 / T-033（Observation） | 主頁上冇任何動作改到 `selectedTrackId`：自動播下一首（US-006）之後左上要換歌名，要加一個動作，或者左上改由播放 store 計 | T-035、T-038 |
| B-030 | Review T-032 / T-033（Observation） | `closeList` 之後 `selectedTrackId` 係最後捲到嗰首，可以同播緊嗰首唔同：唱片夾同「第 nn 首」要跟 `currentTrackId` | T-035、T-038 |
| B-031 | Review T-032 / T-033（Observation） | 感應範圍係圓形（設計稿 `hitRect` 係方形）：外框 44 × 44 px 合規，方形四角㩒唔中。停用嘅掣仍然喺 Tab 次序入面（刻意，有註解）。進度 0 時進度圈喺 12 點有一點（設計稿一樣）。三樣都係記錄，真機試過有問題先改 | T-039（真機 / 無障礙檢查） |
| B-032 | Review T-032 / T-033（Observation） | Technical Spec「轉動嘅碟用獨立合成層」喺單一 SVG 入面保證唔到：真機預覽（Implementation Plan R-005）順手量轉碟時嘅 fps；唔夠就將隻碟抽出嚟做獨立一層。⚠️ CR-010：spike 主頁碟唔轉，未量 | T-038 完成後用戶真機核對（Implementation Plan U-24 ⑤） |
| B-034 | QA S1 player-core（Observation） | App 一開就停喺 Favourites 碟而又冇 `previousAlbumId` 時，㩒 ♥ 冇反應（spec 只寫「再㩒返回之前嗰隻碟」）。續播要決定：還原上一隻碟，定係用一隻預設碟 | T-038（續播 T-062） |
| B-035 | Review T-031（S-045） | 播放端（Vercel）同 Worker（Cloudflare）唔同 origin：`ETag` 唔係 CORS 預設可讀嘅 response header，播放端讀到嘅永遠係 null（而家冇嘢用佢，行為冇影響）。對外 catalog 要加 `Access-Control-Expose-Headers: ETag` 同 `Vary: Origin`；播放端唔會自己帶 `If-None-Match`（避免 preflight），Worker 唔可以靠佢 | T-026（`serve.ts`） |
| B-036 | Review T-031（S-047） | 未有 `apps/player/.env.example` 列出 `VITE_CATALOG_URL`；production build 漏咗呢個變數時，第一次開 app 嘅用戶會見到一粒永遠唔成功嘅重試掣。加 `.env.example`；`vite.config.ts` 喺 production build 冇設定時警告，或者 Preload 將 `notConfigured` 分開處理 | T-034（Preload）、T-041（部署）；`.env.example`：T-044（連 `VITE_SLAB_FONT_URL`） |
| B-037 | QA S1 player-catalog（Minor） | 注入一個 `read` 會 throw 嘅 store，`loadCatalog` 會 reject（真嘅 `createCatalogStore` 唔會 throw，唔影響任何驗收條件）。喺 `CatalogStore` 介面寫明唔可以 throw，或者 `fallBack` 包 try。另：`CATALOG_FETCH_TIMEOUT_MS` 8 秒係開發時定嘅，Technical Spec 只寫「有逾時」，下次 CR 補數值 | T-034（下次改 `src/catalog`） |
| B-038 | Review T-029 / T-096（S-049） | 歌名同「曲：」「詞：」之間有空行時，下面嘅標籤行會冇聲冇氣咁變成純文字歌詞（照 D31 嘅規則，但係最易打錯嘅位）。管理端即時檢查或者 API 要提示「呢幾行似係標籤，但前面有空行」；要唔要擋，下次 CR 定 | T-023、T-053 |
| B-039 | Review T-029 / T-096（S-050、S-052） | 測試漏洞（mutant 冇被捉到）：錯誤排序嘅測試輸入本身已經順序；64 KiB 冇邊界測試；`.replace(BYTE_ORDER_MARK, '')` 係死 code（`trim` 已經會清走）；`LINE_TOO_LONG` 量嘅係 trim 之後嘅行。另：標籤值有 U+2028／U+2029 時嗰行唔會當標籤 | 下次改 `packages/catalog/src/song-text` |
| B-040 | Review T-029 / T-096（S-051、Observation） | 長度上限喺正規化之前量：CRLF 同 BOM 嘅 byte 都計入 64 KiB；1000 行加一個結尾換行會報 `TOO_MANY_LINES`。貼入 20 MB 文字要約 0.7 秒先回 `TOO_LARGE`（可以先睇 `text.length`）。`TOO_LARGE` 由 parser 以第 0 行回報，API 要轉做 413；錯誤嘅 `text` 欄會回成行內容，API 要決定 400 嘅 details 包唔包；API-041 例子用 `reason`，package 用 `code`，要對應 | T-023 |
| B-041 | Review T-029 / T-096 | Technical Spec 同步（下次 CR）：`parseSongText()` 規則寫返開發時定嘅細節——第一行如果係標籤行或者時間標記行 = `TITLE_REQUIRED`；重覆標籤報喺重覆嗰行、留第一個值；冒號前後可以有空格、值 = 第一個冒號之後；時間標記要有冒號（W-012）；正規化（CRLF、BOM、行尾空白、歌詞前後空行）；長度上限數值；四個 credit 全空時 `credits` 係 `null`；API-041 錯誤碼加 `BAD_OFFSET`、`TITLE_TOO_LONG`；`catalog_state` 嘅欄位同 CHECK；`toLyricsJson` 新簽名 | 下次 Change Request |
| B-042 | QA S1 catalog-song-text（Minor、Observation） | ① 淨係 CR（`\r`，舊 Mac 格式）嘅換行唔會分行：成段變成一個歌名，冇報錯（瀏覽器文字框會轉做 LF，只有直接叫 API 先遇到）；分行規則加埋單獨嘅 CR，或者喺 API-041 先正規化。② 有時間標記嘅歌詞入面，`[1] 二` 報嘅係 `BAD_TIMESTAMP` 唔係 `MIXED_TIMESTAMPS`，寫錯誤訊息時要留意。③ `qa/plans/api-auth.md` AC-8 仲寫住 `publishes` 表，下次改嗰份 plan 時更新（改完要重新 freeze） | T-023 |
| B-044 | Review T-022（S-059、決定 12） | Technical Spec 同步：大部分已喺 v1.3（CR-004）回寫（冇 If-Match → 400；`ID_REMOVED` 嘅 details 同強制刪除回 200 連 body；排序 409；專輯欄位上限；`reason` 碼用大楷；`year` 跟 `releaseDate`；新增專輯嘅預設值；改歌名唔重算字母盤標記；API 錯誤訊息一律中文書面語、管理端以 `code`／`reason` 砌字）。**剩低**：API-012 回應嘅完整形狀（專輯 + 歌曲嘅欄位表）未寫入 spec | 下次改 Technical Spec（T-098 改專輯回應時一齊） |
| B-046 | QA S1 api-albums（Observation） | ③ `.dev.vars.example` 嘅 `SESSION_SECRET` placeholder 得 29 個字元，照抄會令設定檢查回 500（檢查本身正確）；placeholder 改做夠長嘅假值。（①② CR-007 關閉，見下面） | 順手 |
| B-047 | Review T-023（S-064、S-065） | ① `readBoundedJsonObject` 先讀晒成個 body 先檢查長度：上限喺 parse 之前生效，但唔係喺 buffer 之前（只有已登入、同源嘅請求先到到呢度，影響低）；先睇 `Content-Length` 或者邊讀邊計。② 兩處守衛冇測試守住：歌詞 DELETE 嘅 `changes() > 0`、body 上限（mutant 冇被捉到；行為本身正確） | 下次改 `apps/api/src/tracks` 或 `lib/http.ts` |
| B-048 | Review T-023（S-066） | R2 會留低冇人引用嘅歌詞檔（只係浪費空間，唔會有壞連結）。⚠️ CR-007：刪專輯而家經同步嘅確認移除（API-035）：移除時重用 `dropUnusedLyrics()`；或者喺生成 catalog 時清走冇引用嘅歌詞檔 | T-105 |
| B-050 | Review T-024（S-082、S-083、S-084、S-091） | 圖片結構檢查只睇檔頭：只有簽名同 IHDR 嘅 PNG、只有 SOI 同 SOF 嘅 JPEG、尾部有多餘資料嘅檔都會收（存低後以 `image/*` 加 `nosniff` 回，唔會當 HTML；只有已登入管理員上載到，唔係漏洞）。VP8X 宣稱嘅畫布大細冇同入面嘅圖對；動畫 WebP 都收。要嘛行勻 chunk 檢查到尾，要嘛寫明只檢查檔頭。另有 6 個 mutant 冇被測試捉到、R2／D1 失敗路徑冇測試 | 下次改 `apps/api/src/assets` |
| B-051 | Review T-024（S-085、S-086） | 圖片 route：`HEAD` 用咗 `get()`（會下載成個檔），改用 `head()`；加 `Content-Security-Policy: default-src 'none'; sandbox`（圖片同管理端同一個 origin） | T-026（同其他 `/catalog/v1/*` 一齊） |
| B-052 | Review T-024（S-087、S-088、S-090） | ① `assets` 冇尺寸欄，PATCH 專輯分唔到大封面同 320 縮圖，兩個可以調亂；加欄或者由管理端保證。② ~~Spec／Plan 同步~~ 已喺 CR-004 做（Technical Spec v1.3 嘅 API-050、API-071；Plan v1.2 將「兩個尺寸 WebP、抽專輯色」搬去 T-052） | ① T-106（CR-007：T-099 併入；API-017 驗封面位同尺寸） |
| B-056 | Review T-042 / T-035（S-076–S-081） | ① S-076：左上文字每次 re-render 都重新 fit，每次量度都 `getComputedStyle`；fit 用 `useMemo`，字體 stack 讀一次（T-038 每秒更新進度之前要做）。② S-077 測試漏洞：`ListVeil` 嘅 `y={-extraUnits}`（高身手機蓋唔到頂）、`progressOf` 嘅 `Math.min(1, …)` 改壞都綠；`clearance.test.ts`「whatever the album count」其實冇逐個專輯數試（改名或者加 loop）。③ S-078：`useHome` 只喺第一次 render 用 catalog，亦冇將 `dispatch` 交出去；T-034 要加 `preloadDone` 嘅入口，或者由 Preload 擁有 reducer。④ S-079：`SongLines` 用 `key={level}`（高度一樣會撞 key）；`SmallButtons` 幾何表漏咗某粒掣會靜靜雞畫喺 (0, 0)。⑤ S-080：`--motion-feedback-toggle` 仍然冇人用（定用定刪；B-027 剩低）。⑥ S-081 Technical Spec 回寫：左上文字嘅闊度上限同最細字級、升針用 160 ms 漸變、`PauseReason`（`user`／`mv`／`restore`）。~~⑦ S-081：「播緊時轉去另一隻碟」~~ 已由 CR-005 D52 回答（第 18 版確認時改寫為「拎另一隻碟睇」），喺 T-036、T-048、T-049 做 | ① T-038 之前；② ⑤ 下次改嗰幾個檔；④ `SongLines` 嘅 `key`：T-047；③ T-034；⑥ 下次改 Technical Spec |
| B-057 | CR-004（PM 發現） | `.claude/CLAUDE.md` 要跟上：QA chain 表冇 `api-tracks`、`api-assets`（frozen plan 已有；T-024 review S-090）；CR-004 之後要加掃描嘅 chain（`apps/api/src/media`，T-025 完成時）同 seed 生成指令（T-097）；媒體 bucket 名 `rb-discography` | chain 表（`api-tracks`、`api-assets`、`player-home`、`player-fonts`）同 seed 指令已加（2026-11-25）；剩低掃描 chain：T-025 完成時 |
| B-058 | CR-004（PM 發現） | T-026 嘅 code 已交但未 review：佢帶入嘅做法（`/catalog/v1/*` 嘅 CSP `default-src 'none'; sandbox`、`HEAD` 用 `head()`、`If-None-Match` 回 304、`Access-Control-Expose-Headers: ETag`、`afterWrite` 排除邊啲 route、`catalog` 欄嘅形狀）未回寫 Technical Spec（API-061、API-070–072）。Review 之後回寫；連 B-041（`parseSongText()` 細節）同 B-037（`CATALOG_FETCH_TIMEOUT_MS`）一齊 | T-026 review 之後（下次改 Technical Spec） |
| B-060 | Review T-026（S-093、S-095、S-096、S-097）、re-review（S-100） | ① `6ef24f9` 測試同修正放同一個 commit（測試本身有效）。② 第一次寫入用嘅 `If-None-Match: *` 只喺 miniflare 驗過，production R2 未驗：匯入初始資料之後加一個 smoke check。③ `.claude/CLAUDE.md` 未有 `api-catalog` 鏈（`src/catalog` 而家喺 `api-assets`）。④ Technical Spec 同步：hash 唔計 `generatedAt`、第一次生成之前回 404 `NOT_READY`（唔即場生成）、502 嘅範圍、`catalog` 回應形狀、並發演算法、歌詞檔幾時刪。⑤ `afterWrite.ts` 有一段 JSDoc 放錯咗位 | ①⑤ 下次改 `apps/api/src/catalog`；② ⚠️ CR-010：第一次部署（T-116，用戶手動）時驗；③ T-026 QA 時；④ 下次 Change Request |
| B-061 | Re-review T-026（S-098、S-099；剩低嘅空隙） | 要幾個請求同時撞先會發生，一個管理員好難遇到：① D1 寫入失敗時即時清理，有機會刪走一個本來已經存在、而且內容檔仲指住嘅歌詞檔（歌詞檔以內容 hash 命名；要「生成失敗中」加「另一個分頁同時儲存相同歌詞」）；`putLyrics` 用 `onlyIf` 只刪今次新寫嘅檔。② 重試次數用盡之後，另一個請求遲到嘅「冇變」成功可以將狀態改返做 ok，但內容檔其實未更新；改註解同 spec 字眼，或者喺「冇變」路徑再對一次 R2。③ Worker 喺舊寫入同第二次讀 D1 之間被終止，舊內容會留到下一次儲存或者重試 | 下次改 `apps/api/src/catalog`、`src/tracks` |
| B-062 | Re-review T-026（剩低嘅空隙 4；播放端） | 播放端快取住舊內容檔時（60 秒內，或者用緊本機備份），有機會請求一個啱啱被刪嘅歌詞檔而收到 404。歌書要將歌詞 404 當做「未有歌詞」，並重新攞一次內容檔 | T-082（歌書歌詞）、T-072 |
| B-064 | Review T-044（S-110–S-112、S-114、S-115） | ① 字體網址嘅 query／fragment 以反斜線結尾會整壞 CSS（build 冇警告）；帶 `user:pw@` 嘅網址會原樣寫入公開嘅 CSS：`remoteFontUrl` 要拒絕反斜線同 userinfo。② `fonts.css` 如果改用 `@import` 引入，遠端字體會靜靜消失：plugin 喺有設定網址但一個標記都冇換到時要報錯。③ 遠端字體嘅 CacheFirst 冇過期：同一個網址換檔唔會更新，`.env.example` 寫明要改檔名或者加 `?v=`，並設 `maxEntries: 1`。④ W-017 嘅 App 測試喺 `useTextMeasure` 唔換 measure 函數時照樣過（而家靠每次 render 重新 fit）；做 B-056 ① memo 時要補。⑤ 遠端字體缺字時會退去 Rockwell／serif，唔係 Rokkitt；內建子集冇 Latin Extended-A | ①②③ T-041（部署）之前；④ 同 B-056 ①；⑤ 觀察 |
| B-065 | QA player-home / player-fonts（S-116、S-117） | ① `.gitignore` 嘅字體規則分大細楷：`.OTF`、`.TTF` 唔會被忽略（字體守衛測試照捉到，唔會入 repo）；加埋大楷寫法。② `vite.config.ts` 冇副檔名嘅 import（`./src/i18n/zh-Hant`、`./src/styles/fontSource`）喺 Vite 嘅 native config loader 下唔支援；而家冇影響 | ① 順手；② Vite 升級之前 |
| B-066 | T-098 / T-097（開發者交低） | ⑤ `apps/api/test/schema.test.ts` 嘅 `catalog_state` fixture 仲寫 17 / 262（任意值）。③ `_design_/tools` 嘅 Python 測試 CI 未跑。（①② 已完成或者 CR-007 關閉；④ 記錄備查） | ③ T-028 之前；⑤ T-104 順手 |
| B-067 | Review T-100（S-123–S-125） | ② D1 嘅 `cover2` CHECK 如果觸發，用戶端會收到 500：⚠️ CR-007：封面只經新 endpoint API-017 寫，要先驗「有第一張先有第二張」，唔好靠 CHECK。（①③ CR-007 關閉：API-013 取消） | T-106 |

| B-068 | CR-006（PM 發現） | 統計項目（Functional Spec D35）。⚠️ CR-007：管理端設計稿第 4 版（commit `8fb28a7`）改為 hi-fi 機面板四個指針錶：歌曲已有音檔、已有歌詞、已有 MV、專輯已有封面（D80）。`info.txt` 列咗而冇音檔嘅歌而家都會算入歌曲數，所以「已有音檔」唔會永遠係滿；同第 4 版一齊確認 | U-8（第 4 版）；API-010 喺 T-104 |
| B-069 | CR-006（PM 發現） | `.claude/CLAUDE.md`（主 session 改）：① QA chain `api-tracks` 嘅範圍會因為 T-102 刪走 API-023；② T-025 完成時加掃描嘅 chain（`apps/api/src/media`，B-057 已記）；③ T-027 完成時「指令」表加 seed 指令（只入專輯）；④ 內容資料一行講明 `discography.json` 嘅歌單同 `credits.json` 係參考資料（Functional Spec D64），唔入資料庫。⚠️ **CR-007 再加**：⑤ chain 表：`api-seed` 拎走（T-104）、`api-media` 改為同步嘅鏈（建議 `api-sync`，`apps/api/src/sync` 或者沿用 `src/media`，T-105）、加 `packages/catalog/src/album-info`、`src/sync` 嘅歸屬（T-103）；⑥「指令」表刪 seed 兩行（`npm run seed`、`seed:sql`）；⑦ 內容資料一行：媒體 bucket 係唯一資料來源，`discography.json`／`credits.json` 只係參考同測試資料（Functional Spec D66、D79） | ①–④ 已做或者過時；⑤⑥⑦ T-103–T-105 完成時（主 session） |
| B-071 | Review T-046 / T-047（W-032） | Service Worker 未有 catalog 圖片嘅執行期 cache 規則，FR-042 離線未達（Technical Spec 第 1228 行誤寫已有）。要做：① `vite.config.ts` 加 `/catalog/v1/img/` 嘅 CacheFirst 規則（設數量上限）；② `usePrefetchOtherArt` 由 `no-cors` 改 `cors`（圖片 route 已對 `PLAYER_ORIGINS` 回 CORS header；opaque 回應 Workbox 預設唔 cache）；③ 歌詞檔嘅離線 cache 一併考慮。歸入 T-034（Preload 預載揀中嗰張封面）做，計劃下次更新時寫明 | T-034 |
| B-072 | Review T-046 / T-047（S-127–S-131） | ① 兩行歌名讀屏時兩行之間冇空格、「…」截短嘅歌名讀唔全：`song-title` 加 `aria-label={track.title}`。② `usePrefetchOtherArt` 測試捉唔到拎走 `.catch`。③ 網址喺 fetch 之前就記做已攞，失敗或者離線時今次開 app 唔會再試。④ 冇測試釘住「…」預留闊度同 `trimStart` 分支。⑤ 第二行後面嘅心形同泊位唱臂嘅淨空（最差約 0.3 單位，同設計稿一樣）冇 clearance 測試 | ①③：T-034 之前；②④⑤：下一個播放端任務順手 |
| B-074 | Review／QA T-027、T-025（S-138、S-140；主 session 決定 W-034、S-135） | ④ Workers 每個請求嘅操作上限（假設 1000）部署前要對官方文件；同步（API-034）嘅估算見 Technical Spec v1.7「每個請求嘅操作上限」。（①②③ CR-007 關閉，見下面）⚠️ CR-010：第一次部署記錄 API-034 實際操作數 | T-116（第一次部署；官方文件由可以上網嘅一方查） |
| B-075 | Review T-034（S-141–S-147；W-036 已修） | ① 測試空位：封面 5 秒前唔可以放棄、連續重試兩次、載入途中 unmount、像素比上限、logo 喺 unmount 之後先載入。② 旗幟每格嘅計算量（約 10.8k 個著色取樣、1,320 次裁切繪圖、2,600 個細物件）未喺真手機量 fps。③ cache 規則配對任何 https 主機嘅 `/catalog/v1/img/`：收窄到 `VITE_CATALOG_URL` 嘅網域。④ 用鍵盤㩒「重試」之後焦點跌咗去 body。⑤ 開 app 嘅 promise 冇總 catch（而家三個 loader 都唔會 reject）。⑥ **要用戶確認**：RubberBand logo 而家隨 app 同公開 repo 一齊出（`src/assets/logo-full.png`）；風險 R-2 只講「自用」可接受。⑦ 旗幟上 logo 嘅偏移 `drift: 58`：實測 logo 中心喺 x 530–591 之間擺，平均 565（設計稿 540）；改做約 30 會平均置中，喺真機睇過再定 ⚠️ CR-010：② 已量：iPhone 約 5 fps → T-114（WebGL）。 | ①③④⑤：T-039 之前；②：T-114；⑦：T-114 量度時一齊睇；⑥：用戶 |
| B-076 | QA T-034（S-148） | 封面載入失敗（冇 CORS header、404、離線而未 cache）時，碟面顯示瀏覽器自己嘅「圖片失敗」圖案，唔係專輯色（`config/limits.ts:37` 嘅註解寫專輯色）。要做：`<image>` 載入失敗時改畫專輯色底。另：播放端網域唔喺 Worker 嘅 `PLAYER_ORIGINS` 時，catalog 同封面都會被擋（部署 runbook 要寫明） | T-036 一齊做；runbook：T-028／T-041 |
| B-077 | Review／QA T-036（S-153、S-154、S-162） | ③ 旁邊五隻碟（陰影 filter、clip path、縮圖）喺真機嘅流暢度未量（S-153）。④ 電視開住時旋鈕仲 focus 得到但冇作用（S-154 第二部分，T-060）。⑤ 封面 404 嘅碟每次返入範圍都會再請求（S-162）：記低失敗，同一次開 app 唔再試。⑥ 轉到 ♥ 時左上碟名係空（設計稿係「我的收藏」）：T-070。（① S-152、② S-151 喺 CR-008 關閉，見下面） | ③：真機預覽；④：T-060；⑤：順手；⑥：T-070 |
| B-078 | Review T-103 / T-104（S-157、S-161） | 修正已做（T-105，QA S1 pass）；spec 字眼已寫入 Functional Spec v1.10 D68、D70（CR-008「實作對齊」）。**剩低：用戶確認**主 session 代決定嘅兩條：① 比對歌名時唔理檔名放唔到嘅符號（S-157）；② `info.txt` 曲目行歌號後面嘅橫線當分隔（S-161） | 用戶（Implementation Plan U-22） |
| B-079 | Review T-105（S-164、S-166） | 修正已做（T-106，QA S1 pass）；spec 字眼已寫入 Functional Spec v1.10 D68、D70（CR-008「實作對齊」）。**剩低**：① 用戶確認 S-164（`info.txt` 用唔到而之前用過：保留上次資料，經 `albums.info_used`）同 S-166（改歌號 = 新歌）；② S-166 要寫入 T-028 runbook 同管理端提示 | ①：用戶（U-22）；②：T-028、T-053 |
| B-080 | Review T-048 / T-049（S-171、S-178、S-192） | ④ 載入嘅碟喺 catalog 搵唔到時仍然當係「拎住」但冇細唱片機，返唔到去（S-171；今日行唔到）。⑥ 流程（S-178）：補測試要先喺實作之前嘅版本驗佢 fail。⑧ QA（S-192）：歌名啱啱放得落時左邊入咗行嘅感應範圍 2.5 單位，歌單欄 focus 框會掂到第一個字（CR-008 之後行唔係掣，T-108 做完再睇仲有冇 focus 框）。（①② S-172、W-045 由 CR-008 D89、D90 關閉；③⑤ S-173、S-174、S-176 spec 已改；⑦ S-193 已修：`MINI.title.step` = 2） | ④：T-038／T-062；⑥：之後嘅任務；⑧：T-108 |
| B-081 | Review T-106（S-181、S-183、S-185、S-190、S-191） | ① ② 修正已做，spec 字眼已寫入 Functional Spec v1.10 D75 同 Technical Spec v1.8（CR-008「實作對齊」）；**剩低用戶確認**：太大嘅 `info.txt`／歌詞檔唔可以喺管理端覆蓋（409 `FILE_TOO_LARGE`，S-181）、等緊確認移除嘅歌唔可以存歌詞檔（409 `TRACK_NOT_LISTED`，S-183）。③ **要決定**（S-185）：封面處理失敗（`COVER_FAILED`）冇 endpoint 儲存；T-055 開工前定：API-017 加失敗形態，定係只喺瀏覽器顯示。⑤ 重構（S-190）：`info.ts` 同 `text.ts` 嘅寫入再同步流程可以抽共用函數；`INFO_FILE_NAME` 重複。⑥ 部署前（S-191，連 B-060 ②）：喺真 R2 驗 `If-None-Match: *`；覆蓋舊檔會換走原本嘅 metadata。（④ S-189 已寫入 Technical Spec v1.8） ⚠️ CR-010：③ 冇設計嘅同步頁（T-116）暫時只喺記錄顯示，T-055 前照舊要定；⑥ 第一次部署（T-116）驗 | ①②：用戶（U-22）；③：T-055 前；⑤：有空；⑥：T-116 |
| B-082 | QA T-103–T-106（S-195、S-196） | ① `apps/api/src/tracks/ids.ts` 嘅隨機後備 id（D61）冇測試行到（T-104 刪咗佢嘅測試；語句覆蓋 42.85%）：補測試，或者如果 CR-007 之後已經用唔著就刪。② API-035（`sync/removals.ts`）讀 body 冇大細上限（4.8 MB 都會 parse 完先 400）：改用有上限嘅讀法（同 API-017 一樣）。③ `apps/player/src/app/{PreloadPlaceholder.tsx,app.css}` 唔屬於任何 QA 鏈：下次播放端 QA 歸入 `player-startup`／`player-core`。 | ①②：T-107 或者下一個後端任務；③：下次播放端 QA |
| B-085 | QA T-037 / T-039（S-207、S-208） | ① 正式 icon 令離線預載由 373 KiB 升到 1125 KiB（`icon-512.png` 339 KB、maskable 303 KB）：export 時壓縮（`_mockups_/app-icon/src/export.cjs`）再抄入嚟。② 兩個註解仲寫舊嘅更新規則：`apps/player/src/i18n/zh-Hant.ts:102`、`apps/player/vite.config.ts:81`（CR-009：嗰段字串喺 T-109 換走，一齊改）。~~③ 更新提示同細唱片機感應範圍嘅垂直距離：393 闊 13.5px、360 闊 7.3px，約 321 闊先會撞；提示位置等用戶睇。~~（③ 由 CR-009 D95 關閉：冇提示，版本掣喺細唱片機上面）④ B-082 ③ 已冇嘢做（`PreloadPlaceholder.tsx`、`app.css` 喺 T-037 已刪）。 | ①：T-041 之前（T-112 加嘅檔細，約 57 KB）；②：T-109 |
| B-088 | Review／QA T-108（S-209、S-210、S-214、S-215、S-216；觀察） | ① S-209：140 毫秒內擰返原本隻碟，歌單欄即刻出（設計稿會再等 140 毫秒）：細，未做。~~② S-210：播完嘅碟㩒唱片夾而家冇反應：T-038 做（用戶已定：由第一首播返）。~~（② 已定：CR-009 D99，T-038 驗收標準 E3）③ S-214：唱片夾嘅讀屏文字只係「播放」，冇講會播邊首：PM 決定。④ S-215：飄落途中捲動，行由舊位置出發（設計稿一樣）。⑤ S-216：停用嘅掣㩒落去又冇㩒完（滑走／取消），下一下冇 pointerdown 嘅 click 會被食一次（`pressable`）：喺 pointercancel／pointerleave 清，或者只擋 `event.detail > 0` 嘅 click。⑥ `heldTracksView`、`HeldTrackList`、`layout.heldTracks` 呢啲名唔再貼切（歌單欄唔一定係拎住）：改名。⑦ ♥ 碟冇碟面、冇碟名（`canOpenList` 要有專輯）：T-070。⑧ 播放模式掣嘅 handler 仲係空（`useHome.ts:139`）：T-038 | ⑧ T-038；⑦ T-070；其餘有空先做 |
| B-089 | 用戶 2026-11-26（app icon 任務說明；CR-009 決定 8） | 管理端頂條 icon：44 px，放喺「R Gram」左邊，用方案 D（`_mockups_/app-icon/export/d-black-disc/`；`icon.svg` 或者 `icon-48.png`，管理端開工時定）；管理端設計稿第 4 版（U-8）確認時一齊睇位置 | T-051（管理端開工） |
| B-090 | Review／QA T-109、T-110、T-112、T-010（S-222、S-217） | ~~① S-220 字眼~~（CR-010「實作對齊」已改，見下面）。② S-222：版本掣閃動係改 SVG 群組嘅 opacity，每格重畫嗰小塊：真機睇 CPU／電量。~~③ 拆 spike 頁~~（→ T-115）。~~④ 旋鈕取消規則~~（→ Functional Spec D102）。⑤ 碟疊喺 5 格或以下時有一隻碟會跳位（S-217，有測試記錄；正式資料 22 格） | 有空先做（② 可以同 U-24 一齊睇） |
| B-092 | Review／QA T-038、T-116、T-113（S-229、S-233、S-237、S-238、S-250；觀察） | ① S-250：D99 放低隻碟之後，鎖屏嘅播放位置冇清（`setPositionState()` 冇參數叫一次就得）。② S-237：`useHome` 嘅 controller 參數可以唔傳（spike 場景用），會開多一個引擎同 `<audio>`：T-115 拆 spike 頁時一齊拎走。③ S-238：細唱片機隻碟跟 store 嘅「播緊」轉，唔係跟真正出聲。④ S-229：同步頁封面要喺解碼之前限制大細（而家 8000 px 檢查喺解碼之後）。⑤ S-233：同步頁 CSP `connect-src` 收窄到 `MEDIA_BASE` 嘅 origin。⑥ Spec 字眼：D99 ④ 同 T-038 E1 提到「隨機但冇開重覆」，播放模式表已經冇呢個組合：下次 CR 改。⑦ 第一次同步唔報 `COVER_NOT_SQUARE`，第二次先出（檢查結果喺封面存好嗰陣先寫）。⑧ 停頓偵測靠 `timeupdate` 先過 `waiting`：真 iPhone 嘅次序喺 U-24 一齊睇。⑨ T-038 邊界決定（未入 spec）：D109 只限自動下一首；播完或者失敗之後鎖屏「上一首」去上一首；暫停期間網絡出錯唔重試唔報錯，下次 play 原位重載（W-064）：下次 CR 寫入 | ② T-115；⑥⑨ 下次 CR；其餘有空先做 |
| B-093 | Review／QA T-114、T-070（S-258；用戶 2026-11-26 兩個決定；開發者嘅預設做法） | ① S-258：開發模式（StrictMode）下 `useState(() => createBrowserFavourites())` 行兩次，被丟棄嗰個 store 嘅 `storage` listener 留低；正式版唔受影響。建議 browser store 唔喺 constructor 開始聽，留畀 effect 嘅 `listen()`。② 下次 CR 寫入 Functional Spec（code 已做、QA 已驗）：喺 Favourites 碟播緊（或者暫停、出錯）嘅歌被取消收藏（呢個分頁或者其他分頁），store 即刻拎走，但留喺歌單同隊列，直到播完、轉歌或者放低隻碟；播緊時再收藏返原位，其他新收藏排最尾；**單曲重複下呢首歌一直重播（用戶 2026-11-26 決定）**；**播緊時「原本專輯 · 年份」喺「第 nn 首 · m:ss」下面一行（`info.origin.belowTrack` 36；用戶 2026-11-26 睇截圖確認）**；同一首歌喺原本專輯同 Favourites 碟算兩隻碟；未有音檔嘅收藏灰色兼跳過；已經唔喺 catalog 嘅收藏唔顯示但留喺 store；Favourites 碟嘅歌號係收藏次序；弧線歌單一律用顯示緊嘅碟播。③ 真機（U-24）：旗幟 fps（spike 5a 兩個模式）、iOS 會唔會真係 context lost、鎖屏每首收藏顯示原本專輯同封面、鎖機跨碟自動下一首、心形感應範圍、私隱模式下收藏唔記得。④ 收藏唔跨裝置同步（範圍外）；收藏歌嘅 MV 同歌書未驗（等 T-060、T-072） | ① 有空先做；② 下次 CR；③ U-24；④ T-060／T-072 |

## CR-010 關閉或者轉咗去任務嘅項目（2026-11-26；下次整理可以刪走呢段）

CR-010（Functional Spec v1.12、Technical Spec v1.10、Implementation Plan v1.9）：真機 spike 結果（`reports/2026-11-26_17-10_spike-report_T-011.md`）、打橫改返「請打直」、旋鈕取消、播放同 MV 音訊做法、Preload 旗幟、臨時測試 catalog、先做後端。

| # | 結果 |
| --- | --- |
| B-091 ①（打橫改返「請打直」） | Functional Spec D101（D96 撤回）；T-111 取消（branch `feature/t111-landscape` 留底）；R-23、R-026 關閉 |
| B-091 ②（真機結果） | 寫入 spike 報告同 Technical Spec「CR-010 對技術設計嘅影響」；播放 → D103、T-038；MV 靜音 → D104、T-061；模糊 → D105；旗幟 → D106、新任務 T-114 |
| B-091 ③（T-011） | 完成（`12b259e`） |
| B-090 ①（S-220 字眼） | Technical Spec「CR-010 → 實作對齊」同 Implementation Plan T-109、T-110：`update.applyLabel`、prop 入 `TopGroup`、`info.update`、`UpdateNotice`、`rowStep` 已刪、`updateBox.test.ts` |
| B-090 ③（拆 spike 頁） | 新任務 T-115（等 T-114 重量；連 `tsconfig.node.json`、`manifest.node.test.ts`、`precache.node.test.ts` 共十二樣） |
| B-090 ④（旋鈕取消規則） | Functional Spec D102（code 已做） |
| B-075 ②（旗幟 fps） | 已量（約 5 fps）→ T-114 |
| B-032（轉碟 fps） | 留喺上表，改為 U-24 ⑤ |
| B-016、B-060 ②、B-074 ④、B-081 ⑥ | 留喺上表，改為第一次部署（T-116） |

## CR-009 關閉或者轉咗去任務嘅項目（2026-11-26；下次整理可以刪走呢段）

CR-009（Functional Spec v1.11、Technical Spec v1.9、Implementation Plan v1.8）：版本掣、手機打橫轉返、弧線歌單同旋鈕頭尾相接、播完最後一首（播放端設計稿第 20 版，commit `a335587`）、app icon 細尺寸。

| # | 結果 |
| --- | --- |
| B-087 ①⑥（版本掣，第 4 稿確認） | Functional Spec D95；任務 T-109（進行中）；`update-prompt` 作廢 |
| B-087 ②（手機打橫） | D96；任務 T-111（等 T-110）；spike T-010 加 ⑥；風險 R-23（Functional Spec）、R-026（Plan） |
| B-087 ③（測試碟） | KOMOREBI，`album-11-komorebi`（Plan 決定 14、U-1 ④、T-010） |
| B-087 ④⑥（播完最後一首） | D99：停、唱片夾 play、3 秒後變返未揀歌、㩒 play 由第一首播；CR-008 開放問題關閉（PM 建議唔採用）；T-038 |
| B-087 ⑤⑥（頭尾相接） | 弧線歌單 D97、旋鈕同碟疊 D98；任務 T-110（進行中） |
| B-087 ⑥（S-211 歌名相撞） | 接受，唔改；S-211 關閉 |
| B-088 ②（S-210） | D99，T-038 |
| B-085 ③（提示撞細唱片機） | 冇提示（D95） |
| App icon 細尺寸 | D100；T-112（進行中）；管理端頂條 icon → B-089 |

## CR-008 關閉或者轉咗去任務嘅項目（2026-11-26；下次整理可以刪走呢段）

CR-008（Functional Spec v1.10、Technical Spec v1.8、Implementation Plan v1.7）：揀碟同歌單欄（播放端設計稿第 19 版）、旋鈕、弧線歌單、更新、logo，連 review／QA 要求嘅 spec 字眼。

| # | 結果 |
| --- | --- |
| B-070（歌名斷行字眼、`wrapLine()` → `breakAt()`） | Functional Spec D51 同「左上歌名兩行」改為設計稿 `breakAt()` 嘅規則；Technical Spec「左上歌名兩行」改 `breakAt()`；`breakAt.ts` 嘅註解已經係啱嘅 |
| B-077 ①②（S-152 旋鈕輕點、S-151 `slider` 同 D27 字眼） | ① 用戶決定：㩒住 180 ms 或者郁過 6 px 先開（D91；T-037／T-039 修正已做）；② Technical Spec 元件表改 `slider`、D27 改為㩒住擰放手定碟。③–⑥ 留喺上表 |
| B-083（用戶 2026-11-26 嘅五項決定） | ① 旋鈕 → D91；② logo 可以出 → D94、R-2；③ 唔要副題 → 冇改動（D71）；④ 細唱片機嘅字 → D89（已做）；⑤ 歌號顏色 → D90（照用專輯色） |
| B-084（T-037／T-039 review 同用戶決定） | W-049、W-050、W-053、S-198、S-199、S-204 已修（`037f901`）；① 歌號專輯色 → D90；② 弧線歌單行唔㩒得 → D92；③ 歌單欄飄落、揀碟出歌單欄、純睇 → D82–D87，code 喺 T-108；⑤ FR-044、D27、D57 → CR-008 |
| B-086（旋鈕／歌單欄規則定案） | Functional Spec §CR-008 決定 1–7（D82–D88）；設計稿第 19 版（`ca8c52a`）已確認；code 喺新任務 T-108（進行中）；T-038 接 `playFirst` 同「播完」 |
| B-080 ①②③⑤⑦ | ① W-045 → D89（字推上，取代 162 單位嘅擺法）；② S-172 → D90；③ S-173、S-174 由 CR-008 解決（行唔係掣），Technical Spec 淨空規則改寫；⑤ S-176 → Technical Spec `returnToLoaded` 改為即刻換碟；⑦ S-193 已修（`MINI.title.step` 2）。④⑥⑧ 留喺上表 |
| B-081 ④（S-189 API 表） | Technical Spec v1.8「API-017／018／019／040／041 回寫」、新錯誤碼、API-019／041 操作數；①② 嘅字眼寫入 D75，等用戶確認（留喺上表） |
| B-073 | 之前已喺 CR-007 關閉（見下面）；今次冇嘢做 |

## CR-007 關閉或者轉咗去任務嘅項目（2026-11-26；下次整理可以刪走呢段）

CR-007（Functional Spec v1.9）：媒體 bucket 係唯一資料來源；專輯同曲目由資料夾同 `info.txt`；管理端冇人手寫入專輯同歌嘅 API。以下嘅項目因此冇咗意義，或者轉咗去新任務。

| # | 結果 |
| --- | --- |
| B-043（PATCH 專輯嘅寫入後讀取、排序唔喺同一個 transaction、`afterWrite` 排除） | ①② 冇咗：API-013、API-015 取消（T-104）；③ T-026 已做 |
| B-045（專輯 folder 收 `...`、`a..b`；零闊連接符） | 冇咗：資料夾名由同步讀，一定要過 `parseAlbumFolder()`（T-103）；專輯文字欄冇 API 輸入，碟名規則喺 `parseAlbumInfo()` 定 |
| B-046 ①②（未知欄位冇上限、`catalog` 欄名） | ① 冇咗：專輯寫入 API 取消；② T-026 已統一。③ 留喺上表 |
| B-049 ②（folder `a..b` 同手動指定 key 嘅規則） | 冇咗：冇手動指定、冇改綁（D67、D71） |
| B-052 ① | 轉去 T-106（T-099 併入；API-017 驗封面位同尺寸） |
| B-066 ②（歌曲 API 回應未有 `text_source_etag`） | T-025 已做；CR-007 之後歌曲 API 只剩讀寫文字（T-106） |
| B-067 ①③（`COVER2_WITHOUT_COVER` 等錯誤碼寫入 spec、兩個 PATCH 同時） | 冇咗：API-013 取消；② 轉去 T-106 |
| B-073（T-102 嘅 `NUMBER_EXHAUSTED`、`NOT_EDITABLE` 寫入 spec；409 提示字眼） | 冇咗：API-020、API-021 取消（T-104），歌號由 `info.txt` |
| B-074 ①②③（T-025 回應欄位寫入 spec；runbook 加 `albums.sql`；套用 `.txt` 嘅 `STALE`／`VALIDATION_ERROR`） | 冇咗：預覽同逐項套用由同步取代（Technical Spec v1.7）；冇 `albums.sql`（T-028 runbook 改為「部署後喺管理端掃描一次」）。④ 留喺上表 |
| B-048 | 轉去 T-105（確認移除專輯時清歌詞檔） |

## CR-006 關閉或者轉咗去任務嘅項目（2026-11-25；下次整理可以刪走呢段）

| # | 結果 |
| --- | --- |
| Review T-098／T-097 S-119（終於好天氣冇完整發行日期） | 用戶答「碟唔需要發行日期，只要年份；無年份就唔顯示」：Functional Spec D63；年份由唔完整日期攞（2016），唱片公司留空；code 喺 T-101 |
| B-066 ②（歌曲 API 回應未有 `text_source_etag`） | 仍然屬 T-025；CR-006 嘅掃描建立歌曲（`create`）一樣要寫呢個欄 |
| D44、D49、D54 兩個例外、D55 `cover2.png`、U-16、U-17 | Functional Spec v1.8 §CR-006 定案；Implementation Plan v1.5：T-101、T-102，T-025、T-027 改範圍 |

## CR-005 關閉或者轉咗去任務嘅項目（2026-11-25，連第 18 版確認；下次整理可以刪走呢段）

| # | 結果 |
| --- | --- |
| B-055（左上歌名放唔落，review W-018） | 用戶答「斷成兩行」：Functional Spec D51（修訂 D23）；數值喺播放端設計稿第 18 版（2026-11-25 已確認，`SONG_FIT`）；code 喺 T-047 |
| B-063（字重，review W-026） | 用戶答「照 Book 粗幼顯示」：Functional Spec D53（修訂 D45）；code 本身就係咁，唔使改；Technical Spec「字體」字眼已改 |
| B-056 ⑦（播緊時轉碟，review S-081） | 用戶決定：Functional Spec D52（第 18 版確認時改寫：拎另一隻碟睇，細唱片機 + 歌單欄）；code 喺 T-036、T-048、T-049 |
| B-059（設計稿冇 22 格示範） | 播放端設計稿第 18 版（2026-11-25 已確認）主轉盤用真實 21 隻碟 + ♥ = 22 格（`SCALE`、`DIAL_KEYS`）；T-036、T-040 嘅截圖對呢格。Functional Spec v1.7 |
| B-053 嘅 D48 部分 | D48 由 D50 取代（細圖由管理端放大到 1200，Worker 規則不變）；seed 一樣放大（T-027） |

## CR-004 同 2026-11-25 review 關閉或者轉咗去任務嘅項目（下次整理可以刪走呢段）

| # | 結果 |
| --- | --- |
| B-053（初始封面尺寸） | 轉去 Functional Spec D48（PM 建議，**待用戶確認**：seed 自己出 320 縮圖；細過 1200 嘅唔放大，大封面規則放寬為正方形、640 至 1200；列出要補圖嘅專輯）。跟進：Implementation Plan U-15（問用戶）、T-099（規則）、T-027（seed） |
| B-054（播放端未打包 slab 字體） | CR-004 決定 4：變成任務 **T-044**（內建 Rokkitt、可選 bucket 字體、字體載入後重新量字；連 review W-017）。Functional Spec FR-041、D45 |
| B-044（大部分）、B-049 ①、B-052 ② | Technical Spec v1.3「回寫：開發時定落嚟嘅 API 細節」同 API-050、API-071；Implementation Plan v1.2 T-024／T-052。剩低嘅留喺上表 |
| B-045 ①、B-049 ②（folder 同 key 嘅 `..` 規則） | CR-004 定咗規則（Technical Spec「資料夾名同發行類別」）；code 喺 T-098，行仍然留喺上表 |
| B-024（`SvgDefs` 重砌車床紋）、B-033（`Disc` 以專輯 id 做 key） | T-035 已做，review T-042 / T-035 確認完成（`reviews/2026-11-25_12-18_review_T-042_T-035.md`「Re-render / CSS / 舊 code」） |

## CR-003 關閉嘅項目（2026-11-25；下次整理可以刪走呢段）

| # | 結果 |
| --- | --- |
| B-002（Functional Spec 部分） | Functional Spec v1.4 已改做 `apps/api/seed/…`；`_design_/HANDOFF.md` 嗰部分留喺上表 |
| B-009 | 決定 1：左上資訊同頂部螺絲貼頂，唱片機成組貼底，多出嚟嘅高度喺中間（FR-039）。`StageSvg` 已經咁做；註解喺 T-042 改 |
| B-010、B-015 | 決定 2：刻度弧固定（185° 至 376.25°）、♥ 喺弧尾、專輯平均分佈；感應範圍唔再受專輯數影響，♥ 嘅感應方格唔會出界。Spec 已改；設計稿第 17 版用戶 2026-11-25 已確認（連碟多時字母盤嘅字母規則，D28）；code 喺 T-042、T-036 |
| B-012 | 決定 3：細屏按比例縮，375pt 闊 42.3pt、360pt 闊 40.6pt 已接受；唔使做嘢 |
| B-017 | Technical Spec v1.2 已同步（API-003 認證欄、`apps/api` 組件圖、Header 行） |
| Review T-032 / T-033 Observation：暫停時唱臂位置，US-004 同 Technical Spec／設計稿有衝突 | 決定 11：唱針升起、唱臂留喺碟上面（FR-040）。Spec 已改；code 喺 T-042、T-038 |
