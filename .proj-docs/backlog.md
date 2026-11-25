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
| B-016 | Review T-020 / T-021（S-031） | Env 驗證而家收 `wrangler.toml` 嘅 placeholder（`admin@example.com`、全 0 嘅 `database_id`）：安全（部署唔到、冇人登入到）但唔會即刻提示。部署前嘅檢查要擋 placeholder；`MEDIA_BASE` 唔應該收有 userinfo 嘅網址 | T-028 |
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
| B-032 | Review T-032 / T-033（Observation） | Technical Spec「轉動嘅碟用獨立合成層」喺單一 SVG 入面保證唔到：真機預覽（Implementation Plan R-005）順手量轉碟時嘅 fps；唔夠就將隻碟抽出嚟做獨立一層 | 真機預覽（T-038 之前） |
| B-034 | QA S1 player-core（Observation） | App 一開就停喺 Favourites 碟而又冇 `previousAlbumId` 時，㩒 ♥ 冇反應（spec 只寫「再㩒返回之前嗰隻碟」）。續播要決定：還原上一隻碟，定係用一隻預設碟 | T-038（續播 T-062） |
| B-035 | Review T-031（S-045） | 播放端（Vercel）同 Worker（Cloudflare）唔同 origin：`ETag` 唔係 CORS 預設可讀嘅 response header，播放端讀到嘅永遠係 null（而家冇嘢用佢，行為冇影響）。對外 catalog 要加 `Access-Control-Expose-Headers: ETag` 同 `Vary: Origin`；播放端唔會自己帶 `If-None-Match`（避免 preflight），Worker 唔可以靠佢 | T-026（`serve.ts`） |
| B-036 | Review T-031（S-047） | 未有 `apps/player/.env.example` 列出 `VITE_CATALOG_URL`；production build 漏咗呢個變數時，第一次開 app 嘅用戶會見到一粒永遠唔成功嘅重試掣。加 `.env.example`；`vite.config.ts` 喺 production build 冇設定時警告，或者 Preload 將 `notConfigured` 分開處理 | T-034（Preload）、T-041（部署）；`.env.example`：T-044（連 `VITE_SLAB_FONT_URL`） |
| B-037 | QA S1 player-catalog（Minor） | 注入一個 `read` 會 throw 嘅 store，`loadCatalog` 會 reject（真嘅 `createCatalogStore` 唔會 throw，唔影響任何驗收條件）。喺 `CatalogStore` 介面寫明唔可以 throw，或者 `fallBack` 包 try。另：`CATALOG_FETCH_TIMEOUT_MS` 8 秒係開發時定嘅，Technical Spec 只寫「有逾時」，下次 CR 補數值 | T-034（下次改 `src/catalog`） |
| B-038 | Review T-029 / T-096（S-049） | 歌名同「曲：」「詞：」之間有空行時，下面嘅標籤行會冇聲冇氣咁變成純文字歌詞（照 D31 嘅規則，但係最易打錯嘅位）。管理端即時檢查或者 API 要提示「呢幾行似係標籤，但前面有空行」；要唔要擋，下次 CR 定 | T-023、T-053 |
| B-039 | Review T-029 / T-096（S-050、S-052） | 測試漏洞（mutant 冇被捉到）：錯誤排序嘅測試輸入本身已經順序；64 KiB 冇邊界測試；`.replace(BYTE_ORDER_MARK, '')` 係死 code（`trim` 已經會清走）；`LINE_TOO_LONG` 量嘅係 trim 之後嘅行。另：標籤值有 U+2028／U+2029 時嗰行唔會當標籤 | 下次改 `packages/catalog/src/song-text` |
| B-040 | Review T-029 / T-096（S-051、Observation） | 長度上限喺正規化之前量：CRLF 同 BOM 嘅 byte 都計入 64 KiB；1000 行加一個結尾換行會報 `TOO_MANY_LINES`。貼入 20 MB 文字要約 0.7 秒先回 `TOO_LARGE`（可以先睇 `text.length`）。`TOO_LARGE` 由 parser 以第 0 行回報，API 要轉做 413；錯誤嘅 `text` 欄會回成行內容，API 要決定 400 嘅 details 包唔包；API-041 例子用 `reason`，package 用 `code`，要對應 | T-023 |
| B-041 | Review T-029 / T-096 | Technical Spec 同步（下次 CR）：`parseSongText()` 規則寫返開發時定嘅細節——第一行如果係標籤行或者時間標記行 = `TITLE_REQUIRED`；重覆標籤報喺重覆嗰行、留第一個值；冒號前後可以有空格、值 = 第一個冒號之後；時間標記要有冒號（W-012）；正規化（CRLF、BOM、行尾空白、歌詞前後空行）；長度上限數值；四個 credit 全空時 `credits` 係 `null`；API-041 錯誤碼加 `BAD_OFFSET`、`TITLE_TOO_LONG`；`catalog_state` 嘅欄位同 CHECK；`toLyricsJson` 新簽名 | 下次 Change Request |
| B-042 | QA S1 catalog-song-text（Minor、Observation） | ① 淨係 CR（`\r`，舊 Mac 格式）嘅換行唔會分行：成段變成一個歌名，冇報錯（瀏覽器文字框會轉做 LF，只有直接叫 API 先遇到）；分行規則加埋單獨嘅 CR，或者喺 API-041 先正規化。② 有時間標記嘅歌詞入面，`[1] 二` 報嘅係 `BAD_TIMESTAMP` 唔係 `MIXED_TIMESTAMPS`，寫錯誤訊息時要留意。③ `qa/plans/api-auth.md` AC-8 仲寫住 `publishes` 表，下次改嗰份 plan 時更新（改完要重新 freeze） | T-023 |
| B-043 | Review T-022（S-057、S-058） | ① PATCH 專輯：寫入之後再讀之間，如果另一個請求刪咗嗰隻碟，會回 404 但其實已經寫入；改用 `UPDATE … RETURNING`。② 排序嘅「檢查 id 齊唔齊」同寫入唔喺同一個 transaction（一個管理員嘅情況可以接受，加註解）。③ `afterWrite` 之後亦會喺 `POST /api/catalog/rebuild`（變成生成兩次）同 `PUT /api/assets` 行，T-026 要排除 | T-026 |
| B-044 | Review T-022（S-059、決定 12） | Technical Spec 同步：大部分已喺 v1.3（CR-004）回寫（冇 If-Match → 400；`ID_REMOVED` 嘅 details 同強制刪除回 200 連 body；排序 409；專輯欄位上限；`reason` 碼用大楷；`year` 跟 `releaseDate`；新增專輯嘅預設值；改歌名唔重算字母盤標記；API 錯誤訊息一律中文書面語、管理端以 `code`／`reason` 砌字）。**剩低**：API-012 回應嘅完整形狀（專輯 + 歌曲嘅欄位表）未寫入 spec | 下次改 Technical Spec（T-098 改專輯回應時一齊） |
| B-045 | Re-review T-022（S-062、S-063） | ① 專輯 folder 名仲收 `...` 同 `a..b`：CR-004 已定規則（folder 唔可以有 `..`，同手動指定 key 一致；另外唔可以 `_` 開頭），code 喺 T-098 改。② ~~placeholder 測試~~ 已做（commit `a404a97`）。③ 文字欄位拒絕零闊連接符 U+200D（組合 emoji 用），re-review 認為唔豁免；之後真係要用，行 Change Request | ① T-098；③ 有需要先做 |
| B-046 | QA S1 api-albums（Observation） | ① 未知欄位嘅數目冇上限：5,000 個未知欄位（362 KB 請求）會回 5,000 條 details、605 KB 回應；超過某個數目就只回一條。② `GET /api/albums` 嘅 `catalog`（catalog 狀態，物件或者 null）同寫入回應將來嘅 `catalog: { ok }` 同名但形狀唔同，T-026 定案時要統一或者改名。③ `.dev.vars.example` 嘅 `SESSION_SECRET` placeholder 得 29 個字元，照抄會令設定檢查回 500（檢查本身正確）；placeholder 改做夠長嘅假值 | ①③ T-023；② T-026 |
| B-047 | Review T-023（S-064、S-065） | ① `readBoundedJsonObject` 先讀晒成個 body 先檢查長度：上限喺 parse 之前生效，但唔係喺 buffer 之前（只有已登入、同源嘅請求先到到呢度，影響低）；先睇 `Content-Length` 或者邊讀邊計。② 兩處守衛冇測試守住：歌詞 DELETE 嘅 `changes() > 0`、body 上限（mutant 冇被捉到；行為本身正確） | 下次改 `apps/api/src/tracks` 或 `lib/http.ts` |
| B-048 | Review T-023（S-066） | R2 會留低冇人引用嘅歌詞檔（只係浪費空間，唔會有壞連結）：強制刪專輯之後、R2 寫入後 D1 出錯、三次 id 都撞。刪專輯時重用 `dropUnusedLyrics()`，或者喺生成 catalog 時清走冇引用嘅歌詞檔 | T-026 |
| B-049 | Review T-023（S-069、S-071） | ① ~~Technical Spec 同步~~ 已喺 v1.3（CR-004）回寫（`LYRICS_REMOVED`、400 details、200／201 連 `track` 同 `hints`、API-021 嘅欄位同上限、API-022／API-023 回應、body 上限同 413、歌曲 id、歌詞檔 key、共用錯誤碼）。② 專輯 folder 仲收 `a..b`，但手動指定嘅媒體 key 拒絕任何 `..`：CR-004 已定（folder 都唔收 `..`），code 喺 T-098 改（同 B-045 ①） | ② T-098（T-025 之前） |
| B-050 | Review T-024（S-082、S-083、S-084、S-091） | 圖片結構檢查只睇檔頭：只有簽名同 IHDR 嘅 PNG、只有 SOI 同 SOF 嘅 JPEG、尾部有多餘資料嘅檔都會收（存低後以 `image/*` 加 `nosniff` 回，唔會當 HTML；只有已登入管理員上載到，唔係漏洞）。VP8X 宣稱嘅畫布大細冇同入面嘅圖對；動畫 WebP 都收。要嘛行勻 chunk 檢查到尾，要嘛寫明只檢查檔頭。另有 6 個 mutant 冇被測試捉到、R2／D1 失敗路徑冇測試 | 下次改 `apps/api/src/assets` |
| B-051 | Review T-024（S-085、S-086） | 圖片 route：`HEAD` 用咗 `get()`（會下載成個檔），改用 `head()`；加 `Content-Security-Policy: default-src 'none'; sandbox`（圖片同管理端同一個 origin） | T-026（同其他 `/catalog/v1/*` 一齊） |
| B-052 | Review T-024（S-087、S-088、S-090） | ① `assets` 冇尺寸欄，PATCH 專輯分唔到大封面同 320 縮圖，兩個可以調亂；加欄或者由管理端保證。② ~~Spec／Plan 同步~~ 已喺 CR-004 做（Technical Spec v1.3 嘅 API-050、API-071；Plan v1.2 將「兩個尺寸 WebP、抽專輯色」搬去 T-052） | ① T-099（CR-005：放寬規則取消，淨返呢項，連第二張封面嘅 `cover2`／`thumb2`） |
| B-056 | Review T-042 / T-035（S-076–S-081） | ① S-076：左上文字每次 re-render 都重新 fit，每次量度都 `getComputedStyle`；fit 用 `useMemo`，字體 stack 讀一次（T-038 每秒更新進度之前要做）。② S-077 測試漏洞：`ListVeil` 嘅 `y={-extraUnits}`（高身手機蓋唔到頂）、`progressOf` 嘅 `Math.min(1, …)` 改壞都綠；`clearance.test.ts`「whatever the album count」其實冇逐個專輯數試（改名或者加 loop）。③ S-078：`useHome` 只喺第一次 render 用 catalog，亦冇將 `dispatch` 交出去；T-034 要加 `preloadDone` 嘅入口，或者由 Preload 擁有 reducer。④ S-079：`SongLines` 用 `key={level}`（高度一樣會撞 key）；`SmallButtons` 幾何表漏咗某粒掣會靜靜雞畫喺 (0, 0)。⑤ S-080：`--motion-feedback-toggle` 仍然冇人用（定用定刪；B-027 剩低）。⑥ S-081 Technical Spec 回寫：左上文字嘅闊度上限同最細字級、升針用 160 ms 漸變、`PauseReason`（`user`／`mv`／`restore`）。~~⑦ S-081：「播緊時轉去另一隻碟」~~ 已由 CR-005 D52 回答（第 18 版確認時改寫為「拎另一隻碟睇」），喺 T-036、T-048、T-049 做 | ① T-038 之前；② ⑤ 下次改嗰幾個檔；④ `SongLines` 嘅 `key`：T-047；③ T-034；⑥ 下次改 Technical Spec |
| B-057 | CR-004（PM 發現） | `.claude/CLAUDE.md` 要跟上：QA chain 表冇 `api-tracks`、`api-assets`（frozen plan 已有；T-024 review S-090）；CR-004 之後要加掃描嘅 chain（`apps/api/src/media`，T-025 完成時）同 seed 生成指令（T-097）；媒體 bucket 名 `rb-discography` | chain 表（`api-tracks`、`api-assets`、`player-home`、`player-fonts`）同 seed 指令已加（2026-11-25）；剩低掃描 chain：T-025 完成時 |
| B-058 | CR-004（PM 發現） | T-026 嘅 code 已交但未 review：佢帶入嘅做法（`/catalog/v1/*` 嘅 CSP `default-src 'none'; sandbox`、`HEAD` 用 `head()`、`If-None-Match` 回 304、`Access-Control-Expose-Headers: ETag`、`afterWrite` 排除邊啲 route、`catalog` 欄嘅形狀）未回寫 Technical Spec（API-061、API-070–072）。Review 之後回寫；連 B-041（`parseSongText()` 細節）同 B-037（`CATALOG_FETCH_TIMEOUT_MS`）一齊 | T-026 review 之後（下次改 Technical Spec） |
| B-060 | Review T-026（S-093、S-095、S-096、S-097）、re-review（S-100） | ① `6ef24f9` 測試同修正放同一個 commit（測試本身有效）。② 第一次寫入用嘅 `If-None-Match: *` 只喺 miniflare 驗過，production R2 未驗：匯入初始資料之後加一個 smoke check。③ `.claude/CLAUDE.md` 未有 `api-catalog` 鏈（`src/catalog` 而家喺 `api-assets`）。④ Technical Spec 同步：hash 唔計 `generatedAt`、第一次生成之前回 404 `NOT_READY`（唔即場生成）、502 嘅範圍、`catalog` 回應形狀、並發演算法、歌詞檔幾時刪。⑤ `afterWrite.ts` 有一段 JSDoc 放錯咗位 | ①⑤ 下次改 `apps/api/src/catalog`；② T-027；③ T-026 QA 時；④ 下次 Change Request |
| B-061 | Re-review T-026（S-098、S-099；剩低嘅空隙） | 要幾個請求同時撞先會發生，一個管理員好難遇到：① D1 寫入失敗時即時清理，有機會刪走一個本來已經存在、而且內容檔仲指住嘅歌詞檔（歌詞檔以內容 hash 命名；要「生成失敗中」加「另一個分頁同時儲存相同歌詞」）；`putLyrics` 用 `onlyIf` 只刪今次新寫嘅檔。② 重試次數用盡之後，另一個請求遲到嘅「冇變」成功可以將狀態改返做 ok，但內容檔其實未更新；改註解同 spec 字眼，或者喺「冇變」路徑再對一次 R2。③ Worker 喺舊寫入同第二次讀 D1 之間被終止，舊內容會留到下一次儲存或者重試 | 下次改 `apps/api/src/catalog`、`src/tracks` |
| B-062 | Re-review T-026（剩低嘅空隙 4；播放端） | 播放端快取住舊內容檔時（60 秒內，或者用緊本機備份），有機會請求一個啱啱被刪嘅歌詞檔而收到 404。歌書要將歌詞 404 當做「未有歌詞」，並重新攞一次內容檔 | T-082（歌書歌詞）、T-072 |
| B-064 | Review T-044（S-110–S-112、S-114、S-115） | ① 字體網址嘅 query／fragment 以反斜線結尾會整壞 CSS（build 冇警告）；帶 `user:pw@` 嘅網址會原樣寫入公開嘅 CSS：`remoteFontUrl` 要拒絕反斜線同 userinfo。② `fonts.css` 如果改用 `@import` 引入，遠端字體會靜靜消失：plugin 喺有設定網址但一個標記都冇換到時要報錯。③ 遠端字體嘅 CacheFirst 冇過期：同一個網址換檔唔會更新，`.env.example` 寫明要改檔名或者加 `?v=`，並設 `maxEntries: 1`。④ W-017 嘅 App 測試喺 `useTextMeasure` 唔換 measure 函數時照樣過（而家靠每次 render 重新 fit）；做 B-056 ① memo 時要補。⑤ 遠端字體缺字時會退去 Rockwell／serif，唔係 Rokkitt；內建子集冇 Latin Extended-A | ①②③ T-041（部署）之前；④ 同 B-056 ①；⑤ 觀察 |
| B-065 | QA player-home / player-fonts（S-116、S-117） | ① `.gitignore` 嘅字體規則分大細楷：`.OTF`、`.TTF` 唔會被忽略（字體守衛測試照捉到，唔會入 repo）；加埋大楷寫法。② `vite.config.ts` 冇副檔名嘅 import（`./src/i18n/zh-Hant`、`./src/styles/fontSource`）喺 Vite 嘅 native config loader 下唔支援；而家冇影響 | ① 順手；② Vite 升級之前 |
| B-066 | T-098 / T-097（開發者交低） | ① ~~catalog 入面 `category`、`categoryNo` 而家係「兩個都有或者兩個都冇」~~ 做緊：review T-098／T-097 W-028，主 session 決定改為必填（跟 Technical Spec API-070），同 W-029、S-118、S-120、S-121 一齊修。② 歌曲 API 回應未有 `text_source_etag`（T-025 掃描用）。③ `_design_/tools` 嘅 Python 測試 CI 未跑。④ `singles-01`（Ciao）變咗 `zoi-jat-hei-01`：未上線，冇用戶資料受影響；記錄備查。⑤ `apps/api/test/schema.test.ts` 嘅 `catalog_state` fixture 仲寫 17 / 262（任意值） | ① T-098／T-097 review 修正（進行中）；② T-025；③ T-028 之前；⑤ 順手 |
| B-067 | Review T-100（S-123–S-125） | ① Technical Spec 未記錄 `COVER2_WITHOUT_COVER`、`UNPAIRED_COVER2` 兩個錯誤代碼同報喺邊個欄位。② D1 嘅 `cover2` CHECK 如果觸發，用戶端會收到 500（而家 API 先驗證，行唔到）：註明「出現即係 bug」或者轉做 409。③ 未有「兩個 PATCH 同時」嘅測試（實測結果：一個 200、一個 409） | ① 下次改 spec 時；②③ T-052 之前 |

