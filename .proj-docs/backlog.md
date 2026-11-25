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
| B-013 | Review T-030（Observation） | T-039 要處理：`registerType: 'prompt'` 而家已經會自動註冊 Service Worker（未有 update manager）；`clientsClaim` 令第一次安裝都有 `controllerchange`，update manager 要「之前有 controller」先 reload；`orientation: 'portrait'` 同之後嘅橫向版面（Duo 打開、電腦）有衝突；加字體後 `woff2` 分片會全部 precache | T-039 |
| B-014 | Re-review T-030（S-025） | 安全區外面（狀態列、底部指示條後面，同闊畫面兩邊）由 `#root` 嘅 `--stage-backdrop` 填。每個場景要設返：Preload 黑底、歌單 / 歌書暗層、MV 淡白層。`black-translucent` 嘅狀態列字係白色，淺色主頁上面可能睇唔到，要真機確認再定 `apple-mobile-web-app-status-bar-style` | T-034、T-035 |
| B-016 | Review T-020 / T-021（S-031） | Env 驗證而家收 `wrangler.toml` 嘅 placeholder（`admin@example.com`、全 0 嘅 `database_id`）：安全（部署唔到、冇人登入到）但唔會即刻提示。部署前嘅檢查要擋 placeholder；`MEDIA_BASE` 唔應該收有 userinfo 嘅網址 | T-028 |
| B-018 | Review T-020 / T-021（S-030） | 測試名同內容唔完全對應：`oauthCallback.test.ts`「use the state cookie once」只驗 Set-Cookie 有清；replay 測試同「Google rejects the code」實際一樣；`session.test.ts`「requested size」只試 32 | 下次改呢幾個檔時 |
| B-019 | Review T-020 / T-021（Observation） | 之後 Backend 任務要留意：① `/api` 守門靠註冊次序，新 route 一定要加喺 `use('*')` 之後；② `tracks (album_id, no)` UNIQUE 逐句檢查，重編歌號要分兩步；③ 重新登入唔會收返同一個瀏覽器之前嘅 session；④ `/auth/google/start` 同 callback 冇 rate limit；⑤ 自訂網域要加 HSTS；CI 未有 Worker bundle 檢查 | T-022、T-023、T-028 |
| B-020 | QA S1 api-auth（Minor） | `safeNext` 嘅長度上限按輸入嘅 UTF-8 byte 計，但放入 state cookie 嘅係編碼後嘅字串（每個中文字 9 個字元）再加 base64：`next` 有約 330 個中文字時 cookie 超過 4096 byte，瀏覽器唔收，callback 出「登入逾時」（再登入一次就得，冇安全影響）。上限改為按回傳嘅字串計；加測試「長中文 `next` → 當冇」 | T-023（T-022 冇掂嗰幾個檔，順延） |
| B-021 | QA S1 player-foundation | `robots.txt`：FR-011 同 Technical Spec「安全設計」有要求（Implementation Plan v1.1 已寫入 T-039、T-028）；而家 `/robots.txt` 回嘅係 `index.html`。播放端同 Worker 都要有 | T-039（播放端）、T-028（Worker） |
| B-022 | QA S1 api-auth（補測） | `test/oauthHelpers.ts` 嘅 `encodeJson` 用 `btoa`，非 Latin-1 字元會 throw，所以 W-008 只有 unit test。改做 UTF-8 安全，加一個經 callback 嘅 Kelvin 符號測試 | T-023（T-022 冇掂嗰幾個檔，順延） |
| B-023 | QA S1 player-foundation | 加 E2E 時，將 QA 嘅播放端 browser check（三個尺寸：舞台位置、`--u`、`lang`、robots、版本、manifest、冇 console error、頁面唔捲動）寫成 smoke spec | T-040 |
| B-024 | Review T-032 / T-033（S-035） | `metal/SvgDefs.tsx`：`latheWedges()` 每次 re-render 重砌 96 格車床紋；T-038 進度每秒更新幾次就每次重砌。改做 module 常數，`SvgDefs` 包 `memo` | T-038 之前 |
| B-025 | Review T-032 / T-033（S-039） | 測試名實不符：`MetalButton.test.tsx`「44pt rule」只驗 prop 原樣出返（真正嘅 44pt 喺 `TurntableShell.tsx`，冇測試）；`Icon.test.tsx` 只驗「有 path」，兩個 icon 對調都過；`Disc.test.tsx` 只驗 class 名（W-011 修正之後要再核對）。Platter、Screws、Metal、StageSvg 冇自己嘅測試（靠 `App.test.tsx`） | T-035（取代暫時外殼時） |
| B-026 | Review T-032 / T-033（S-040） | Focus 圈粗 3 單位 = 390pt 上約 1 px；唱片夾嗰個同唱片夾邊同一個半徑，一半被遮。另畫一個喺零件上面嘅圈，`vector-effect: non-scaling-stroke` + 2px | T-039（無障礙檢查） |
| B-027 | Review T-032 / T-033（S-041） | CSS / token：`MetalButton.tsx` 嘅 `ICON_COLOR` 重覆咗 `--color-icon`；`.stage-svg`（`app/app.css`）應該跟 `stage/StageSvg.tsx`；`--motion-feedback-toggle`、`--motion-feedback-swap` 冇人用（光圈同 icon 係即時切換），要定用定刪；`disc/disc.css` 嘅 `transform-box: fill-box` 以封面 bbox 中心做軸，內容唔對稱（Favourites 碟面）會偏心，刪走就同設計稿一樣用原點 | T-035；`transform-box` 要喺 T-070 之前 |
| B-028 | Review T-032 / T-033（S-042；Technical Spec 嗰部分已喺 v1.2 做咗） | TDD：`App.test.tsx` 4 個外殼測試同實作喺同一個 commit；`lathe.test.ts` 嘅期望值喺 feat commit 改過（146 → 142，係測試計錯）。之後嘅任務留意「先 commit 會 fail 嘅測試」。命名：`px()` 回傳嘅唔係 px（四捨五入到一位小數），`rot` 建議寫全 | 下次改呢幾個檔時 |
| B-029 | Review T-032 / T-033（Observation） | 主頁上冇任何動作改到 `selectedTrackId`：自動播下一首（US-006）之後左上要換歌名，要加一個動作，或者左上改由播放 store 計 | T-035、T-038 |
| B-030 | Review T-032 / T-033（Observation） | `closeList` 之後 `selectedTrackId` 係最後捲到嗰首，可以同播緊嗰首唔同：唱片夾同「第 nn 首」要跟 `currentTrackId` | T-035、T-038 |
| B-031 | Review T-032 / T-033（Observation） | 感應範圍係圓形（設計稿 `hitRect` 係方形）：外框 44 × 44 px 合規，方形四角㩒唔中。停用嘅掣仍然喺 Tab 次序入面（刻意，有註解）。進度 0 時進度圈喺 12 點有一點（設計稿一樣）。三樣都係記錄，真機試過有問題先改 | T-039（真機 / 無障礙檢查） |
| B-032 | Review T-032 / T-033（Observation） | Technical Spec「轉動嘅碟用獨立合成層」喺單一 SVG 入面保證唔到：真機預覽（Implementation Plan R-005）順手量轉碟時嘅 fps；唔夠就將隻碟抽出嚟做獨立一層 | 真機預覽（T-038 之前） |
| B-033 | Re-review T-032 / T-033（Observation） | W-011 之後封面角度只會喺 `Disc` unmount 時歸零：同一個 `Disc` 換封面，新封面會停喺上一隻碟嘅角度。以專輯 id 做 `key`（Implementation Plan v1.1 已寫入 T-035） | T-035、T-036 |
| B-034 | QA S1 player-core（Observation） | App 一開就停喺 Favourites 碟而又冇 `previousAlbumId` 時，㩒 ♥ 冇反應（spec 只寫「再㩒返回之前嗰隻碟」）。續播要決定：還原上一隻碟，定係用一隻預設碟 | T-038（續播 T-062） |
| B-035 | Review T-031（S-045） | 播放端（Vercel）同 Worker（Cloudflare）唔同 origin：`ETag` 唔係 CORS 預設可讀嘅 response header，播放端讀到嘅永遠係 null（而家冇嘢用佢，行為冇影響）。對外 catalog 要加 `Access-Control-Expose-Headers: ETag` 同 `Vary: Origin`；播放端唔會自己帶 `If-None-Match`（避免 preflight），Worker 唔可以靠佢 | T-026（`serve.ts`） |
| B-036 | Review T-031（S-047） | 未有 `apps/player/.env.example` 列出 `VITE_CATALOG_URL`；production build 漏咗呢個變數時，第一次開 app 嘅用戶會見到一粒永遠唔成功嘅重試掣。加 `.env.example`；`vite.config.ts` 喺 production build 冇設定時警告，或者 Preload 將 `notConfigured` 分開處理 | T-034（Preload）、T-041（部署） |
| B-037 | QA S1 player-catalog（Minor） | 注入一個 `read` 會 throw 嘅 store，`loadCatalog` 會 reject（真嘅 `createCatalogStore` 唔會 throw，唔影響任何驗收條件）。喺 `CatalogStore` 介面寫明唔可以 throw，或者 `fallBack` 包 try。另：`CATALOG_FETCH_TIMEOUT_MS` 8 秒係開發時定嘅，Technical Spec 只寫「有逾時」，下次 CR 補數值 | T-034（下次改 `src/catalog`） |
| B-038 | Review T-029 / T-096（S-049） | 歌名同「曲：」「詞：」之間有空行時，下面嘅標籤行會冇聲冇氣咁變成純文字歌詞（照 D31 嘅規則，但係最易打錯嘅位）。管理端即時檢查或者 API 要提示「呢幾行似係標籤，但前面有空行」；要唔要擋，下次 CR 定 | T-023、T-053 |
| B-039 | Review T-029 / T-096（S-050、S-052） | 測試漏洞（mutant 冇被捉到）：錯誤排序嘅測試輸入本身已經順序；64 KiB 冇邊界測試；`.replace(BYTE_ORDER_MARK, '')` 係死 code（`trim` 已經會清走）；`LINE_TOO_LONG` 量嘅係 trim 之後嘅行。另：標籤值有 U+2028／U+2029 時嗰行唔會當標籤 | 下次改 `packages/catalog/src/song-text` |
| B-040 | Review T-029 / T-096（S-051、Observation） | 長度上限喺正規化之前量：CRLF 同 BOM 嘅 byte 都計入 64 KiB；1000 行加一個結尾換行會報 `TOO_MANY_LINES`。貼入 20 MB 文字要約 0.7 秒先回 `TOO_LARGE`（可以先睇 `text.length`）。`TOO_LARGE` 由 parser 以第 0 行回報，API 要轉做 413；錯誤嘅 `text` 欄會回成行內容，API 要決定 400 嘅 details 包唔包；API-041 例子用 `reason`，package 用 `code`，要對應 | T-023 |
| B-041 | Review T-029 / T-096 | Technical Spec 同步（下次 CR）：`parseSongText()` 規則寫返開發時定嘅細節——第一行如果係標籤行或者時間標記行 = `TITLE_REQUIRED`；重覆標籤報喺重覆嗰行、留第一個值；冒號前後可以有空格、值 = 第一個冒號之後；時間標記要有冒號（W-012）；正規化（CRLF、BOM、行尾空白、歌詞前後空行）；長度上限數值；四個 credit 全空時 `credits` 係 `null`；API-041 錯誤碼加 `BAD_OFFSET`、`TITLE_TOO_LONG`；`catalog_state` 嘅欄位同 CHECK；`toLyricsJson` 新簽名 | 下次 Change Request |
| B-042 | QA S1 catalog-song-text（Minor、Observation） | ① 淨係 CR（`\r`，舊 Mac 格式）嘅換行唔會分行：成段變成一個歌名，冇報錯（瀏覽器文字框會轉做 LF，只有直接叫 API 先遇到）；分行規則加埋單獨嘅 CR，或者喺 API-041 先正規化。② 有時間標記嘅歌詞入面，`[1] 二` 報嘅係 `BAD_TIMESTAMP` 唔係 `MIXED_TIMESTAMPS`，寫錯誤訊息時要留意。③ `qa/plans/api-auth.md` AC-8 仲寫住 `publishes` 表，下次改嗰份 plan 時更新（改完要重新 freeze） | T-023 |
| B-043 | Review T-022（S-057、S-058） | ① PATCH 專輯：寫入之後再讀之間，如果另一個請求刪咗嗰隻碟，會回 404 但其實已經寫入；改用 `UPDATE … RETURNING`。② 排序嘅「檢查 id 齊唔齊」同寫入唔喺同一個 transaction（一個管理員嘅情況可以接受，加註解）。③ `afterWrite` 之後亦會喺 `POST /api/catalog/rebuild`（變成生成兩次）同 `PUT /api/assets` 行，T-026 要排除 | T-026 |
| B-044 | Review T-022（S-059、決定 12） | Technical Spec 同步（下次 CR）：冇 If-Match → 400；`ID_REMOVED` 嘅 details 形狀同強制刪除回 200 連 body；排序 409；專輯欄位上限同 folder 規則；`reason` 碼用大寫；API-012 嘅歌曲形狀；`year` 跟 `releaseDate`；新增專輯嘅預設值；改歌名唔重算字母盤標記。另要定一條規則：API 錯誤訊息嘅語言（專輯 API 用中文書面語，登入相關嘅 401／403 同通用 404／500 仲係英文）——建議全部用中文書面語，管理端以 `code`／`reason` 砌自己嘅文字 | 下次 Change Request；語言規則喺 T-023 之前定 |
| B-045 | Re-review T-022（S-062、S-063） | ① 專輯 folder 名仲收 `...` 同 `a..b`（唔危險：網址會原樣保留），但 Technical Spec 寫 R2 key 唔可以有 `..`，由呢類 folder 掃出嚟嘅 key 會過唔到手動指定檔案嘅檢查；一係拒絕任何 `..`，一係喺 spec 寫明 folder 規則（連同 B-044）。② 錯誤訊息嘅 `{max}` 呢類 placeholder 如果漏咗參數，會原樣出現喺用戶見到嘅訊息；加一個測試行勻所有 reason，確認冇 `{`／`}` 剩低。③ 文字欄位拒絕零闊連接符 U+200D（組合 emoji 用），re-review 認為唔豁免；之後真係要用，行 Change Request | T-023 |