| B-068 | CR-006（PM 發現） | 統計項目（Functional Spec D35，等 U-8）：CR-006 之後歌由掃描按音檔建立，「歌曲已有音檔」個儀錶差唔多永遠係滿（只有 D62 嘅灰色行同人手新增未指定音檔嘅歌先唔係）。建議確認管理端設計稿第 2 版時，將呢個儀錶換做「歌曲已有歌曲文字（曲詞編監）」或者「專輯已掃描」，同用戶一齊定 | T-050 補畫、U-8 |
| B-069 | CR-006（PM 發現） | `.claude/CLAUDE.md`（主 session 改）：① QA chain `api-tracks` 嘅範圍會因為 T-102 刪走 API-023；② T-025 完成時加掃描嘅 chain（`apps/api/src/media`，B-057 已記）；③ T-027 完成時「指令」表加 seed 指令（只入專輯）；④ 內容資料一行講明 `discography.json` 嘅歌單同 `credits.json` 係參考資料（Functional Spec D64），唔入資料庫 | T-102、T-025、T-027 完成時 |
| B-070 | Review T-046 / T-047（W-031；主 session 決定：跟設計稿） | 歌名斷行：code 同設計稿第 18 版 `breakAt()` 一致（英文字、數字、括號字元唔喺字中間斬；有空格嘅括號片語可以喺空格斷）。Functional Spec D51 嘅字眼（「先喺空格斷、括號入面唔斷」）同設計稿有出入：以已確認嘅設計稿做準，改 D51 字眼；`breakAt.ts` 嘅註解一併改正。Technical Spec 第 1235 行寫 `wrapLine()`，應為 `breakAt()`（S-132） | 下次改 spec 時（PM）；註解：下一個播放端任務順手 |
| B-071 | Review T-046 / T-047（W-032） | Service Worker 未有 catalog 圖片嘅執行期 cache 規則，FR-042 離線未達（Technical Spec 第 1228 行誤寫已有）。要做：① `vite.config.ts` 加 `/catalog/v1/img/` 嘅 CacheFirst 規則（設數量上限）；② `usePrefetchOtherArt` 由 `no-cors` 改 `cors`（圖片 route 已對 `PLAYER_ORIGINS` 回 CORS header；opaque 回應 Workbox 預設唔 cache）；③ 歌詞檔嘅離線 cache 一併考慮。歸入 T-034（Preload 預載揀中嗰張封面）做，計劃下次更新時寫明 | T-034 |
| B-072 | Review T-046 / T-047（S-127–S-131） | ① 兩行歌名讀屏時兩行之間冇空格、「…」截短嘅歌名讀唔全：`song-title` 加 `aria-label={track.title}`。② `usePrefetchOtherArt` 測試捉唔到拎走 `.catch`。③ 網址喺 fetch 之前就記做已攞，失敗或者離線時今次開 app 唔會再試。④ 冇測試釘住「…」預留闊度同 `trimStart` 分支。⑤ 第二行後面嘅心形同泊位唱臂嘅淨空（最差約 0.3 單位，同設計稿一樣）冇 clearance 測試 | ①③：T-034 之前；②④⑤：下一個播放端任務順手 |
| B-073 | Review T-102 / T-101（S-133、S-134） | ① Technical Spec 要補 T-102 定案嘅行為：`NUMBER_EXHAUSTED`、自動編號重試 3 次之後回 409、欄位錯同逐行錯一齊回、`NOT_EDITABLE`；刪走舊句「歌號經 API-023」。② 冇畀歌號而三次都俾人搶先時，409 嘅提示寫「請改用其他歌號」，但用戶冇畀歌號：改提示字眼（影響好細） | ① 下次改 spec 時（PM）；② T-025 順手 |
| B-074 | Review／QA T-027、T-025（S-138、S-140；主 session 決定 W-034、S-135） | ① Technical Spec 回寫 T-025 定案：回應欄位（`listTruncated`、`manualUnchecked`、`truncated`、`audioMissing[].mvKey`）、錯誤碼（`INTERNAL`、`FIRST_COVER_CONFLICT`、`AUDIO_CONFLICT`）、常數（`SCAN_TEXT_READS_MAX`、`SCAN_APPLY_MAX_ITEMS`、`SCAN_LIST_PAGES_MAX`、`SCAN_MANUAL_HEADS_MAX`）；seed 改為本機 CLI + production 用 `seed/albums.sql`（第 735、1489 行嘅 `--remote` 作廢）；`clearAudio` 連掃描配對嘅 MV 連結一齊清（同 D54 一致）。② T-028 runbook 加 `albums.sql` 一步同之後重新生成 catalog。③ 套用途中 `.txt` 喺列表之後、讀檔之前被刪：歌照建立（歌名用檔名），`songTexts` 回 `VALIDATION_ERROR` 而唔係 `STALE`（`applyText.ts:27`；重新掃描就正常）。④ Workers 每個請求嘅操作上限（假設 1000）部署前要對官方文件 | ①：下次改 spec 時（PM）；②④：T-028；③：順手 |
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