## CR-003 關閉嘅項目（2026-11-25；下次整理可以刪走呢段）

| # | 結果 |
| --- | --- |
| B-002（Functional Spec 部分） | Functional Spec v1.4 已改做 `apps/api/seed/…`；`_design_/HANDOFF.md` 嗰部分留喺上表 |
| B-009 | 決定 1：左上資訊同頂部螺絲貼頂，唱片機成組貼底，多出嚟嘅高度喺中間（FR-039）。`StageSvg` 已經咁做；註解喺 T-042 改 |
| B-010、B-015 | 決定 2：刻度弧固定（185° 至 376.25°）、♥ 喺弧尾、專輯平均分佈；感應範圍唔再受專輯數影響，♥ 嘅感應方格唔會出界。Spec 已改；設計稿第 16 版等確認；code 喺 T-042、T-036 |
| B-012 | 決定 3：細屏按比例縮，375pt 闊 42.3pt、360pt 闊 40.6pt 已接受；唔使做嘢 |
| B-017 | Technical Spec v1.2 已同步（API-003 認證欄、`apps/api` 組件圖、Header 行） |
| Review T-032 / T-033 Observation：暫停時唱臂位置，US-004 同 Technical Spec／設計稿有衝突 | 決定 11：唱針升起、唱臂留喺碟上面（FR-040）。Spec 已改；code 喺 T-042、T-038 |
