# Implementation Plan：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.9
**日期**：2026-11-26 17:50（v1.8：2026-11-26 16:30；v1.7：2026-11-26 11:40；v1.6：2026-11-26 10:30；v1.5：2026-11-25 21:10；v1.4：2026-11-25 19:36；v1.3：2026-11-25 16:40；v1.2：2026-11-25 12:40；v1.1：2026-11-25 08:06；v1.0：2026-11-25 00:07）
**狀態**：v1.9（CR-010）。Spike 完成（T-010、T-011 ✅；U-2 ✅；報告 `reports/2026-11-26_17-10_spike-report_T-011.md`），用戶 2026-11-26 嘅決定同報告嘅結論（Functional Spec v1.12 §CR-010；Technical Spec v1.10）：手機打橫 D96 撤回、改返「請打直」→ **T-111 取消**（−1.5）；旋鈕取消規則（已做）；播放做法定案 → **T-038 可以開工**（2.5 → 3.25，**進行中**）；MV 只用 gain → T-061 1.5 → 1.25、T-060 一個 `<video>`；旗幟約 5 fps → 新 **T-114**（WebGL，2.5，可以開工）；新 **T-115**（拆 spike 頁，0.25，等 T-114）；臨時測試 catalog 新 **T-113**（0.5，已合併，review／QA 未做）；先做後端 → 新 **T-116**（冇設計嘅同步頁同部署準備，2.75，**進行中**），T-051 2.5 → 1.75、T-055 2.5 → 1.25、T-028 0.5 → 0.25。用戶：U-3 ✅（private bucket 叫 **`rb-discography-catalog`**、D1 `r-gram`）、U-4 ✅（OAuth client；redirect URI `https://r-gram-api.dcwhung.workers.dev/auth/google/callback` 等用戶確認登記咗）；加 U-24（真機核對清單）、U-25（CR-010 預設，唔阻）。風險：R-001、R-003、R-026 關閉，R-002、R-004、R-005、R-006 減低或者改寫，加 R-027–R-032。工作量 125.25 → 128.5。**以下係 v1.8（CR-009）嘅狀態**（入面 T-111 已由 CR-010 取消）：用戶 2026-11-26（CR-008 之後）嘅決定，喺**播放端設計稿第 20 版**確認（commit `a335587`；Functional Spec v1.11 §CR-009）：版本掣取代更新提示、手機打橫畫面唔跟住轉（取代「請打直」）、弧線歌單同旋鈕頭尾相接、播完最後一首 3 秒後變返未揀歌、app icon 細尺寸。新增 **T-109**（版本掣，1，**進行中**）、**T-110**（弧線歌單同旋鈕頭尾相接，2，**進行中**）、**T-111**（手機打橫轉返，1.5，等 T-110）、**T-112**（app icon 細尺寸同 maskable 192，0.5，**進行中**）；T-038 加播完最後一首（2 → 2.5）、T-010 加打橫一項（1.5 → 1.75）、T-040 加第 20 版嘅格（2.5 → 3）、T-045 第 20 版（+0.5，已做）。**U-7 完成**（Vercel project 已開，播放端 `https://rgram.vercel.app`；A-7 唔再需要）；U-1 剩低 ② CORS 同 ④ 測試檔（KOMOREBI，`album-11-komorebi`）；T-010 只等 U-1 ②④。加 R-026（iOS 打橫）、U-23（CR-009 PM 建議）。工作量 117.5 → 125.25。**以下係 v1.7（CR-008）嘅狀態**：用戶 2026-11-26 逐點定案播放端揀碟同歌單欄，確認**播放端設計稿第 19 版**（commit `ca8c52a`；Functional Spec v1.10 §CR-008）：歌單欄純睇、幾時出（字母盤開住或者顯示緊嘅碟未揀歌）、揀歌一律經碟面 → 弧線歌單 → 唱片夾、唱片夾未揀歌 = 播第一首、細掣同唱臂嘅顯示規則、歌單欄飄落同縮短、拎住時播完「已播完」。新增 **T-108**（揀碟歌單欄第 19 版，Frontend，3，**進行中**）；T-038、T-040（2 → 2.5）、T-045（第 19 版 +0.5，已做）、T-037、T-048、T-049 加備注；R-021 關閉；加 U-22（CR-008 待用戶確認嘅實作對齊，唔阻）。旋鈕㩒住先開、弧線歌單行唔㩒得、細唱片機嘅字、更新規則、logo、app icon 已喺 T-037／T-039 嘅修正做咗，今次只係寫入 spec。工作量 113 → 117.5。**以下係 v1.6（CR-007）嘅狀態**：用戶 2026-11-26 改咗管理端方向（Functional Spec v1.9 §CR-007）：**媒體 bucket 係唯一資料來源**；專輯由資料夾名同 `info.txt`；管理端 = 掃描（新增更新自動、移除確認先做、檢查結果）+ 兩個文字框（寫返 bucket）。Backend 新增 **T-103**（`info.txt` 同資料夾名 parser，1）、**T-104**（資料模型同內容檔、拎走人手寫入 API 同 seed，2）、**T-105**（全 bucket 同步，3）、**T-106**（寫返 bucket、封面結果 endpoint，1.5）；T-099 併入 T-106（取消）；管理端：T-050 出第 4 版（commit `8fb28a7`，等用戶確認，+1）、T-052 3 → 2、T-053 4.5 → 1.5、新增 **T-055**（掃描畫面，2.5）；T-083 只留播音檔對時（1.5 → 0.5）。工作量 106 → 113；另外已做而作廢約 4 人日。管理端任務綁第 4 版，**等用戶確認（U-8）**。新增 U-20（CR-007 PM 建議）、U-21（app icon，另一個 session 設計緊）。**以下係 v1.5（CR-006）嘅狀態**（入面 T-025、T-027 嘅範圍已由 CR-007 取代）：**U-16、U-17 完成**：用戶 2026-11-25 答咗：字體檔 `_fonts/lubalin-graph-book.otf`；`.mp3` 同手動指定音檔照建議；**掃描係主要資料來源**，初始資料只入 21 張專輯，歌由掃描建立；「類型」由類別帶出（D44）；專輯只有年份（D63；S-119 解決）；`cover2.png` 照收。已完成嘅 Backend 要跟進：新增 **T-101**（年份、刪 `releaseDate`／`type`，1）同 **T-102**（歌號跟檔名、可以跳號、歌 id 跟歌號，1）；T-025 改為掃描建立歌曲（3 → 3.5）；T-027 只入專輯（1.5 → 0.5）；T-050 再補畫（+0.5）、T-052 改欄位（估算不變）、T-053 掃描結果加兩類、歌號欄（4 → 4.5）。工作量 102.5 → 106。Functional Spec D60–D62、D64、D65 同 D63、D59 嘅細項係 PM 建議，照建議做（U-19，唔阻）。**以下係 v1.4（CR-005 補充：播放端設計稿第 18 版確認）嘅狀態**：**U-18 完成**：用戶 2026-11-25 確認第 18 版（第 ③ 點改咗幾輪，source commit `4e739cd`），T-045 完成；播放端設計稿唔再阻任何任務。第 ③ 點（有歌載入時揀碟 = 拎另一隻碟睇：細唱片機、歌單欄）令 T-036 變大，拆出 **T-048**（拎住另一隻碟、細唱片機，1.5）同 **T-049**（拎住嘅碟嘅歌單欄，2）；T-037 只做載入嘅碟／冇歌載入時揀中嘅碟嘅弧線歌單；T-040 加第 18 版嘅格（1.5 → 2）；全部播放端任務嘅 Mockup Binding 改為 HT 第 18 版。工作量 97.5 → 102.5。**以下係 v1.3 嘅狀態**（入面「等第 18 版確認（U-18）」已解除）：v1.3（CR-005）。跟用戶 2026-11-25 嘅 8 項決定（已確認）更新：D43、D47 確認；封面細過 1200 由管理端放大（D50）；掃描以音檔做錨（D54）；左上歌名兩行（D51）；播緊時揀碟淡出淡入（D52）；字重唔模擬粗體（D53）；兩張封面、每次開 app 隨機揀（D55、D56）。新增 T-045（播放端設計稿第 18 版，已出，commit `ae30893`，等用戶確認）、T-046、T-047、T-100；T-099 改範圍。U-14 完成；U-15 大部分答咗，剩低嘅併入 U-17。**以下係 v1.2 嘅狀態**（入面 D43、D47、D48、W-018、播緊時轉碟已答）：跟用戶 2026-11-25 嘅 5 項決定（已確認）更新：掃描連封面來源同歌曲文字檔、媒體 bucket `rb-discography`、資料夾名 `<類別>-<NN>-<id>`、字體來源、內容資料 21 個發行／291 首歌。CR-004 仍然未確認：Functional Spec D43（類別短名串法）、D44（「類型」欄）、D47（轉盤初始次序）、D48（封面尺寸）、D49（文字檔新增歌曲），同兩條播放端問題（D23 左上歌名放唔落、播緊時轉碟嘅唱臂），見 U-15。**以下係 v1.1 嘅狀態，仍然有效**：v1.0 用戶 2026-11-25 批准；v1.1 跟用戶同日嘅 14 項決定更新。**2026-11-25：Functional Spec D30–D39 用戶已確認**（「嗰 8 條跟建議」；D33 係技術決定，D35 等管理端設計稿第 2 版確認），U-12 完成。**2026-11-25：播放端設計稿第 17 版用戶已確認**（「用框入面斷行，第 17 版確認」；包埋第 16 版嘅內容），U-11 完成。仍然未確認：管理端設計稿第 2 版（U-8，連 D35）、本文件 A-7、A-8、spike 測試碟
**關聯 Spec**：Functional Spec v1.12（CR-001 至 CR-010）；Technical Spec v1.10；Spike 報告 `reports/2026-11-26_17-10_spike-report_T-011.md`
**負責人**：Project Manager + Architect Agent

## Context

用戶已確認播放端全部場景（mockup 第 15 版）同兩份 spec（D22–D29 全部接受）。呢份 plan 將 spec 拆成可以逐個交付嘅任務，定出先後、依賴同要用戶做嘅事。

Functional Spec 原本嘅分期（M0–M9）係 CR-002 之前寫嘅，有三處要調整：

| 原分期 | 調整 | 原因 |
| --- | --- | --- |
| M4、M5 寫住「mockup 確認後」 | 播放端部分已解鎖 | 收藏、播放模式、歌書已喺 mockup 確認 |
| M5 有獨立歌詞畫面同 Info | 改為「歌書」：曲詞編監唔使等歌詞，提前做 | CR-002 合併咗歌詞同 Info |
| 冇 scaffold 一期 | 加 Phase A | Repo 係空嘅 |

### v1.1（CR-003）改咗乜

| 範圍 | 改動 |
| --- | --- |
| 取消 | T-054（發佈面板）、T-080（獨立歌詞 API）、T-081（獨立歌詞編輯器）：冇草稿、冇發佈、冇獨立歌詞編輯器 |
| 改 | T-022、T-023、T-026、T-027、T-028（Backend：冇上下架、歌曲文字、每次寫入之後生成 catalog）；T-035、T-036、T-038、T-039、T-040、T-072（播放端：高身手機、刻度弧、暫停）；T-050 重開（管理端設計稿第 2 版）；T-051–T-053（R Gram 視覺語言、歌曲就地展開 + 文字框）；T-082、T-083 |
| 新增 | T-029（歌曲文字 parser）、T-096（D1 schema 跟進）、T-042（播放端已完成 code 嘅跟進）、T-043（播放端設計稿第 16 版；之後加第 17 版） |
| 工作量 | 77 → 80.5 人日（淨增 3.5）。2026-11-25 設計稿第 17 版補充：80.5 → 82（+1.5，見「工作量估算」） |
| 新嘅阻塞 | ~~播放端設計稿第 16 版確認（U-11）阻 T-036、T-038、T-042、T-072~~ ✅ 2026-11-25 第 17 版已確認，播放端設計稿唔再阻任何任務；管理端設計稿第 2 版確認（U-8）阻成個 Phase E；~~D30–D39 確認（U-12）阻 T-029、T-023、T-026、T-096~~ ✅ 2026-11-25 已確認，呢四個任務同 T-022 唔再受阻 |

任務編號唔變；取消嘅任務留喺表入面標「取消」。新任務用所屬 Phase 最後一個編號之後嘅號碼；Phase C 得返 T-029 一個空位，第二個新任務用全表最後一個編號之後嘅 T-096。

### v1.2（CR-004）改咗乜

| 範圍 | 改動 |
| --- | --- |
| 改 | T-025（掃描：連封面來源同歌曲文字檔，1 → 2.5）、T-027（seed：21 個發行、291 首歌、類別同序號、封面照 D48，1 → 1.5）、T-034（Preload：要 T-044）、T-036（22 格：字母規則由第一日起適用，估算不變）、T-040（fixture 用新資料）、T-050（管理端設計稿補畫掃描結果同專輯表格，+0.5）、T-052（類別、序號、預期資料夾名；封面處理喺瀏覽器做，2 → 2.5）、T-053（掃描結果畫面連封面同歌曲文字，2.5 → 3.5）；T-024 嘅描述改正（「兩個尺寸 WebP、抽專輯色」係管理端做，搬去 T-052） |
| 新增 | T-044（播放端字體：內建 Rokkitt、可選 bucket 字體、字體載入後重新量字；backlog B-054）、T-097（內容資料重新生成）、T-098（專輯資料模型：類別、序號、來源 ETag；資料夾規則；bucket 改名）、T-099（封面尺寸規則，等 D48） |
| 工作量 | 82 → 91.5 人日（淨增 9.5，見「工作量估算」） |
| 新嘅阻塞 | T-027 要等 T-097、T-098；T-097 要新版來源檔入咗 `_design_/`；T-025 要等 T-098；T-099 同 T-027 嘅封面部分等 D48；管理端設計稿要補畫之後先確認（U-8）；用戶上載專輯（U-13）要等 T-097 出資料夾名清單同 D43 嘅短名確認 |
| 要用戶做／答 | U-1 改寫（bucket `rb-discography`、CORS 連管理端 origin）；新增 U-13（照資料夾規則上載專輯）、U-14（可選：上載字體）、U-15（答 CR-004 嘅五條待確認同兩條播放端問題） |

新任務編號：Phase D 最後用過嘅係 T-043，所以字體任務係 T-044；Phase C 冇空位（T-020–T-029 用晒），全表最後用過嘅係 T-096，所以 Backend 三個新任務係 T-097–T-099。

### v1.3（CR-005）改咗乜

| 範圍 | 改動 |
| --- | --- |
| 改 | T-025（音檔做錨、`cover2.jpg`，2.5 → 3）、T-027（封面放大到 1200，唔再等 D48；估算不變）、T-034（開 app 時揀封面，估算不變）、T-036（播緊時揀碟淡出淡入、碟停轉、用揀中嘅縮圖；2 → 2.5；淡出部分等第 18 版）、T-037（W-018 已答，唔再受阻）、T-040（截圖對第 18 版 22 格）、T-050（補畫第二張封面、「已略過」、放大提示，+0.5）、T-052（第二張封面、放大到 1200，2.5 → 3）、T-053（掃描結果加第二張封面同「已略過」，3.5 → 4）、T-099（放寬規則取消，淨返 B-052 ① 連第二張封面，估算不變） |
| 新增 | T-045（播放端設計稿第 18 版，0.5；已出）、T-046（播放端隨機封面，0.5）、T-047（左上歌名兩行，0.5）、T-100（第二張封面：資料模型、內容檔、專輯 API，1） |
| 取消 | 冇（T-099 只係縮細範圍：放寬尺寸規則唔做，原因：用戶揀咗「細嘅自動放大到 1200」，Worker 規則唔使郁） |
| 已完成要跟進 | T-098 → T-100（第二張封面欄）；T-035 → T-046（主頁封面）、T-047（左上歌名）；T-044：唔使改 code（spec 字眼改咗） |
| 工作量 | 91.5 → 97.5 人日（+6，見「工作量估算」） |
| 等第 18 版確認（U-18） | T-036 嘅淡出部分同 22 格截圖、T-047、T-040 嘅第 18 版格。其餘部分照第 17 版做。✅ v1.4：U-18 完成，唔再等 |
| 要用戶做／答 | U-14 完成；U-15 大部分答咗；新增 U-16（字體檔名）、U-17（CR-005 帶出嘅問題，連 review S-119）、U-18（確認第 18 版） |

新任務編號：Phase D 最後用過嘅係 T-044，所以播放端三個新任務係 T-045–T-047；Backend 全表最後用過嘅係 T-099，所以係 T-100。

### v1.4（CR-005 補充：第 18 版確認）改咗乜

用戶 2026-11-25 確認播放端設計稿第 18 版（Functional Spec v1.7 §CR-005「補充：播放端設計稿第 18 版確認」）。第 ③ 點嘅確認版本（有歌載入時揀碟 = 「行去拎其他碟睇」）比 v1.3 估嘅大：多咗細唱片機、碟名下面嘅歌單欄（欄內捲動、半透明層）、「㩒一行放入機播」同「㩒細唱片機返去」兩個新動作。T-036 如果全部包埋會變成約 6 人日，超過 3 日，所以拆開。

| 範圍 | 改動 |
| --- | --- |
| 完成 | T-045（第 18 版確認；0.5 → 0.5 + 0.5：第 ③ 點多咗幾輪）；U-18 |
| 拆 | T-036 → T-036（轉碟本身：旋鈕、刻度、字母盤、22 格、滑入嘅碟、淡出淡入連左上歌名嗰部分、碟停轉、碟名跟旋鈕、返載入嘅碟淡入；2.5，不變）+ **T-048**（拎住另一隻碟、細唱片機；1.5）+ **T-049**（拎住嘅碟嘅歌單欄；2） |
| 改 | T-037（弧線歌單只做冇歌載入時揀中嘅碟同載入嘅碟；估算不變）、T-038（接「拎住嘅碟㩒一行」：舊歌停、換隊列、完整開場；估算不變）、T-040（加第 18 版嘅格同「拎另一隻碟」流程，1.5 → 2）、T-047（唔再等；估算不變） |
| Mockup Binding | 全部未完成嘅播放端任務改為 **HT 第 18 版**（已確認；包埋第 12–17 版） |
| 工作量 | 97.5 → 102.5（+5，見「工作量估算」） |
| 新嘅阻塞 | 冇。播放端設計稿唔再阻任何任務 |
| 要用戶做／答 | U-18 完成。冇新嘅阻擋性問題；兩條唔阻嘅：Functional Spec D58（細唱片機嘅邊界情況，照建議做）、歌號專輯色嘅對比（用戶知情，T-049 做完量） |

新任務編號：Phase D 最後用過嘅係 T-047，所以係 T-048、T-049（Phase D 最後兩個空位；Phase E 由 T-050 起）。

### v1.5（CR-006）改咗乜

用戶 2026-11-25 答咗 U-16、U-17（Functional Spec v1.8 §CR-006）。最大嘅改動係決定 4：「應該一開始所有嘢都係 scan folder 拎晒資料，admin 介面只係做微調」，資料庫一開始「先入 album，其他之後再補」。

| 範圍 | 改動 |
| --- | --- |
| 新增 | **T-101**（專輯只有年份、刪 `releaseDate` 同 `type`：D1、專輯 API、內容檔、validator、seed 生成 script、fixtures；1）、**T-102**（歌號跟檔名、可以跳號、可以改；刪歌唔重編；API-023 取消；新歌 id = `<專輯 id>-<NN>`；1） |
| 改範圍 | T-025（掃描**建立歌曲**、「音檔已不在資料夾」、`cover2.png`；3 → 3.5）、T-027（**只入 21 張專輯**，唔入歌、credit、封面，唔使圖片處理；1.5 → 0.5）、T-050（補畫：刪「類型」、「年份」欄、歌號欄冇拖動、掃描結果兩類；+0.5）、T-052（「類型」刪、「年份」欄；估算不變）、T-053（掃描結果「將會新增歌曲」「音檔已不在資料夾」、歌號欄取代拖動排序；4 → 4.5） |
| 已完成要跟進 | T-022、T-026、T-097、T-098、T-100 → T-101；T-023 → T-102（檔案清單見 Technical Spec v1.6「已完成嘅 code 要改嘅地方」）；T-044：code 唔使改，`VITE_FONT_URL` 嘅值已知 |
| 取消 | 冇任務取消；API-023（歌曲拖動排序）取消，喺 T-102 刪走 |
| 工作量 | 102.5 → 106（+3.5，見「工作量估算」） |
| 新嘅依賴 | T-025 要 T-102；T-027 要 T-101；T-052 要 T-101；T-053 要 T-102 |
| 要用戶做／答 | U-16、U-17 完成；新增 U-19（確認 CR-006 嘅 PM 建議，唔阻）；仍然要做：U-8（管理端設計稿第 2 版，連 CR-004、CR-005、CR-006 嘅畫面）、U-7（Vercel，連設 `VITE_FONT_URL`）、U-1（bucket CORS）、U-13（上載專輯） |

新任務編號：全表最後用過嘅係 T-100，所以係 T-101、T-102。

### v1.6（CR-007）改咗乜

用戶 2026-11-26 睇完管理端設計稿第 3 版之後改咗管理端方向（Functional Spec v1.9 §CR-007）：「admin 流程好簡單，有新 album 都係 upload 資料上 R2，portal scan」；媒體 bucket 係唯一資料來源，資料庫係索引。

| 範圍 | 改動 |
| --- | --- |
| 新增 | **T-103**（`packages/catalog`：`parseAlbumInfo()`、`formatAlbumInfo()`、`parseAlbumFolder()`、`albumOrder()`、`titleKey()`、副題 hint；1）、**T-104**（D1 同內容檔跟 CR-007；拎走專輯／歌曲嘅人手寫入 API、API-032、初始資料 seed；fixtures；2）、**T-105**（全 bucket 同步：`planFolderSync()`、API-033／034／035；3）、**T-106**（寫返 bucket：API-018／019／040／041；封面結果 API-017，吸收 T-099；1.5）、**T-055**（管理端掃描畫面：逐個資料夾、封面喺瀏覽器處理、檢查結果、移除剔選同確認；2.5）。可選：**T-107**（由參考資料生成起始 `info.txt`／`.txt`；0.5，未計入總數，用戶揀，U-20） |
| 改範圍 | T-050（第 4 版：CD 展示架、hi-fi 機面板、掃描結果、`info.txt` 文字框；+1，已出 `8fb28a7`）、T-052（專輯列表 + 專輯頁 + `info.txt` 文字框；3 → 2）、T-053（歌曲表 + 歌曲文字框寫返 bucket；4.5 → 1.5）、T-083（只留播音檔顯示時間；1.5 → 0.5）、T-028（runbook：冇 `albums.sql`，部署後喺管理端掃描一次） |
| 取消 | **T-099**（併入 T-106） |
| 已完成要改 | T-020／T-096、T-022、T-023、T-025、T-026、T-027、T-029、T-098、T-100、T-101、T-102、播放端 fixtures：保留、改寫、拎走嘅檔見 Technical Spec v1.7「已完成嘅 code：保留、改寫、拎走」。已做而作廢約 4 人日（T-022、T-023、T-102 嘅寫入 API；T-025 嘅逐項套用同手動指定；T-027 seed；T-098、T-100 嘅 PATCH 欄） |
| 播放端 | 唔受影響（只改 fixtures，喺 T-104）；進行中嘅 T-036 照做 |
| 工作量 | 106 → 113（+7，見「工作量估算」） |
| 新嘅依賴 | T-103 → T-104 → T-105 → T-106；T-055 要 T-051、T-105、T-106；T-053 要 T-106；T-052 要 T-104；管理端 UI 全部等第 4 版確認（U-8） |
| 要用戶做／答 | U-8 改為確認第 4 版；U-13 改寫（資料夾入面要放乜，連 `info.txt`）；新增 U-20（CR-007 PM 建議）、U-21（app icon）；U-19 部分作廢；A-8 建議改 |

新任務編號：全表最後用過嘅 Backend 編號係 T-102，所以係 T-103–T-107；Phase E 嘅 T-054 已取消，下一個空位係 T-055。

### v1.7（CR-008）改咗乜

用戶 2026-11-26 同主 session 逐點定案揀碟同歌單欄，播放端設計稿第 19 版（commit `ca8c52a`）逐點確認（Functional Spec v1.10 §CR-008；Technical Spec v1.8「CR-008 對技術設計嘅影響」）。最大嘅改動：歌單欄由「拎住嘅碟㩒一行播」變成「純睇」，而且冇歌載入時都出；揀歌得返一條路（碟面 → 弧線歌單 → 唱片夾）。

| 範圍 | 改動 |
| --- | --- |
| 新增 | **T-108**（揀碟歌單欄第 19 版：歌單欄純睇、`showsColumn` 規則、`openList` 守衛反轉、唱片夾播第一首、細掣同唱臂規則、`PANEL_FLOAT` 同 `LIST_FLOAT`、鬆手縮短、「已播完」；3；**進行中**） |
| 完成（已喺 T-037／T-039 修正做咗，今次寫入 spec） | 旋鈕㩒住先開（S-152，D91）、弧線歌單嘅行唔㩒得（W-051，D92）、細唱片機嘅字推上（W-045，D89）、更新規則（S-197，D93）、正式 app icon 方案 D（`beb3324`，D94）、歌號照用專輯色（S-172，D90，冇改） |
| 改 | T-038（接 `playFirst` 代替「㩒一行」；「播完」狀態畀細唱片機；估算不變）、T-040（截圖對第 19 版；2 → 2.5）、T-045（設計稿第 19 版幾輪，+0.5，已做）；T-037、T-048、T-049 加備注（部分作廢或者轉去 T-108） |
| 作廢（已做） | T-049 嘅「㩒一行即播」（`playHeldTrack`、`startHeld`、行 focus 同鍵盤、D57 例外）同 T-048 嘅「拎住嘅碟唔開弧線歌單」守衛：約 0.5 人日，已經用咗，唔再計；喺 T-108 拎走或者反轉 |
| 風險 | R-021 關閉（D57 作廢：行唔係掣；歌號顏色用戶揀咗專輯色） |
| 工作量 | 113 → 117.5（+4.5，見「工作量估算」） |
| 新嘅依賴 | T-108 要 T-037、T-048、T-049（全部 ✅）；T-040 嘅第 19 版格要 T-108；T-038 接 T-108 嘅 `playFirst`（同一個 `start` 路徑） |
| 要用戶做／答 | 新增 U-22（CR-008 實作對齊：S-157、S-161、S-164、S-166、S-181、S-183，主 session 代決定，唔阻）。開放問題加：冇拎住時播完之後算唔算已揀歌（T-038 前）；更新提示同「請打直」嘅外觀（T-041 前）。仍然未定：管理端設計稿第 4 版（U-8）、`COVER_FAILED` 點記低（backlog B-081 ③，T-055 前） |

新任務編號：全表最後用過嘅係 T-107，所以係 T-108。

### v1.8（CR-009）改咗乜

用戶 2026-11-26 喺 CR-008 之後再定幾樣嘢（原話記喺 backlog B-087，今次關閉），全部喺播放端設計稿第 20 版（commit `a335587`）確認（Functional Spec v1.11 §CR-009；Technical Spec v1.9「CR-009 對技術設計嘅影響」）。另外：用戶 2026-11-26 開咗 Vercel project（U-7）。

| 範圍 | 改動 |
| --- | --- |
| 新增 | **T-109** 版本掣（1；進行中）、**T-110** 弧線歌單同旋鈕頭尾相接（2；進行中）、**T-111** 手機打橫轉返（1.5；等 T-110）、**T-112** app icon 細尺寸同 maskable 192（0.5；進行中） |
| 改 | T-038（播完最後一首：停、唱片夾 play、3 秒後變返未揀歌、㩒 play 由第一首播；2 → 2.5）、T-010（加一項：iPhone 打橫反方向轉；測試碟 KOMOREBI；1.5 → 1.75）、T-040（第 20 版嘅格；2.5 → 3）、T-045（第 20 版幾輪，+0.5，已做）；T-039、T-041 加備注 |
| 作廢（已做） | T-039 嘅 `update-prompt`（「已有新版本／立即更新」）同 `rotate-notice`（「請打直」）：約 0.5 人日，已用咗，唔再計；喺 T-109、T-111 拎走 |
| 用戶 | **U-7 完成**：Vercel project 已開、連咗 repo，播放端網址 `https://rgram.vercel.app`；repo 嘅預設 branch 就係 session branch，所以 Vercel 自動用佢（**A-7 唔再需要**）。`VITE_FONT_URL` 喺畀用戶嘅步驟入面，但未確認設咗：T-041 檢查。第一次 Vercel build 嘅結果呢個 session 驗唔到（sandbox 去唔到 vercel.app）：**用戶確認網站開到**。U-1 剩低 ② CORS（origin：`https://rgram.vercel.app`、`http://localhost:5173`、`https://localhost:8787`；JSON 已經畀咗用戶）同 ④ 測試檔（`album-11-komorebi/`）。測試碟定咗（決定 14 = KOMOREBI） |
| 風險 | 加 R-026（iOS 網頁冇得鎖方向：打橫反方向轉嘅真機效果） |
| 工作量 | 117.5 → 125.25（+7.75，見「工作量估算」） |
| 新嘅依賴 | T-109 要 T-039、T-108；T-110 要 T-036、T-037、T-108；T-111 要 T-110（同一批手勢檔）；T-112 要 T-039；T-040 嘅第 20 版格要 T-109、T-110；T-010 只等 U-1 ②④ |
| 要用戶做／答 | 加 U-23（CR-009 PM 建議，唔阻）；spike 之後答 iOS 打橫接唔接受（R-026）；確認 rgram.vercel.app 開到 |

新任務編號：全表最後用過嘅係 T-108，所以由 T-109 開始。

### v1.9（CR-010）改咗乜

用戶 2026-11-26 喺 iPhone 試完 spike 頁（U-2 ✅），Architect 交咗 spike 報告（T-011 ✅，commit `12b259e`）。用戶同日再定：打橫改返「請打直」、旋鈕取消滑返去、臨時測試 catalog（已做）、先做後端（Worker 而家部署 + 冇設計嘅同步頁），管理端介面之後先做（Functional Spec v1.12 §CR-010；Technical Spec v1.10「CR-010 對技術設計嘅影響」）。

| 範圍 | 改動 |
| --- | --- |
| 完成 | **T-010**（spike 頁）、**T-011**（spike 報告同 `audioEngine` 介面）、**U-2**；**U-3**（D1 `r-gram`；private bucket 叫 `rb-discography-catalog`，唔係 `r-gram-catalog`）、**U-4**（Google OAuth client） |
| 取消 | **T-111** 手機打橫轉返（−1.5）：D96 撤回；未合併 branch `feature/t111-landscape` 留底參考；已用咗大約一個鐘，唔再計 |
| 新增 | **T-113** 臨時測試 catalog（0.5；已合併 `379828f`，review／QA 未做）、**T-114** Preload 旗幟用 WebGL（2.5；報告叫佢「T-113」）、**T-115** 拆走 spike 頁（0.25；報告叫佢「T-114」）、**T-116** 冇設計嘅同步頁同部署準備（2.75） |
| 改 | T-038（按報告開工；外部 store、Media Session 規則、`error`、卡住重試；2.5 → 3.25；**進行中**）、T-060（一個 `<video>`；Media Session 目標切換）、T-061（只用 gain；1.5 → 1.25）、T-062（Media Session 移入 T-038，剩續播）、T-028（第一次部署由用戶手動行；剩 workflow、`robots.txt`、還原清單；0.5 → 0.25）、T-041（拎走測試 catalog；`VITE_CATALOG_URL` 指 Worker）、T-051（scaffold 同登入搬去 T-116；2.5 → 1.75）、T-055（同步 runner 同封面處理搬去 T-116；2.5 → 1.25）；T-109、T-110 嘅字眼跟 code（backlog B-090 ①） |
| 驗收標準搬家 | T-051：「Vite scaffold、workspace 接駁、i18n 檔、Google 登入流程」→ T-116 A1、A2；T-051 剩設計外框、共用元件、登入同沒有權限嘅設計畫面。T-055：「API-033 → 逐個 API-034（`more`）」同「封面：攞原圖、裁切、1200／320、WebP、抽色、API-050 × 2 → API-017、CORS 失敗講明原因」→ T-116 A3、A4；T-055 剩面板掣同進度、分組結果畫面、移除剔選同確認（API-035）、中途閂頁唔會壞 |
| 風險 | R-001、R-003、R-026 關閉；R-002、R-004、R-005、R-006 改寫；加 R-027–R-032（spike 報告 §3） |
| 工作量 | 125.25 → 128.5（+3.25，見「工作量估算」） |
| 新嘅依賴 | T-114 要 T-034（✅）；T-115 要 T-114 + U-24 ⑥；T-116 要 T-105、T-106（✅），部署要 U-5；T-051、T-055 要 T-116；T-041 要 T-113 拎走、T-116 部署 |
| 要用戶做／答 | U-24（真機核對清單 ①–⑦）；U-25（CR-010 預設 Q1–Q6，唔阻）；U-5（部署時入三個 secret）；U-1（部署之後 CORS 加 Worker origin）；確認 OAuth redirect URI 已登記；Vercel `VITE_CATALOG_URL`：而家 `/test-catalog/catalog.json`（指引已交，未確認），Worker 部署之後改 `https://r-gram-api.dcwhung.workers.dev/catalog/v1/catalog.json` |

新任務編號：全表最後用過嘅係 T-112。**T-113 已經喺 commit 用咗**（臨時測試 catalog），所以 spike 報告講嘅「T-113 旗幟」改做 **T-114**、「T-114 拆 spike 頁」改做 **T-115**；同步頁係 **T-116**。

### 進度（2026-11-25 19:36）

| 狀態 | 任務 |
| --- | --- |
| 完成（review 同 QA 都過咗） | T-001、T-002、T-020、T-021、T-030、T-031、T-032、T-033、T-029、T-096、T-022、T-023、T-024、T-043（詳情見 v1.2 嘅進度同 `index.md`）；**T-026**（review 85 → re-review 100 / 100：`reviews/2026-11-25_15-48_review_T-026_re-review.md`；QA S1 pass：`qa/2026-11-25_15-56_qa_api-catalog.md`，新鏈 `api-catalog`）；**T-042、T-035、T-044**（review：`reviews/2026-11-25_12-18_review_T-042_T-035.md` pass 90、`reviews/2026-11-25_15-51_review_T-044_player-fixes.md` pass 90；QA S1 pass：`qa/2026-11-25_16-10_qa_player-home_player-fonts.md`，新鏈 `player-home`、`player-fonts`）。CR-005 跟進：T-035 → T-046、T-047 |
| 完成（review 90 / 100；修正 W-028、W-029、S-118、S-120、S-121 已合併 `f984022`；QA S1 pass：`qa/2026-11-25_16-43_qa_T-098_T-097.md`） | **T-098、T-097**（已實作同合併，commit `c7af11b`；review pass 90 / 100：`reviews/2026-11-25_16-27_review_T-098_T-097.md`，冇 Critical；W-028（內容檔 `category`、`categoryNo` 改為必填，主 session 決定）、W-029、S-118、S-120、S-121 修緊；S-119 要用戶答（U-17）；S-122 嘅 credit 數字已寫入 spec）。QA 等修正完。CR-005 跟進：T-098 → T-100 |
| 完成（review 100 / 100；QA S1 pass：`qa/2026-11-25_17-12_qa_T-100.md`；合併 `7afcf82`） | **T-100**（第二張封面：資料模型、內容檔、專輯 API）。Review 建議 S-123（Technical Spec 補錯誤代碼名）、S-124、S-125 入 backlog B-067 |
| 完成（review 90 / 100；QA S1 pass：`qa/2026-11-25_21-14_qa_T-046_T-047.md`；合併 `4161058`） | **T-046**（隨機封面；圖片離線 cache 歸 T-034，backlog B-071）、**T-047**（歌名兩行，W-018 已解決） |
| 完成（review 100 / 100；QA S1 pass：`qa/2026-11-25_21-30_qa_T-102_T-101.md`；合併 `df66e51`） | **T-102**（歌號跟檔名、可以跳號、取消拖動排序）、**T-101**（專輯只記年份，刪 `releaseDate` 同自由文字 `type`） |
| 完成（review 85 / 100；修正 W-033–W-035、S-135–S-137、S-139 已合併 `ab79bd3`；QA S1 pass：`qa/2026-11-25_22-46_qa_T-027_T-025.md`） | **T-027**（初始資料只入 21 張專輯；production 用 `apps/api/seed/albums.sql`，由人執行，T-028 runbook 要寫明）、**T-025**（掃描：API-030 預覽、API-031 套用、API-032 資料夾列表） |
| 完成（review 95 / 100；W-036 已修 `20afb62`；QA S1 pass：`qa/2026-11-25_23-45_qa_T-034.md`；合併 `bb18ef5`） | **T-034**（Preload、開 app 載入、圖片同歌詞離線 cache；backlog B-070、B-071、B-072 ①③ 一併完成） |
| 完成（review 95 / 100；修正 W-037、S-149、S-150、S-154 已合併 `11530f8`；QA S1 pass：`qa/2026-11-26_03-24_qa_T-036.md`） | **T-036**（轉碟；backlog B-076 一併完成）。待用戶：S-152（輕點旋鈕會開完即收） |
| 完成（用戶確認） | **T-045** 播放端設計稿第 18 版（commit `ae30893` 至 `4e739cd`；U-18，2026-11-25 確認） |
| 已交，等用戶確認 | ⚠️ v1.6：T-050 管理端設計稿**第 4 版**（commit `8fb28a7`；U-8）。第 3 版（`29309fd`）用戶 2026-11-26 睇過，由 CR-007 取代。~~T-050 管理端設計稿第 2 版（U-8；CR-004、CR-005 要先補畫）~~ |
| 完成（review 90 / 100 × 3：`reviews/2026-11-26_03-16_review_T-103_T-104.md`、`reviews/2026-11-26_04-11_review_T-105.md`、`reviews/2026-11-26_05-03_review_T-106.md`；修正已合併 `bc60977`、`231aea7`、`08509fb`；QA S1 pass：`qa/2026-11-26_05-38_qa_T-103_T-106.md`，新鏈 `api-sync`、`api-writeback`，`api-media`、`api-seed` 退役） | **T-103**（`info.txt` 同資料夾名）、**T-104**（CR-007 資料模型、拎走人手寫入同 seed）、**T-105**（全 bucket 同步，API-033–035）、**T-106**（寫返媒體 bucket、封面結果，API-017–019、API-040／041）。待用戶確認嘅預設決定同 spec 字眼：backlog B-078、B-079、B-081 |
| 完成（review 85 / 100：`reviews/2026-11-26_08-08_review_T-037_T-039.md`；修正 W-049、W-050、W-053、S-198、S-199、S-204 連用戶決定（W-051 行唔㩒得、W-045 細唱片機字推上、S-152 旋鈕㩒住先開、S-197 重新開 app 先更新）已合併 `037f901`；正式 app icon `beb3324`；QA S1 pass：`qa/2026-11-26_09-59_qa_T-037_T-039.md`，新鏈 `player-list`、`player-pwa`） | **T-037**（弧線歌單）、**T-039**（PWA 規則：manifest、更新、`robots.txt`、「請打直」）。待用戶：更新提示同「請打直」嘅外觀（設計稿冇畫）；backlog B-084、B-085。未做：用戶 2026-11-26 嘅新設計（揀碟就出歌單欄、歌單欄飄落、未有歌時嘅畫面）設計稿已出，等確認之後開新任務。⚠️ v1.7：第 19 版已確認（CR-008），新任務 **T-108** |
| 完成（review 90 / 100：`reviews/2026-11-26_13-40_review_T-108.md`；修正 W-054、W-055、S-212、S-213；QA 第一次 fail W-056（字母盤開住時唱片夾播到歌），修正後重驗 **S1 pass**：`qa/2026-11-26_14-21_qa_T-108.md`；merge `8ec9ed8`、`9be8abb`、`8b808ee`） | **T-108** 揀碟歌單欄第 19 版（Mockup：HT 第 19 版）。「已播完」只有狀態同畫面，觸發喺 T-038 |
| 完成（review 80 / 100；修正 W-042–W-045、S-175、S-177、S-179、S-180 已合併 `3730abd`；QA S1 pass：`qa/2026-11-26_05-10_qa_T-048_T-049.md`，新鏈 `player-holding`） | **T-048**（拎住另一隻碟、細唱片機）、**T-049**（拎住嘅碟嘅歌單欄）。待用戶：W-045（長歌名縮字再「…」）確認、S-172（歌號顏色對比）；backlog B-080 |
| 完成（2026-11-26；review 80 / 100 → 複審 100：`reviews/2026-11-26_15-59_review_T-109_T-110_T-112.md`；修正 W-057 至 W-060、S-217 至 S-219、S-221、S-224、S-226、S-227；QA **S1 pass**：`qa/2026-11-26_16-46_qa_T-109_T-110_T-112_T-010.md`；merge `5cbd081`、`04a34ec`、`71c5874`、`3aa32c7`、`070dd29`） | **T-109** 版本掣、**T-110** 弧線歌單同旋鈕頭尾相接、**T-112** app icon 細尺寸。用戶同日補咗一條：旋鈕取消（Esc）時，冇經過 ♥ 就滑返去，經過咗先跳（`useSeamJump` 計淨經過次數） |
| 完成（2026-11-26；T-038 review 70 → 複審 95：`reviews/2026-11-26_19-13_review_T-038.md`，修正 C-001（D109）、C-002（D110）、W-062 至 W-064、S-236、S-239 至 S-247；T-116／T-113 review 95：`reviews/2026-11-26_18-49_review_T-116_T-113.md`，修正 W-061、S-228、S-230 至 S-232、S-234、S-251；QA **S1 pass**（T-038 第一次只差 W-064，修正後重驗過）：`qa/2026-11-26_20-08_qa_T-038_T-116_T-113.md`；merge `379828f`、`8f20789`、`e3b68c5`、`3625fc8`、`5eeeaf2`、`3f66e78`） | **T-038** 真正播放（code 完成；「完成」仲差用戶真機核對 U-24）、**T-116** 冇設計嘅同步頁同部署準備（✅ **用戶 2026-11-26 已部署**：Cloudflare 連 GitHub 自動部署（Workers Builds；production branch `claude/charming-cannon-8yulp0`；build `npm ci`；deploy `npm run migrate:remote -w apps/api && npm run deploy -w apps/api`），三個 Secret 喺 dashboard 設；第一次同步（KOMOREBI）、第二次「沒有改動」、公開 `catalog.json` 用戶報告全部成功；免費計劃上限冇撞到）、**T-113** 臨時測試 catalog。**T-071**（播放模式：四個模式同模式掣）已經喺 T-038 做埋，唔再另外做。新鏈 `player-playback`、`admin-sync` |
| ~~進行中（developer 2026-11-26 開工）~~ ❌ 取消（v1.9，CR-010） | ~~**T-111** 手機打橫轉返~~：用戶試完 spike 唔接受，D96 撤回；branch `feature/t111-landscape` 留底 |
| 完成（v1.9） | ~~已交、等用戶真機試（U-2）~~ **T-010** spike 頁（用戶 2026-11-26 兩個模式試完，U-2 ✅；頁面留到 T-114 重新量完，T-115 拆）；**T-011** spike 報告（`reports/2026-11-26_17-10_spike-report_T-011.md`，`12b259e`） |
| 已合併、review 同 QA 未做（v1.9） | **T-113** 臨時測試 catalog（`379828f`；輕量） |
| 進行中（v1.9；developer 2026-11-26 開工，中途被用量上限打斷，續做緊） | **T-038** 播放（按 spike 報告）、**T-116** 冇設計嘅同步頁同部署準備 |
| 完成（2026-11-26；review T-114 100、T-070 95 → 複審 100：`reviews/2026-11-26_21-25_review_T-114_T-070.md`，修正 W-067、S-252 至 S-257；QA **S1 pass**：`qa/2026-11-26_22-09_qa_T-114_T-070.md`；merge `d1889e2`、`542a13a`、`63c11c3`） | **T-114** Preload 旗幟用 WebGL（code 完成；iPhone fps 仲要用戶用 spike 5a 重新量，U-24 ⑥）、**T-070** 收藏（用戶 2026-11-26 兩個決定同開發者嘅預設做法記喺 backlog B-093 ②，下次 CR 寫入 spec） |
| 等（v1.9） | **T-115**（等 T-114 + U-24 ⑥）；T-060（等 T-038）→ T-061；T-051、T-055（等 U-8 第 4 版 + T-116）；T-041（等 T-116 部署、拎走 T-113、`main`） |
| 可以開工 | ⚠️ v1.9：見上面兩行。⚠️ v1.8：T-040 嘅第 20 版格等 T-109、T-110。⚠️ v1.7：播放端：T-108 ✅ 完成（2026-11-26）；T-040 嘅第 19 版格可以做。⚠️ v1.6：Backend：**T-103**（即刻）→ T-104 → T-105 → T-106（T-099 取消）。播放端不變。⚠️ v1.5：Backend：**T-101、T-102**（即刻）→ T-025（要 T-102）、T-027（要 T-101）；T-099（要 T-100）。~~Backend：T-025（要 T-098、T-100；連 CR-005）；之後 T-027（要 T-097、T-098、T-026；唔再等 D48）；T-099（要 T-100）。~~播放端：T-034、T-036、T-037、T-039、T-040、T-046、T-047；之後 T-048（要 T-036）、T-049（要 T-048、T-037） |
| 仍然受阻 | ⚠️ v1.9：T-038 唔再受阻（T-011 ✅）；Phase E 嘅設計畫面（U-8）。⚠️ v1.8：~~T-038（等 spike T-011）~~；**T-010 只等 U-1 ②（CORS）④（KOMOREBI 測試檔）**（U-7 ✅、測試碟 ✅）。之前：~~T-038（等 spike T-011 同測試碟；T-010 要 U-1、U-7）~~；Phase E（U-8：第 4 版）；T-028、T-041（`main`，A-8） |

---

## 可行性評估

### 技術可行性

| 項目 | 評估 | 備注 |
| --- | --- | --- |
| 技術棧支持 | ✅ | 全部同 `dcwhung/903-player` 現用版本一樣；Backend 大部分模組可以直接移植 |
| 播放端繪圖（SVG + CSS） | ✅ | Mockup 已經用同一套做法畫晒全部場景同過場；T-033 已經將基本零件做成同一個 SVG 畫布入面嘅 React 元件（CR-003 決定 4） |
| 第三方依賴 | ⚠️ | Cloudflare（Worker、D1、R2）、Google OAuth、Vercel 都要用戶喺 dashboard 開；我喺呢個 session 試過 Cloudflare API，回「Invalid access token」，所以唔可以當我代開 |
| iOS 播放限制 | ⚠️ | 手勢解鎖、背景自動下一首、MV 音量，三樣都要真機驗證（Phase B）；結果會決定 `audioEngine` 介面 |
| 性能要求 | ⚠️ | 旗幟 canvas 同模糊濾鏡喺舊 iPhone 嘅 fps 未知（Phase B 量度；有降級方案）；單一 SVG 入面轉碟嘅 fps 要喺真機預覽量（R-005） |
| 安全要求 | ✅ | 認證、session、CORS 做法沿用 903-player；媒體公開網址係用戶已接受嘅決定（R-1） |

**總體可行性**：⚠️ 有條件可行

**條件**：① 用戶完成 dashboard 設定同上載測試媒體；② Phase B 真機結果冇推翻 `<audio>` 單一 element 嘅做法（有退路：見風險 R-001）。

### 其他維度

| 維度 | 評估 |
| --- | --- |
| 時間 | ⚠️ v1.9：約 128.5 個理想人日（CR-010 之前 125.25）。之前：約 117.5 個理想人日（CR-008 之前 113；Phase A–D 按工作量表 A + B + C + D 計約 76.5）。之前嘅寫法：約 113 個理想人日（CR-007 之前 106；CR-006 之前 102.5；第 18 版確認之前 97.5，CR-005 之前 91.5，CR-004 之前 82；見工作量；Phase A–D 即係「手機上播到歌」約 63.5，之前 61）。播放端核心（Phase D）最大，因為要將 mockup 逐個場景變成有狀態嘅元件 |
| 資源 | 前端（SVG / CSS 動畫、PWA、iOS 媒體）、Cloudflare Worker、CI；全部喺團隊 agent 能力範圍 |
| 未知因素 | Phase B 嗰三項 iOS 行為同兩項 fps；CR-003 嘅 D30–D39 已確認（2026-11-25），淨返 D35（統計項目）等管理端設計稿第 2 版。CR-004：新資料嘅 credit 配對數字（等 T-097）；一次掃描讀幾多個文字檔先唔撞 Worker 上限（T-025 核實）；5 條待確認（CR-005、CR-006：全部已答；CR-006 嘅 PM 建議見 U-19，唔阻）；~~播放端設計稿第 18 版（U-18）~~ ✅ 已確認 |

---

## 階段劃分

| Phase | 名稱 | 目標 | 對應 FR | 完成標準 | 阻塞 |
| --- | --- | --- | --- | --- | --- |
| A | 基礎 | Monorepo、共用邏輯、CI | — | `npm run lint`、`npm test`、`npm run build` 全綠；`packages/catalog` 覆蓋率 ≥ 80%；用現有 `discography.json` + `credits.json` 生成嘅 fixture catalog 通過 validator。CR-004：seed 資料換新（T-097）之後，fixture 同寫死嘅數跟住改 | 冇（已完成；T-097 跟進） |
| B | 真機 spike（M0） | 驗證 iOS 播放、MV 音量、fps | R-5、R-6、R-8 | 一份 spike 報告：五項各有「得 / 唔得 + 採用做法」；`audioEngine` 介面定案 | 用戶：~~測試媒體（**用邊張碟未定**）、Vercel（U-7）~~ ⚠️ v1.8：測試碟 = KOMOREBI ✅、Vercel ✅（U-7）；剩低 U-1 ② CORS、④ 測試檔；iPhone⚠️ v1.9：✅ 完成（T-010、T-011、U-2）；T-115 拆頁 |
| C | Backend API（M1） | 登入、專輯 / 歌 CRUD、歌曲文字、封面、掃描（CR-004：連封面來源同歌曲文字檔）、每次寫入之後生成 catalog、對外 catalog、seed；CR-004：專輯類別同序號、內容資料重新生成 | FR-101–106、108、109、114、117、120、121、123、124、126 | Worker 測試全綠；本機 seed 後 `GET /catalog/v1/catalog.json` 出到 ~~**21 個發行、291 首歌**（CR-004；之前 17、262）~~ ⚠️ CR-006：**21 張專輯、0 首歌**並通過 validator；掃描一個本機模擬嘅專輯資料夾（有跳號）之後，歌按檔名歌號建立、再掃描冇重覆；改一首歌嘅文字之後 catalog 即時跟住變；用本機模擬 bucket 掃描一個有 `cover.jpg`、`.txt`、音檔嘅資料夾，預覽啱、套用後歌曲文字入咗 D1 | T-027 等 T-097、T-098；~~T-099 等 D48~~（CR-005：T-099 要 T-100）；部署要用戶 dashboard 設定 ⚠️ CR-007 完成標準：本機模擬 bucket 放三個資料夾（一個有 `info.txt` 而有跳號同冇音檔嘅曲目、一個冇 `info.txt`、一個名唔啱格式）→ 同步 → 兩張專輯、曲目同 `info.txt` 一樣、冇音檔嘅係 `audio: null`、檢查結果啱；再同步冇改動；刪走一個音檔同一個資料夾 → 只列入待確認、確認後先改；經文字框改 `info.txt` 同一首歌嘅文字 → bucket 嘅檔變咗、catalog 跟住變；檔喺其他地方改過 → 409 |
| D | 播放端核心（M2） | 手機直度：Preload、主頁、轉碟、歌單、播放、自動下一首、PWA、i18n；CR-005：有歌載入時拎另一隻碟睇（細唱片機、歌單欄） | FR-001–011、018、025、031、032、034–044 | E2E 行通「開 app → 轉碟 → 揀歌 → 播 → 暫停 / 繼續 → 自動下一首」同「播緊 → 擰去另一隻碟 → ~~㩒歌單欄一行~~（⚠️ CR-008：㩒碟面 → 弧線歌單 → 唱片夾，或者直接㩒唱片夾播第一首）（換歌）／㩒細唱片機（返去，聲冇停）」；淨空規則測試全綠（~~連 D57 例外~~ ⚠️ CR-008：冇例外）；同 mockup 截圖比對喺容許誤差內；真機安裝得。⚠️ **CR-009**：弧線歌單同旋鈕頭尾相接；播完最後一首 3 秒後變返未揀歌；有新版本時版本掣㩒得；~~打橫手機畫面同直向一樣~~（⚠️ CR-010：打橫出「請打直」）。⚠️ **CR-010**：Preload 旗幟真機 ≥ 30 fps（T-114）；用戶 U-24 ①②③⑤ 真機核對 | 設計稿：冇（第 18 版用戶 2026-11-25 已確認，U-18 完成；包埋第 17 版）；B 嘅結論（只阻 T-038） |
| E | 管理端 UI | 管理介面 | FR-101–106、114、117、119、120–124 | 管理端 E2E：登入 → 改專輯（連類別、序號）→ 上載封面 → 掃描（套用封面來源同歌曲文字）→ 改一首歌嘅文字並儲存 → catalog 已更新 | **管理端設計稿第 2 版要用戶確認（U-8）；CR-004：要先補畫** ⚠️ CR-007：E2E 改為：登入 → 掃描（新增專輯、封面處理、檢查結果）→ 確認移除 → 改 `info.txt` → 改一首歌嘅文字（寫返 bucket）→ catalog 已更新；等第 4 版確認（U-8） |
| F | MV 同系統整合（M3） | MV 電視、鎖屏控制、續播 | FR-012、014、015、026、038（電視） | E2E：播歌 → MV → 熄機 → 人手續播；真機鎖屏控制得 | D |
| G | 收藏、播放模式、歌書（M4） | 心形、Favourites 碟、四個模式、歌書（曲詞編監） | FR-016、023、024、030、033（credit）、038（歌書） | 隊列純函數測試覆蓋四個模式；收藏重開 app 仍然喺度；歌書開住時暫停，歌書留住 | D（T-072 嘅畫面已確認，U-11 完成） |
| H | 歌詞（M5） | 歌書歌詞；批量匯入、由同名歌帶入、音檔對時 | FR-033（歌詞）、036、110、112、118 | 喺管理端貼入有時間標記嘅歌詞 → 儲存 → 播放端歌書跟住歌行，太長嘅行喺框入面斷行；貼入冇時間標記嘅歌詞 → 歌書一次過顯示成份歌詞（直身一欄），可以上下捲 | E（T-083）；T-082 嘅兩個歌詞版面已確認（設計稿第 17 版，U-11 完成；D22、D38 喺第 17 版修訂） |
| I | iPhone Duo（M6） | 版面 | FR-027 | 截圖比對：手機版零改變 | **P-7 mockup** |
| J | HomeView（M7） | 版面 | FR-028 | 同上 | **P-7 mockup** |
| K | 電腦（M8） | 版面 | FR-029 | 同上 | **P-7 mockup** |
| L | P2 項目（M9） | 手勢開轉碟、拖動進度、歌詞跳句、對時工具 | FR-019–021、115 | 到時再拆 | 部分要先出 mockup |

---

## 任務分解

Mockup Binding 縮寫：**HT** = `_mockups_/home-turntable/index.html`（source：`src/template.html`；⚠️ v1.8：**第 20 版用戶 2026-11-26 已確認**（commit `a335587`；之前一輪 `6e0bf51`），係播放端嘅 Design Source，包埋第 12–19 版；T-109、T-110、T-038（播完最後一首）、T-040 綁第 20 版；~~T-111 唔使設計稿（畫面同直向一樣）~~（⚠️ v1.9：T-111 取消）；其餘未完成嘅播放端任務嘅格喺第 20 版冇改。⚠️ v1.7：**第 19 版用戶 2026-11-26 已確認**（commit `ca8c52a`），係播放端嘅 Design Source，包埋第 12–18 版；T-108、T-040、T-038 綁第 19 版，其餘未完成嘅播放端任務嘅格喺第 19 版冇改。⚠️ v1.4：**第 18 版用戶 2026-11-25 已確認**（source commit `4e739cd`），係播放端嘅 Design Source，包埋第 12–17 版嘅內容；全部未完成嘅播放端任務綁第 18 版。下表寫「HT 第 18 版」嘅係第 16–18 版加入或者改過嘅格；已完成任務（T-042、T-043）保留當時綁嘅第 17 版做記錄）；**AD** = `_mockups_/admin/index.html`（source：`src/template.html`；**第 2 版等確認**）；**v16** = `_mockups_/r-gram/index.html`（motion preview，只用旗幟同金屬質感）。

「CR-003」欄：空白 = 冇變；✅ = 已完成。v1.2：CR-004 嘅改動同進度都寫喺同一欄，標「CR-004」。

### Phase A — 基礎

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Monorepo scaffold：workspaces、TypeScript、ESLint、Prettier、Vitest projects、`.gitignore`、project `CLAUDE.md`（QA chain、指令、branch 模式）；`data/` 搬去 `apps/api/seed/`；`ci.yml` | chore | DevOps + Architect | none-required | 1 | — | P0 | ✅ |
| T-002 | `packages/catalog`：catalog 型別同 validator（連 credit）、`wheelKeyFor`、`dominantColor` / `glowColor`、LRC parser、`matchMediaFiles`、`matchCredits`；由 seed 資料生成 fixture catalog | feature | Backend | none-required | 2 | T-001 | P0 | ✅（跟進：T-029；CR-004：T-097 改寫死嘅數、T-098 改 schema、T-025 改 `matchMediaFiles`） |

### Phase B — 真機 spike

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-010 | Spike 頁（用完即棄，唔入產品）：① 手勢入面靜音解鎖、1.5 秒後出聲 ② 鎖屏下同一個 `<audio>` 自動下一首 ③ Media Session ④ `<video>` 經 Web Audio 調音量（連 CORS）⑤ 旗幟 canvas 同模糊濾鏡 fps。⚠️ **v1.8（CR-009）**：⑥ 手機打橫反方向轉（D96）：喺真 iPhone 試瀏覽器分頁同加咗落主畫面兩種：系統轉嘅過場（約 0.3 秒）、有冇閃、狀態列同底部指示條位置、轉返之後拖動同㩒掣方向啱唔啱（spike 頁做一個最簡單嘅反方向轉舞台，唔等 T-111）。測試碟 = **KOMOREBI**（`album-11-komorebi`）。每項畫面上顯示結果 | chore | Frontend | none-required | 1.75 | T-001、用戶 U-1 ②④（~~U-7~~ ✅） | P0 | 改：放喺 Vercel（決定 13；`https://rgram.vercel.app`）；~~測試碟未定（決定 14）~~ ✅ KOMOREBI（CR-009）。**v1.8**：加 ⑥（1.5 → 1.75）；只等 U-1 ② CORS、④ 測試檔。✅ **v1.9：完成**（merge `5adccb5`；用戶 2026-11-26 喺 iPhone 兩個模式試完，U-2 ✅）；spike 頁留到 T-114 重新量完，T-115 拆走 |
| T-011 | Spike 報告（`.proj-docs/`）同 `audioEngine` 介面定案 | docs | Architect | none-required | 0.5 | T-010、用戶 U-2 | P0 | ✅ **v1.9：完成**：`reports/2026-11-26_17-10_spike-report_T-011.md`（commit `12b259e`）；經 CR-010 寫入 spec |
| T-115 | **拆走 spike 頁**（CR-010；backlog B-090 ③；spike 報告叫「T-114」）：拆晒下面「T-115 清單」列嘅嘢 | chore | Frontend | none-required | 0.25 | T-114 合併、部署，用戶用 spike 5a 重新量完（U-24 ⑥） | P1 | **新（CR-010）**；**等 T-114**。QA 鏈：`player-pwa`、`repo-scaffold`、`player-foundation`；`player-spike` 退役（frozen plan 標退役、ledger 嗰啲行） |

### Phase C — Backend API

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-020 | Worker scaffold：Hono、`wrangler.toml`、env 驗證、D1 migration（6 張表）、workerd 測試環境、health | chore | Backend | none-required | 1 | T-001 | P0 | ✅（schema 跟進：T-096；CR-004：T-098） |
| T-021 | 認證：Google OAuth（PKCE）、email 白名單、session cookie、middleware、登出 | feature | Backend | none-required | 1 | T-020 | P0 | ✅ |
| T-022 | 專輯 API：CRUD、排序、每張專輯嘅完整度 + 全站統計（FR-114）；刪除有 ID 守衛（`?force=1`）。**冇上下架** | feature | Backend | none-required | 1 | T-020、T-002、T-096 | P0 | 改；✅ 完成（review 85 → re-review 100 / 100；QA S1 pass）。統計項目照 D35 嘅建議做咗（D35 等 U-8，有改就細改 API-010）。CR-004 跟進：T-098（類別、序號、資料夾規則） ⚠️ **CR-007**：寫入部分（API-011／013／014／015）喺 T-104 拎走；列表同單張保留 |
| T-023 | 歌曲 API：新增（body 係歌曲文字）、刪除（ID 守衛）、排序（歌號 = 次序）、參考欄同手動指定檔案；歌曲文字讀寫（API-040、API-041：`parseSongText()` → 歌名、副題、credit、歌詞一次過寫入，連歌詞 JSON 寫 R2）。**冇上下架** | feature | Backend | none-required | 2 | T-022、T-029 | P0 | 改（1.5 → 2；吸收 T-080）；✅ 完成（review 95 / 100；QA S1 pass，新鏈 `api-tracks`） ⚠️ **CR-007**：API-020／021／022／024 喺 T-104 拎走；歌曲文字讀寫改為 bucket（T-106）；儲存函數重用 |
| T-024 | 封面：上載、驗證（宣稱類型同內容一致、圖嘅結構、1200 或者 320 嘅正方形）、內容 hash 檔名、公開圖片 route（API-071）。~~兩個尺寸 WebP、抽專輯色~~：CR-004 改正，呢兩樣喺管理端瀏覽器做（Worker 冇圖片編解碼），屬 T-052 | feature | Backend | none-required | 1 | T-022 | P0 | ✅ 完成（review 100 / 100；QA S1 pass，新鏈 `api-assets`）。CR-004：描述改正（T-024 review S-088）；尺寸規則跟進 T-099（等 D48） |
| T-025 | 掃描 R2：list、配對、衝突、手動指定（套用後即時生效）。**CR-004**：分類加封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`）（`packages/catalog/scan`）；預覽（API-030）：封面只比 ETag（`albums.cover_source_etag`）；歌曲文字 ETag 變咗先讀檔（大細上限同 API-041）→ `parseSongText()` → 同已儲存內容比較，逐個檔回 `new`／`replace`／`same`、歌名變更、會唔會清歌詞、逐行錯誤；套用（API-031）：只做確認咗嘅項目，歌曲文字行 API-041 同一個儲存函數（`LYRICS_REMOVED` 要 `force`），記低 `text_source_etag`；封面唔經 Worker 套用（管理端做，T-053）；`_` 開頭嘅資料夾唔當專輯；核實一次請求可以讀幾多個檔，超過就分批。D49 確認咗先做「歌號接住歌單就新增歌曲」。**CR-005**：音檔做錨（冇音檔嘅歌號，`.txt`、MV 入 `skipped`，`NO_AUDIO`；`.mp3` 同手動指定音檔照建議算有音檔，U-17）；讀 `cover2.jpg`（冇第一張 = `NO_FIRST_COVER`）；套用時再驗音檔。**CR-006（掃描係主要資料來源，Functional Spec D59–D62、D65、FR-126）**：`.mp3`、手動指定音檔、`cover2.png` 定案；預覽加 `newTracks`（有音檔而未有嗰個歌號：歌號跟檔名、可以跳號；歌名由 `.txt`，冇就 `titleFromFileName()`；`.txt` 錯誤）、`audioMissing`（記住嘅音檔喺資料夾冇咗；同歌號改名 = `replace`）、`manualMissing`（提示）；套用加 `create`（建立歌：id `trackIdFor()`、撞咗隨機；文字行 API-041 嘅 store 函數；`.txt` 有錯照建立、文字唔套用）同 `clearAudio`（只清音檔連結，**永遠唔刪歌**）；`create` 分批（`SCAN_APPLY_MAX_ITEMS`）；「D49 新增歌曲」由 D60 取代 | feature | Backend | none-required | 3.5 | T-023、T-098、T-100、**T-102** | P0 | **改（CR-004）**：1 → 2.5；**CR-005**：2.5 → 3；**CR-006**：3 → 3.5 ⚠️ **CR-007**：預覽同逐項套用由 T-105 嘅同步取代；分類、列檔、讀文字檔嘅 code 重用 |
| T-026 | Catalog 生成：`rebuildCatalog()` 做成每個成功寫入請求嘅後置步驟、`catalog_state`、生成失敗嘅狀態同重試（API-061）；對外 `/catalog/v1/*`（ETag、CORS 限播放端網域）。**冇草稿、變更摘要、警告、發佈記錄** | feature | Backend | none-required | 1 | T-023、T-024 | P0 | 改（1.5 → 1）；✅ 完成（review 85 → re-review 100 / 100；QA S1 pass，新鏈 `api-catalog`） |
| T-027 | ⚠️ **CR-006 改範圍（Functional Spec D59）：只入 21 張專輯**（`discography.json` 嘅 `albums[]`：id、碟名、Wheel 字母、類別、序號、年份、唱片公司、次序；專輯色中性灰；`folder`、封面欄 NULL）；`INSERT … ON CONFLICT (id) DO NOTHING`（重跑唔蓋走管理端改過嘅）；同類別序號撞咗就跳過並報告；之後生成一次 catalog。**唔入歌、唔入 credit、唔下載封面**（唔使圖片處理依賴）。以下係之前嘅範圍（作廢，只留做記錄）：~~Seed script：歌單 + credit + 下載封面，可重複執行；匯入後全部專輯同歌即刻入 catalog（seed 之後生成一次）。**CR-004**：資料係 T-097 重新生成嘅 21 個發行、291 首歌；寫入 `category`、`category_no`（`folder` 留 NULL = 預期資料夾名）；封面 ~~照 D48~~ **照 D50（CR-005）**：script 置中裁正方形，細過 1200 就放大到 1200，再出 320 縮圖（要揀一個 Node 用得嘅圖片處理方法；新依賴要過 `npm audit`、唔用 GPL），完成後列出放大咗同冇封面嘅專輯；初始資料冇第二張封面~~ | feature | Backend | none-required | 0.5 | T-022、T-026、T-097、T-098、**T-101** | P0 | 改；**CR-004**：1 → 1.5；CR-005：估算不變；**CR-006**：1.5 → 0.5（只入專輯） ⚠️ **CR-007：作廢**（Functional Spec D79）：seed 喺 T-104 拎走；專輯由資料夾建立 |
| T-028 | `deploy-api.yml` 同第一次部署；Worker `robots.txt`（backlog B-021）；D1 時間點還原寫入操作清單（R-011）；CR-004：`wrangler.toml` 嘅 `MEDIA_BASE` 填 `rb-discography` 嘅公開網址 | chore | DevOps | none-required | 0.25 | T-026、T-116、用戶 U-6、`main`（A-8） | P0 | 改 ⚠️ CR-007：runbook 冇 `albums.sql`；部署之後登入管理端掃描一次（要 T-055；見 A-8）；production 驗 `If-None-Match: *` 寫新檔（backlog B-060 ②）。⚠️ **CR-010（v1.9）**：第一次部署改由用戶喺自己電腦手動行（T-116 嘅指引第 2 部分；agent 唔部署），部署之後喺冇設計嘅同步頁同步（唔使等 T-055）；B-060 ②（真 R2 嘅 `If-None-Match: *`）同 Workers 每個請求嘅操作上限（B-074 ④）喺嗰次部署驗。呢度剩：`deploy-api.yml`（要 U-6）、Worker `robots.txt`（B-021）、D1 時間點還原寫入操作清單（R-011）；0.5 → 0.25 |
| T-029 | `packages/catalog` `song-text/`：`parseSongText()`、`formatSongText()`、round-trip 測試；歌詞 JSON 加 `synced` 同純文字路徑；長度上限常數（backlog B-006） | feature | Backend | none-required | 1 | T-002（D31、D32、D37 ✅ 2026-11-25 已確認） | P0 | **新**；✅ 完成（review 95 / 100；QA S1 pass） |
| T-096 | D1 schema 跟 CR-003（跟進 T-020）：刪 `albums.enabled`、`tracks.enabled`；`publishes` → `catalog_state`；`lyrics.lrc` → `source` + `synced`；改 `test/schema.test.ts`、`test/applyMigrations.ts`。未部署過，建議直接改 `0001_init.sql` | fix | Backend | none-required | 0.5 | T-020（D30、D32 ✅ 2026-11-25 已確認；`lyrics.lrc` → `source` 係技術決定 D33，唔使確認） | P0 | **新**；✅ 完成（review 95 / 100；QA S1 pass） |
| T-097 | **內容資料重新生成**（CR-004 決定 5）：新版 `rubberband-discography.html`、`rubberband-credits.html`（2026-11-25）放入 `_design_/`；補 `_design_/tools/parse_discography.py`（而家冇生成 `discography.json` 嘅 script），`parse_credits.py` 嘅日期字串唔好寫死；重新生成 `apps/api/seed/discography.json`（21 個發行、291 首歌；每個發行有 `category`、`categoryNo`；已有 16 個 id 不變；5 個新發行嘅 id 用明確對照表；`order` 照 D47）同 `credits.json`（21 個發行、252 行）；`packages/catalog` seed 型別加欄；改寫死嘅數（`seed.node.test.ts`、`songText.node.test.ts`、`wheelKeyFor.test.ts`、播放端 `seedCatalog.node.test.ts`）。**交付**：新嘅 credit 配對數字（直接對到／靠同名歌補／冇）、21 個發行嘅 id 同資料夾名清單（畀用戶，U-13）。**結果（review S-122）**：291 首入面 246 首直接對到、0 首靠同名歌補、45 首冇（39 首《逆流大叔》原聲配樂、4 首 KOMOREBI 未公佈、JUNTOS 第 5 首、Ciao 2021 Live 第 1 首）；credit 檔 21 段、252 行 | chore | Backend | none-required | 1.5 | T-002；新版來源檔入咗 repo；D43、D47 ✅ 2026-11-25 已確認（CR-005） | P0 | **新（CR-004）**；已實作同合併（`c7af11b`）；**review pass 90 / 100，修正進行中**（`reviews/2026-11-25_16-27_review_T-098_T-097.md`）；S-119（終於好天氣冇完整發行日期）~~等用戶（U-17）~~ ✅ CR-006 D63：年份由唔完整日期攞（2016），喺 T-101 改 script。CR-006：生成嘅歌單同 credit 留做參考資料（D64），唔入資料庫 |
| T-098 | **專輯資料模型同 bucket 改名**（CR-004 決定 2、3、5）：D1 `albums` 加 `category`、`category_no`、`cover_source_etag`，`tracks` 加 `text_source_etag`（未部署過，直接改 `0001_init.sql`；連 `test/schema.test.ts`）；`packages/catalog`：`RELEASE_CATEGORIES`、`expectedFolder()`、內容檔專輯加 `category`、`categoryNo`（validator 連測試）；專輯 API：新欄嘅驗證同讀寫、同類別序號唔重覆、新增時預設序號、回應加 `expectedFolder`、`folder` NULL = 預期資料夾名、`folder` 唔收 `..` 同 `_` 開頭（backlog B-045 ①、B-049 ②）；`buildDocument`、fixtures；`apps/api/wrangler.toml` bucket 名改 `rb-discography`（binding `MEDIA` 不變）、`.dev.vars.example` 加 `MEDIA_BASE` 註解、五處註解改名 | fix | Backend | none-required | 1 | T-022、T-096；D43 ✅ 已確認（CR-005）；~~D44 未答 = `type` 保留~~ D44 ✅ 定案（CR-006）：`type` 喺 T-101 刪走 | P0 | **新（CR-004）**；已實作同合併（`c7af11b`）；**review pass 90 / 100，修正進行中**（W-028：內容檔 `category`、`categoryNo` 改為必填；W-029、S-118、S-120、S-121）。CR-005 跟進：T-100 |
| T-099 | **封面欄位對尺寸**（backlog B-052 ①）：PATCH 專輯時 `cover`／`cover2` 一定係 1200、`thumb`／`thumb2` 一定係 320，大封面同縮圖唔會調亂（`assets` 加尺寸欄或者驗證時讀檔頭量）。~~API-050 大封面收 640 至 1200~~：**CR-005 取消呢部分**，原因：用戶揀咗 D50「細嘅自動放大到 1200」，Worker 嘅尺寸規則唔使改 | fix | Backend | none-required | 0 | T-024、T-100 | P0 | **新（CR-004）**；**CR-005 改範圍**（放寬規則取消；加第二張封面兩個欄），估算不變；唔再等用戶 **CR-007：取消**，併入 T-106（API-017 對位） |
| T-100 | **第二張封面：資料模型、內容檔、專輯 API**（CR-005 決定 8，Functional Spec D55；跟進 T-098）：D1 `albums` 加 `cover2`、`thumb2`、`cover2_source_etag` 同 CHECK（未部署，直接改 `0001_init.sql`，連 `test/schema.test.ts`）；`packages/catalog`：`CatalogAlbum` 加可選 `cover2`、`thumb2`，validator 收舊 document、成對、要有 `cover`；專輯 API（API-010、012、013）三個新欄嘅驗證同讀寫；`buildDocument`、fixtures（API 同播放端）；語言檔訊息。冇第二張專輯色 | fix | Backend | none-required | 1 | T-098（修正合併之後） | P1 | **新（CR-005）** |
| T-101 | **專輯只有年份、冇「類型」**（CR-006；Functional Spec D63、D44；跟進 T-022、T-026、T-097、T-098、T-100）：D1 `albums` 刪 `release_date`、`type`（直接改 `0001_init.sql`，連 `test/schema.test.ts`）；`packages/catalog`：`CatalogAlbum`、`SeedAlbum` 刪 `releaseDate`、`type`，validator 刪日期檢查，加 `YEAR_MIN`／`YEAR_MAX`；專輯 API（API-010–013）：刪兩個欄、`year` 直接改（`INVALID_YEAR`）、刪 `yearOf()` 同「日期帶年份」；`buildDocument`、`snapshot`；`_design_/tools/parse_discography.py`：年份由日期頭四位（`2016-06` → 2016，review S-119），輸出刪 `releaseDate`、`type`，連 `test_seed_tools.py`，重新生成 `discography.json`（要人手跑 `python3 -m unittest discover -s _design_/tools`）；fixtures（API、`packages/catalog`、播放端）；語言檔。播放端 `InfoBlock` 唔使改 | fix | Backend | none-required | 1 | T-098、T-100（✅） | P0 | **新（CR-006）**。改到已凍結嘅鏈：`api-albums`、`api-catalog`、`api-auth`（schema）、`catalog-core`、`seed-tools`、`player-catalog` ⚠️ CR-007：年份規則重用喺 `parseAlbumInfo()` |
| T-102 | **歌號跟檔名、歌 id 跟歌號**（CR-006；Functional Spec D60、D61；跟進 T-023）：歌號 1 至 999、可以跳號；API-022 刪歌唔重編（刪 `COMPACT_SQL`）；**API-023 取消**（route、`writeTrackOrder()`、測試）；API-020 收 `no`（冇畀 = 最大 + 1；撞咗 409 `NUMBER_TAKEN`）；API-021 可以改 `no`；新歌 id = `trackIdFor(albumId, no)`（由 `packages/catalog/seed` 搬去共用），撞 PK 先用 `newTrackId()`；D1 加 `no` 範圍 CHECK（可選）；語言檔、fixtures、`sessionGuard` 測試 | fix | Backend | none-required | 1 | T-023（✅） | P0 | **新（CR-006）**。改到已凍結嘅鏈：`api-tracks`、`api-auth`（schema）、`catalog-core` ⚠️ CR-007：歌號範圍同 `trackIdFor()` 重用；API-020／021 嘅歌號部分喺 T-104 拎走 |
| T-103 | **`info.txt` 同資料夾名**（CR-007；Functional Spec D67、D68、D69、D72）：`packages/catalog/src/album-info/`：`parseAlbumInfo()`（寬鬆，只出檢查結果）、`formatAlbumInfo()`（round-trip）、常數同標籤別名；`schema/releaseCategory.ts` 加 `parseAlbumFolder()`、`albumOrder()`；`sync/titleKey()`；`classifyFile()` 加 `info.txt`；`song-text`：`副題` 唔再輸出、hint `SUBTITLE_IGNORED`；全部有 unit test | feature | Backend | none-required | 1 | T-101、T-102（✅） | P0 | **新（CR-007）**。改到已凍結嘅鏈：`catalog-core`、`catalog-song-text` |
| T-104 | **資料模型同內容檔跟 CR-007；拎走人手寫入**（Technical Spec v1.7「資料模型」「已完成嘅 code」）：`0001_init.sql`（`albums` 刪 `label`／`wheel_key`／`sort_order`，加 `info_etag`、`checks`，`folder` NOT NULL UNIQUE；`tracks` 刪 `subtitle`、手動指定、參考欄，加 `text_key`）連 schema 測試；內容檔刪 `label`、`subtitle`，`buildDocument` 計 `wheelKey` 同次序；拎走 API-011／013／014／015／020／021／022／024／032／043、`albums/validate.ts`／`fieldRules.ts`／`order.ts`、`tracks/albumTrackRoutes.ts`／`fieldRules.ts`、初始資料 seed（`src/seed/*`、`scripts/seed*.mjs`、`seed/albums.sql`、`planAlbumSeed`）同佢哋嘅測試；API-010、API-012 唯讀形狀同統計（第 4 版四個錶）；fixtures（API、`packages/catalog`、播放端） | refactor | Backend | none-required | 2 | T-103 | P0 | **新（CR-007）**。改到已凍結嘅鏈：`api-albums`、`api-tracks`、`api-media`、`api-seed`（拎走）、`api-catalog`、`api-auth`（schema）、`catalog-core`、`player-catalog` |
| T-105 | **全 bucket 同步**（CR-007；Functional Spec D70、D73、D76、D77、FR-127、FR-130、FR-131；Technical Spec「同步嘅設計」）：`packages/catalog/src/sync/planFolderSync()`（由 `planScan()` 改；重用 `classifyFile`、`groupFiles`、`titleFromFileName`、`trackIdFor`）；Worker：API-033（bucket 第一層）、API-034（一個資料夾：自動新增更新、`.txt` 分批讀、`albums.checks`、`pendingRemovals`、`coverJobs`）、API-035（確認咗嘅移除，逐項再對；清歌詞檔，backlog B-048）；重用 `listing.ts`、`songTextFile.ts`、`saveSongText()`、`putLyrics()`、`insertNumbered()`、`applyGuard`；拎走 API-030／031 嘅逐項揀同 `applyShape.ts`；操作上限常數（`SYNC_REMOVALS_MAX`） | feature | Backend | none-required | 3 | T-104 | P0 | **新（CR-007）**；取代 T-025 嘅預覽同套用。新鏈（建議 `api-sync`，取代 `api-media`） |
| T-106 | **寫返媒體 bucket、封面結果**（CR-007；Functional Spec D74、D75、FR-128、FR-129）：API-018／019（`info.txt` 讀寫）、API-040／041（歌曲文字讀寫 bucket；`NO_AUDIO`、`LYRICS_REMOVED`、版本前提 → `STALE`）；寫入只限兩種 key、`onlyIf`、冇 delete（測試鎖住）；寫完同步嗰個資料夾；API-017 封面結果（來源 ETag、1200／320 對位 = 原 T-099 同 backlog B-052 ①、第二張要有第一張 = B-067 ②）；`wrangler.toml` 註解 | feature | Backend | none-required | 1.5 | T-105 | P0 | **新（CR-007）**；吸收 T-099 |

### Phase D — 播放端核心（手機直度）

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-030 | 播放端 scaffold：Vite + PWA plugin；`tokens.css`、`config/motion.ts`；i18n（`zh-Hant.ts`、有型別 `t()`、書面語測試、寫死文字測試）；舞台縮放（1080 × 1920）；`layouts/phone.ts` 幾何資料表 + 淨空規則測試 | feature | Frontend | mockup: HT（常數表、量度表） | 2 | T-001 | P0 | ✅（跟進：T-042） |
| T-031 | Catalog loader：fetch、驗證、本機 fallback；selectors | feature | Frontend | none-required | 1 | T-002、T-030 | P0 | ✅（review 100 / 100；QA S1 pass）；CR-004：`seedCatalog.node.test.ts` 寫死嘅 17 由 T-097 改 |
| T-032 | 場景狀態機 `stageReducer`（純函數）：`preload → home ⇄ discChange`、`home ⇄ list`、overlay `mv`｜`booklet`；每個轉換有「冇動畫」路徑 | feature | Frontend | none-required | 1 | T-030 | P0 | ✅（review 100 / 100；QA S1 pass） |
| T-033 | 基本元件：金屬面、螺絲、金屬掣同 icon、轉盤、空心碟、固定唱片夾（四個狀態）、唱臂 | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 2.5 | T-030 | P0 | ✅（review 100 / 100；QA S1 pass；唱臂跟進：T-042） |
| T-034 | Preload：旗幟 canvas、真實載入進度（內容檔、當前專輯封面、字體；CR-004：字體一項有逾時，bucket 字體失敗唔卡住）、App 名 / 非官方 / 版本；catalog 遲到都要離開 Preload（review S-078：`useHome` 要有 `preloadDone` 嘅入口）。**CR-005**：第一次攞到 catalog 時叫 T-046 嘅 `pickCoverVariants()` 揀一次封面（放記憶體，唔寫本機儲存），預載揀中嗰張 | feature | Frontend | mockup: HT 第 18 版「Preload」+ v16（旗幟） | 1.5 | T-031、**T-044**（✅）、T-046 | P0 | 改（CR-004）：加依賴 T-044，估算不變；CR-005：加 T-046，估算不變 |
| T-035 | 主頁：左上資訊、三粒細掣嘅狀態、版本號、`fitText`；高身手機：左上資訊同版本號入「貼頂」組（FR-039）；取代暫時外殼 `TurntableShell.tsx`；`Disc` 以專輯 id 做 `key`；唱片夾同歌號跟播緊嗰首（backlog B-029、B-030） | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 1.5 | T-032、T-033 | P0 | 改；✅ 完成（review pass 90 / 100；QA S1 pass，鏈 `player-home`）。W-018 用戶已答（D51）→ 跟進 T-047；主頁封面跟進 T-046 |
| T-036 | 轉碟：旋鈕、刻度、♥ 位置、字母盤（連過場）、其他碟滑入、指針；**刻度弧固定、專輯平均分佈**，格數跟專輯數自動生成，字母盤打開總時間固定 0.5 秒；**碟多時字母盤嘅字母規則**（`dialShowsLetter`：18 格或以下每格都出字母；再多每 N 格先出一個、最多約 9 個，其餘出細點；揀中嗰格永遠出字母；D28）。**v1.4（第 18 版確認）範圍**：22 格（`SCALE`、`DIAL_KEYS`）；有歌載入時擰旋鈕：唱臂、三粒細掣**同左上歌名嗰部分**（音量條、歌名、心形、「第 nn 首」同時間）淡出，只留碟名同年份（info block 拆開兩層）；碟停轉；聲照播；左上碟名同年份跟旋鈕；轉返載入嘅碟鬆手淡入返、唔行開場；新 scene token `chromeFadeMs`（= 設計稿 `SWAP_FADE_MS`；連 `motion.test.ts`、`tokens.node.test.ts`）；減少動態效果即時；轉盤嘅碟用 T-046 揀中嘅縮圖。**唔包**：指住另一隻碟時嘅細唱片機同歌單欄（T-048、T-049） | feature | Frontend | mockup: **HT 第 18 版**「刻度格數」「轉碟中」「播緊時揀碟」+ 互動格 | 2.5 | T-035、T-042（✅）、T-046 | P0 | 改；第 17 版加字母規則（估算不變）。**CR-004**：22 格，字母規則由第一日起行。**CR-005**（D52；2 → 2.5）：淡出淡入、碟停轉。**v1.4**：第 18 版已確認，唔再等；「喺另一隻碟鬆手 = 唱臂泊位、唔顯示歌名」作廢，改為拎住嗰隻碟（拆去 T-048、T-049）；連左上歌名嗰部分淡出（估算不變，因為拎住嘅部分已拆走）。關閉 backlog B-059 |
| T-037 | 歌單：`arcRows`、框線、捲動手勢、灰色行、㩒暗位收返。**v1.4（第 18 版確認）**：弧線歌單只用喺**冇歌載入時揀中嘅碟**同**載入嘅碟**（主頁㩒碟面）；拎住嘅碟唔開弧線歌單（T-048 嘅守衛，T-049 嘅歌單欄）。「一行截短加『…』」嘅函數寫成共用，T-049 用。**CR-006**：歌號可以跳號（D60），歌單顯示 `track.no`，唔好用位置 | feature | Frontend | mockup: HT 第 18 版「歌單（㩒碟面）」「歌單（專輯未有歌）」 | 1.5 | T-035 | P0 | 加：冇歌專輯嘅空狀態「尚未有歌曲」（D39 已確認）。CR-005：W-018 已答（D51，左上兩行由 T-047 做），唔再受阻；歌單開住時下面嘅掣要收起 focus（review S-074，T-035 已修）。v1.4：範圍寫清楚（只限載入嘅碟／冇歌載入），估算不變。✅ 完成（review 85；QA S1 pass，鏈 `player-list`）。⚠️ **CR-008**：行唔㩒得（W-051，D92）已喺修正做咗；「拎住嘅碟唔開弧線歌單」作廢（拎住嘅碟都開，D84）、由歌單欄飄落弧線（`LIST_FLOAT`）：T-108 做 |
| T-038 | 播放：`audioEngine`（按 T-011 定案）、隊列純函數（先做順序）、自動下一首、落針、碟轉、進度圈、時間；**暫停 = 唱針升起、唱臂留喺碟上面，繼續即刻續播**（FR-040；播放 store 記暫停原因）；接上 T-042 嘅唱針開場：由泊位開始播先行，唱針放低嗰刻出聲，小燈同碟之後先著、先轉。**v1.4**：真播放 store 保留 `albumId`（載入嘅碟）；接 T-049 嘅「拎住嘅碟㩒一行」（`start`：舊歌停、換隊列、由泊位行完整開場，唱針放低先出聲）；細唱片機嘅歌名同唱臂跟播放 store（自動下一首、播完、載入失敗；D58） | feature | Frontend | mockup: HT 第 18 版「播緊」「暫停」「播緊時，手上拎住另一隻碟」+ 互動格（由歌單揀歌播、由歌單欄㩒一行播） | 3.25 | T-011（✅）、T-037、T-042（U-11 ✅、D36 ✅ 已確認）；有 T-049 就一齊接（冇就喺 T-049 完成時接） | P0 | 改；設計稿唔再阻，仲要等 T-011（spike，測試碟未定）。v1.4：估算不變（同一個 `start` 路徑）。⚠️ **CR-008（v1.7）**：「拎住嘅碟㩒一行」作廢；改為接 T-108 嘅 `playFirst(view)`（未揀歌㩒唱片夾 = 第一首有音檔嘅歌；拎住時 = 舊歌停、隻碟入機、由泊位行完整開場，唱針放低先出聲），同弧線歌單一樣行 `start`；播放 store 要有「播完」狀態：拎住期間載入嘅碟播完 → 細唱片機「已播完」、唱針離開碟、歌單欄唔收（D88）；~~冇拎住時播完之後算唔算已揀歌（歌單欄出唔出、唱片夾播邊首）要用戶答（Functional Spec §開放問題，🅰️ 建議：算已揀歌，冇歌單欄，唱片夾由泊位重播最後一首）。~~ ⚠️ **CR-009（v1.8，D99）**：用戶答咗：**唔算**。順序模式（冇 Repeat）播完最後一首：歌停、唱臂返泊位、唱片夾由 pause 變返 play（播放 store `ended`，T-108 已有）；3 秒（新 token）後「放低隻碟」→ 未揀歌（左上歌名淡出、歌單欄 `PANEL_FLOAT` 飄返出嚟，T-108 嘅衍生規則）；3 秒之前或者之後㩒唱片夾 = `playFirst`（第一首有音檔，由泊位行完整開場）；🅰️ 細項（Functional Spec D99 ①–⑤：提早結束 timer、歌書／MV 開住、清續播記錄、Shuffle、拎住期間）。播放模式掣嘅 handler 而家係空（backlog B-088 ⑧），一齊接。驗收標準見下面「T-038 播完最後一首」。Mockup Binding 加 HT 第 19 版「拎住另一隻碟，播緊嗰隻碟播完咗」。估算不變。**v1.8**：加 HT 第 20 版「播完最後一首」（畫面 = 「未揀歌嘅主頁」）；2 → 2.5。⚠️ **CR-010（v1.9）**：T-011 ✅，**進行中**（developer 2026-11-26 開工，中途被用量上限打斷，續做緊）。做法照 spike 報告 §2 同 Technical Spec「CR-010 → 播放架構」：`playback/{audioEngine,playbackController,queue,mediaSession}.ts`；`useHome` 改 `useSyncExternalStore`；`PlaybackStatus` 加 `error`；卡住重試；`leadInMs()`；**Media Session 由 controller 擁有（由 T-062 移入）**；🅰️ D109（鎖機載入失敗跳過一次）、D110（上一首 3 秒）。估算 2.5 → **3.25**（+0.25 外部 store 同 `useHome` 搬遷、+0.25 Media Session 狀態同步同系統暫停／恢復、+0.25 卡住重試同錯誤）。「完成」要用戶真機核對 U-24 ①②③⑤（唔阻開發）。QA 鏈：新 `player-playback`（`src/playback/**`）+ `player-home`、`player-holding`。驗收標準加「T-038 播放（CR-010）」P1–P8 |
| T-039 | PWA 規則：manifest、版本注入、`updateManager`、`100dvh`、`noindex`、`robots.txt`（backlog B-021）、「請打直」、無障礙檢查 | feature | Frontend | none-required（「請打直」用 `proposal:` Functional Spec US-015） | 1.5 | T-035 | P0 | 改。⚠️ **CR-009（v1.8）**：「請打直」（`rotate-notice`）同更新提示（`update-prompt`）作廢（約 0.5 人日，已用咗）：T-111、T-109 拎走 |
| T-040 | E2E 工具：假 catalog + 本機媒體 server；同 mockup 嘅截圖比對；加一個高身畫面（390 × 844）驗貼頂 / 貼底。**v1.4**：截圖對第 18 版 `VIEWS` 入面標「第 18 版」嘅格（歌名縮字、斷兩行、斷兩行 + 泊位、播緊時揀碟、轉到另一隻碟、手上拎住另一隻碟、長歌單 30 首）連 22 格；流程「播緊 → 擰去另一隻碟 → 鬆手 → 㩒一行（換歌、完整開場）／㩒細唱片機（返去，聲冇停）」；減少動態效果行一次。T-048、T-049 未完成之前嗰幾格先 skip。⚠️ **CR-008（v1.7）**：截圖改對**第 19 版**：「未揀歌嘅主頁」（有歌單欄、唱片夾 play）、「播緊時，手上拎住另一隻碟」（有細掣、冇唱臂、歌單欄縮短）、「拎住另一隻碟，播緊嗰隻碟播完咗」（「已播完」）、「拎住另一隻碟：播緊嘅歌名好長／超長」，連第 18 版其餘冇改嘅格；流程改為「開 app（有歌單欄）→ 㩒唱片夾（播第一首）→ 擰去另一隻碟（停定先出歌單欄）→ 鬆手（細掣出、冇唱臂）→ 㩒碟面（歌名飄落弧線）→ 㩒暗位（歌單欄出返）→ 㩒唱片夾（換碟、完整開場）／㩒細唱片機（返去，聲冇停）」；減少動態效果再行一次；第 19 版嘅格等 T-108。⚠️ **v1.8（CR-009）**：加**第 20 版**靜態格：「框入面係最後一首」「框入面係第一首」「歌少嘅碟（3 首）」「指住 ♥」「指住第一隻碟」、版本掣四格（主頁、拎住另一隻碟、歌單開住、字母盤開住）；流程加「播完最後一首 → 3 秒 → 同『未揀歌嘅主頁』一樣」；一個打橫手機 viewport（例如 844 × 390，`(pointer: coarse)`）驗畫面同直向一樣、拖動方向啱 | test | QA + Frontend | mockup: HT 第 18 版全部靜態格；⚠️ v1.7：**HT 第 19 版**全部靜態格 | 3 | T-035；第 18 版拎住嘅格：T-048、T-049；第 19 版嘅格：**T-108**；第 20 版嘅格：T-109、T-110；打橫：T-111；播完：T-038 | P0 | 改；CR-004：假 catalog 用新資料（21 張），截圖有 22 格嘅字母盤；CR-005：22 格、左上兩行、揀碟淡出。**v1.4**：唔再等 U-18；加拎住另一隻碟嘅格同流程（1.5 → 2）。**v1.7（CR-008）**：第 19 版嘅格同新流程（2 → 2.5）。**v1.8（CR-009）**：第 20 版嘅格、播完、打橫（2.5 → 3） |
| T-041 | `vercel.json` 同第一次正式部署（Vercel project 喺 U-7 已經開咗）。CR-006：Vercel 環境變數設 `VITE_FONT_URL` = `<MEDIA_BASE>_fonts/lubalin-graph-book.otf`（連 `VITE_CATALOG_URL`）。⚠️ **v1.8**：U-7 ✅（`https://rgram.vercel.app`，Production branch = repo 預設 branch = session branch）；**檢查 `VITE_FONT_URL` 真係設咗**（用戶步驟有寫，未確認）；第一次 build 嘅結果等用戶確認網站開到。⚠️ **v1.9（CR-010）**：**拎走臨時測試 catalog**（T-113：`apps/player/public/test-catalog/`、`scripts/dev/build-test-catalog.*`、`precache.node.test.ts` 嗰段；`defaultDeps.test.ts` 嘅 root-relative 測試睇正式網址仲要唔要）；`VITE_CATALOG_URL` = `https://r-gram-api.dcwhung.workers.dev/catalog/v1/catalog.json`（Worker 部署之後用戶已經可以先改，T-116） | chore | DevOps | none-required | 0.5 | T-039、T-113、T-116、`main`（A-8） | P0 | 改 |
| T-042 | CR-003 跟進已完成嘅 code：`stage/geometry.ts`、`layouts/types.ts`、`layouts/phone.ts`（`scale.toDeg`、專輯平均分佈）；`geometry.test.ts`、`clearance.test.ts`（任何專輯數都過，掃 1 至 30 張）；`Tonearm` 三個姿勢：泊位、落針、升針（`armShape.ts`、`partsMarkup` snapshot）；**唱針開場**（第 17 版）：`parked → playing` 兩段（升高住轉入 650ms → 放低 160ms，小燈同碟轉延遲到放低之後）、`lifted ⇄ playing` 只係放低／升起（160ms）、減少動態效果直接到位；`config/motion.ts`、`tokens.css` 加 160ms 嘅 token（連兩個鎖數值嘅測試）；`StageSvg.tsx` 註解 | fix | Frontend | mockup: HT 第 17 版「刻度格數」「暫停」「播緊」+ 互動格（唱針開場） | 1.5 | T-030、T-033（U-11 ✅ 已確認） | P0 | **新**；第 17 版加唱針開場（1 → 1.5）。✅ 完成（review pass 90 / 100；QA S1 pass，鏈 `player-home`） |
| T-043 | 播放端設計稿第 16 版：刻度弧固定（4、9、17、24、30 張示範）、暫停時唱針升起、歌書開住時暫停。補咗兩格（commit `7ecf24b`）：歌詞冇時間標記時嘅歌書（D38）、冇歌專輯嘅歌單（D39）。**第 17 版**（commit `3cfc327` 至 `9d0c9d6`，跟用戶幾輪意見）：純文字歌詞直身一欄連自動斷行同試排版、有時間標記嘅長行喺框入面斷行、唱針開場、碟多時字母盤嘅字母（加 18 張示範）→ 用戶確認 | docs | PM + Frontend | — | 0.5 + 0.5 | — | P0 | **新**：✅ 完成。用戶 2026-11-25 確認第 17 版（U-11；「用框入面斷行，第 17 版確認」） |
| T-044 | **播放端字體**（CR-004 決定 4；backlog B-054）：內建 Rokkitt（woff2，入 bundle 同 precache）；`@font-face` 次序 = 裝置已安裝嘅 Lubalin Graph → 媒體 bucket 字體 URL（build 變數，可選；冇設定就唔發請求）→ 內建 Rokkitt；`tokens.css` 嘅 `--font-slab`／`--font-mixed` 跟住改（連 `tokens.node.test.ts`）；字體載入後重新量字（`document.fonts.ready` + `loadingdone`；review W-017）；bucket 字體失敗唔卡住；`.env.example`（連 `VITE_CATALOG_URL`，backlog B-036）。一齊修 review T-042／T-035 嘅 W-017、S-072–S-075。商業字體檔唔入 repo | feature | Frontend | mockup: HT（`src/fonts.css` 嘅 `RB Slab`） | 1 | T-030、T-035 | P0 | **新（CR-004）**；✅ 完成（review pass 90 / 100：W-026 由 CR-005 D53 關閉，唔使改 code；QA S1 pass，鏈 `player-fonts`）。用戶已上載字體（U-14）；✅ CR-006：檔案 `_fonts/lubalin-graph-book.otf`（U-16 完成），`VITE_FONT_URL` 喺本機 `.env.local` 同 Vercel（T-041）設，code 唔使改 |
| T-045 | **播放端設計稿第 18 版**（CR-005）：轉盤用真實 21 隻碟 + ♥ = 22 格（先類別、後序號；backlog B-059）；左上長歌名兩行（縮 44 → 32 → 兩行：第一行上移 22、行距 38、「第 nn 首」行唔郁、第二行 x ≤ 470、兩行都唔夠先「…」、英文字同括號唔斷）；播緊時揀碟（唱臂同三粒細掣淡出、碟停轉、聲照播、返去淡入；喺另一隻碟鬆手 = 唱臂泊位、唔顯示歌名、㩒唱片夾開嗰隻碟嘅歌單）→ 用戶確認。**第 ③ 點再改幾輪**（commit `e20d920` 至 `4e739cd`）：「行去拎其他碟睇」：細唱片機、碟名下面嘅歌單欄（黑字、冇黑色層、密行距、左邊位置條、左到右漸變嘅半透明層）、㩒一行放入機播、㩒細唱片機返去 → **用戶確認** | docs | PM + Frontend | — | 0.5 + 0.5 + 0.5 | — | P0 | **新（CR-005）**；✅ **完成**：用戶 2026-11-25 確認第 18 版（U-18；source commit `4e739cd`）。v1.4：第 ③ 點多咗幾輪（+0.5）。**v1.7（CR-008）**：第 19 版（commit `ef37d67` 至 `ca8c52a`：歌單欄純睇、幾時出、飄落、唱片夾 play、「已播完」、細唱片機嘅字、兩個版面選擇）幾輪，用戶 2026-11-26 逐點確認（+0.5，已做）。**v1.8（CR-009）**：第 20 版（commit `6e0bf51` 至 `a335587`：版本掣四稿、頭尾相接、接駁位、播完最後一首）用戶 2026-11-26 確認（+0.5，已做） |
| T-046 | **播放端隨機封面**（CR-005 決定 8，Functional Spec D56）：純函數 `pickCoverVariants(albums, random)`、selector `albumArt(album, variant)`（連 unit test）；開 app 時揀一次，放記憶體，唔寫本機儲存，catalog 更新時保留；`homeView.ts` 改用揀中嗰張（跟進 T-035）；載入一張專輯嘅封面之後 idle 時攞埋另一張入 cache；專輯色跟第一張 | feature | Frontend | none-required | 0.5 | T-035（✅）、T-100（schema） | P1 | **新（CR-005）** |
| T-047 | **左上歌名兩行**（CR-005 決定 5，Functional Spec D51；跟進 T-035，關閉 review W-018）：`fitText()` 改為縮字 → `wrapLine()` 兩行 → 第二行尾「…」；英文字同括號唔斷；`SongLines.tsx` 兩行、心形跟最後一行、唔再用字級做 `key`（backlog B-056 ④）；數值入 `layouts/phone.ts`；`clearance.test.ts` 加兩行嘅淨空（x ≤ 470） | fix | Frontend | mockup: **HT 第 18 版**「歌名較長（縮字）」「歌名好長（斷兩行）」「歌名好長 + 唱臂喺泊位」（`SONG_FIT`） | 0.5 | T-035（✅） | P0 | **新（CR-005）**；v1.4：第 18 版已確認（U-18 ✅），可以開工 |
| T-048 | **拎住另一隻碟、細唱片機**（CR-005 第 18 版確認；Functional Spec FR-043、D52、D58；Technical Spec「補充：播放端設計稿第 18 版確認嘅技術設計」）：衍生狀態 `holding`（載入嘅碟 = 播放 store `albumId`、顯示嘅碟 = `viewAlbumId`）連 unit test；`holding` 時大唱片機嘅轉盤、唱臂、三粒細掣、左上歌名嗰部分隱藏（`chromeFadeMs`）；`components/mini-turntable/`（重用轉盤、碟、唱片夾、唱臂，按 `MINI` 縮放；「播放中」／「已暫停」同歌名；碟跟播放狀態轉；唱臂以載入嘅碟計姿勢；成組一粒掣、`aria-label`）；新 action `returnToLoaded`（淡出期間換碟、唱臂即時到位、淡入，唔行開場）；`openList` 喺 `holding` 時唔做嘢；♥ 喺 `holding` 時當轉去 ♥ 格；碟名闊度收窄（`albumTitle.rightWhenHeld`）；`layouts/phone.ts` 加 `miniTurntable`；`clearance.test.ts` 加細唱片機感應範圍；i18n 新字串；減少動態效果即時 | feature | Frontend | mockup: HT 第 18 版「播緊時揀碟：轉到另一隻碟」「播緊時，手上拎住另一隻碟」+ 互動格（`MINI`、`miniTurntable`、`swapAlbum`） | 1.5 | T-036、T-046 | P0 | **新（v1.4，由 T-036 拆出）**；✅ 完成（review 80；QA S1 pass，鏈 `player-holding`）。⚠️ **CR-008**：「`openList` 喺 `holding` 時唔做嘢」同「拎住嘅碟冇三粒細掣」作廢；細唱片機嘅字推上已喺 T-037／T-039 修正做咗；「已播完」同顯示規則喺 T-108 |
| T-049 | **拎住嘅碟嘅歌單欄**（CR-005 第 18 版確認；Functional Spec FR-044、D57）：`components/held-tracks/`（一欄行：歌號專輯色、歌名黑字、灰色行唔㩒得、長歌名「…」用 T-037 嘅共用截短函數、空碟「尚未有歌曲」／「尚未收藏歌曲」）；純函數 `columnLayout.ts`（可捲距離、行 y、頂底淡出、位置條；unit test）；欄內捲動（拖動、滾輪、鍵盤；拖過唔當㩒；換碟歸零）；頂底淡出 mask、**左邊**位置條；半透明層（舞台底色，左到右 `TRACKLIST.scrimOpacity` → 0）；旋鈕開住欄較短（`bottomOpen`）、行未㩒得，鬆手之後欄較長（`bottomHeld`）；新 action `playHeldTrack` → 播放 store `start`（舊歌停、隻碟落轉盤、唱臂由泊位行完整開場）；`layouts/phone.ts` 加 `heldTracks`；`clearance.test.ts` 加欄底避開字母盤同刻度、D57 例外清單；完成後量歌號對比（開放問題）。**CR-006**：顯示 `track.no`（可以跳號，D60） | feature | Frontend | mockup: HT 第 18 版「播緊時揀碟：轉到另一隻碟」「播緊時，手上拎住另一隻碟」「長歌單（30 首）」+ 互動格（`TRACKLIST`、`trackPanel`、`listScrim`） | 2 | T-048、T-037 | P0 | **新（v1.4，由 T-036 拆出）**。真正出聲由 T-038 接（同一個 `start` 路徑）。✅ 完成（review 80；QA S1 pass，鏈 `player-holding`）。⚠️ **CR-008**：「㩒一行即播」（`playHeldTrack`、`startHeld`、行 focus 同鍵盤、D57 例外）同 `bottomHeld` 作廢（約 0.5 人日，已用咗）；欄本身、捲動、位置條、半透明層、`columnLayout` 保留；改動喺 T-108 |
| T-108 | **揀碟歌單欄第 19 版**（CR-008；Functional Spec D82–D90、FR-005、FR-043、FR-044；Technical Spec「CR-008 對技術設計嘅影響」）：① 歌單欄純睇：拎走 `playHeldTrack`、`startHeld`、`onPlayHeldTrack`、行嘅掣／focus／鍵盤（`rowFocus.ts`）、`heldTracks.play` 字串、D57 例外清單；拖動同滾輪照捲。② `trackChosen`、`showsColumn`（冇歌載入、拎住、字母盤開住都出；弧線歌單同 MV 開住收起；㩒暗位收返之後出返）。③ `openList` 守衛反轉（`holding` 照開；`discChange` 唔開）；由歌單欄開時歌名飄落弧線（`LIST_FLOAT`）。④ 唱片夾永遠有圖案；`playFirst(view)`（第一首有音檔；冇就唔做嘢；拎住時舊歌停、隻碟入機、完整開場）；字母盤開住唔做嘢。⑤ 三粒細掣（字母盤開住冇、鬆手有；未揀歌時歌書、MV 停用）、大唱臂（有細唱片機或者字母盤開住冇）。⑥ `PANEL_FLOAT`（逐行飄落、停定 140 ms 先出）、鬆手縮短（`bottomHeld` → `bottomIdle` 1290；讓出嘅行 `chromeFadeMs` 淡出、細掣淡入）、泊位唱臂疊住欄頭；新 motion token 連鎖數值測試；減少動態效果即時。⑦ 細唱片機「已播完」、唱針離開碟、歌單欄唔收（用播放 store 嘅「播完」狀態；真播完由 T-038 接）。⑧ 細唱片機嘅字（已做）核對第 19 版數值。淨空規則改寫（Technical Spec 五條）；`StageSvg` 圖層次序對設計稿；i18n「已播完」 | feature | Frontend | mockup: **HT 第 19 版**「未揀歌嘅主頁」「播緊時，手上拎住另一隻碟」「拎住另一隻碟，播緊嗰隻碟播完咗」「拎住另一隻碟：播緊嘅歌名好長／超長」+ 互動格（`showsColumn()`、`trackPanel`、`panelMetrics`、`PANEL_FLOAT`、`LIST_FLOAT`、`spindle`、`miniTurntable`） | 3 | T-037、T-048、T-049（全部 ✅） | P0 | **新（CR-008）**；**進行中**（主 session 2026-11-26 開工）。改到嘅 QA 鏈：`player-holding`、`player-list`、`player-home`、`player-dial`、`player-core`、`player-foundation`。驗收標準見下面 |
| T-109 | **版本掣**（CR-009；Functional Spec D95、US-011、FR-009；Technical Spec「CR-009 → 版本掣」）：有新版本等緊（`useUpdateStatus` = `waiting`）時右上版本號變成掣：透明底、膠囊形框線、橙黃 `#f09a00` 字（slab 26），成粒掣不透明度 1 ↔ 0.2、1.4 秒（motion token；減少動態效果常亮）；㩒（或者 Enter／Space）= `applyNow()`（唔經 30 秒防 loop）；喺 `TopGroup` 入面排喺弧線歌單暗層之前（暗層下面），`covered`（弧線歌單、歌書、MV）時唔㩒得、唔入 Tab 次序；~~`UpdatePort` 經 context 入舞台；`layouts/phone.ts` 加 `updatePill`、顏色 token；`clearance.test.ts` 感應範圍 ≥ 44pt、唔撞細唱片機；拎走 `components/update-prompt`、`data-trap-stop`、三條舊字串（換 `update.buttonLabel`）~~（⚠️ v1.9 跟 code，backlog B-090 ①：更新動作經 prop `update` 由 `App` → `HomeScene` → `TopGroup`；版面 key `info.update`（量真字）、`--color-update`；淨空測試喺 `components/update-button/updateBox.test.ts`；掣名 `update.applyLabel`；舞台外有讀屏用嘅 `UpdateNotice`（`update.available`）；只拎走 `update.apply`）；拎走 `components/update-prompt`、`data-trap-stop`；順手改 backlog B-085 ② 兩個舊註解 | feature | Frontend | mockup: **HT 第 20 版**「有新版本：版本號變成閃動嘅掣」四格（`VERSION`、`UPDATE_PILL`、`updateButton()`、CSS `versionGlow`） | 1 | T-039、T-108（全部 ✅） | P0 | **新（CR-009）**；**進行中**（developer 2026-11-26 開工）。QA 鏈：`player-pwa`、`player-home`（亦掂 `player-holding` 嘅 `TopGroup`、`player-list` 嘅 `useListFocus`、`player-foundation`）。驗收標準見下面 |
| T-110 | **弧線歌單同旋鈕頭尾相接**（CR-009；Functional Spec D97、D98、FR-004、FR-005；Technical Spec「CR-009 → 弧線歌單頭尾相接」「旋鈕同碟疊頭尾相接」）：① 弧線歌單：圈 = N + 1（接駁位）；捲動位置唔夾、顯示摺返；`loopWindow`（上 min(4, ⌊N/2⌋)、下 min(4, N − 上)）；接駁位元件（點 + 專輯色短線，最淡 0.45，`aria-hidden`）；圈上吸附（跳過接駁位、灰色行）；方向鍵頭尾相接（~~`rowStep` 頭尾相接版，歌單欄唔用~~ ⚠️ v1.9 跟 code：`rowStep.ts` 已刪，用 `arcScroll.ts` 嘅 `stepRing()`／`nextRingIndex()`；歌單欄用 `useColumnScroll`）；一首歌、冇歌、Favourites；`LIST_FLOAT` 摺返行同接駁位原地淡入。② 旋鈕：`moveTurn` 唔夾、`turnedPosition`／方向鍵 `mod`（Home／End 不變）；指針即時跳。③ 碟疊：`stackOffset`、循環窗口、按循環距離畫（「下一隻」喺上面） | feature | Frontend | mockup: **HT 第 20 版**「弧線歌單頭尾相接」（自動示範 + 三格）、「旋鈕頭尾相接」兩格（`LIST_LOOP`、`loopWindow()`、`loopSeam()`、`listRowOf()`、`stackOffset()`、`STACK_LOOP`） | 2 | T-036、T-037、T-108（全部 ✅） | P0 | **新（CR-009）**；**進行中**（developer 2026-11-26 開工）。QA 鏈：`player-list`、`player-dial`（亦掂 `player-foundation` 嘅 `layouts/phone.ts`）。驗收標準見下面 |
| T-111 | **手機打橫轉返**（CR-009；Functional Spec D96、US-015、FR-018、C11；Technical Spec「CR-009 → 手機打橫轉返」）：`isPhoneLandscape` 時唔再出「請打直」，將舞台反方向轉 ±90°（`quarterTurn(screen.orientation.angle)`，讀唔到當 90）；`fitStage` 用對調咗嘅闊高；`safeArea` 加 left／right、跟住轉；`stage/rotation.ts` `toStagePoint()`，`useDragScroll` 改用舞台直方向座標；`useKnobTurn` 加打橫測試（唔使改）；拎走 `components/rotate-notice`、`Stage` 嘅 `covered`、`rotate.notice`；改 `deviceClass.ts`、`manifest.ts` 註解（`orientation: portrait` 保留）。真機驗證喺 T-010 ⑥（spike）同用戶喺 rgram.vercel.app 試 | feature | Frontend | none-required（畫面同直向一樣；用 HT 第 20 版嘅直向格做截圖比對） | ~~1.5~~ 0 | T-110 | P0 | ❌ **取消（CR-010，D96 撤回）**：用戶 2026-11-26 喺 iPhone 試完 spike ⑥ 唔接受系統轉向嘅過場，揀「改返出『請打直』」。未合併嘅 branch `feature/t111-landscape`（7 個 commit）留底參考；已用咗大約一個鐘，唔再計。`rotate-notice` 照用。以下係之前嘅寫法：**新（CR-009）**；**等 T-110**（同一批手勢檔）。QA 鏈：`player-pwa`、`player-foundation`、手勢檔（`player-list` 嘅 `components/scroll`、`player-dial` 嘅 `useKnobTurn`）、`player-core`（`App.tsx`）。驗收標準見下面 |
| T-112 | **app icon 細尺寸同 maskable 192**（CR-009 決定 8；Functional Spec D100、D94；Technical Spec「CR-009 → App icon 細尺寸」）：由 `_mockups_/app-icon/export/d-black-disc/` 抄 `icon-16.png`、`icon-32.png`、`icon-48.png`（簡化版）、`icon-maskable-192.png` 入 `public/icons/`；`APP_ICONS`、manifest `icons`（加 maskable 192）、`iconLinks()`（favicon 16／32／48，拎走 192 做 favicon）；`manifest.node.test.ts` 驗檔案存在同尺寸 | feature | Frontend | design source: `_mockups_/app-icon/export/d-black-disc/`（設計稿 `_mockups_/app-icon/index.html` 第 7 版，已確認） | 0.5 | T-039（✅） | P1 | **新（CR-009）**；**進行中**（developer 2026-11-26 開工）。QA 鏈：`player-pwa`。管理端頂條 icon 唔喺呢度（backlog B-089，T-051） |
| T-113 | **臨時測試 catalog**（CR-010 決定 7；Functional Spec D107；Technical Spec「CR-010 → 臨時測試 catalog」）：`scripts/dev/build-test-catalog.mjs` 由參考 seed 生成 `apps/player/public/test-catalog/catalog.json`（21 張專輯、291 首歌、冇封面、音檔 key 跟資料夾規則）；唔入 precache；Vercel 用 `VITE_CATALOG_URL=/test-catalog/catalog.json`。**臨時**：T-041 之前拎走 | chore | Frontend | none-required | 0.5 | T-031、T-104（✅） | P1 | **新（CR-010）**；**已合併**（`66b65fd` test、`771783d` chore、merge `379828f`）；review 同 QA 未做（輕量）。QA 鏈：未有（`scripts/dev` 唔喺任何鏈；建議歸 `repo-scaffold`，`public/test-catalog` 歸 `player-catalog`）。用戶照指引設 Vercel 變數：未確認 |
| T-114 | **Preload 旗幟用 WebGL**（CR-010 決定 6；Functional Spec D106、US-001、FR-001；Technical Spec「CR-010 → Preload 旗幟用 WebGL」；spike 報告 §1.2 ⑤ 方案 B，報告入面叫「T-113」）：`components/flag/flagGl.ts`（布料圖 texture 一次、網格 buffer 每格 `bufferSubData`、光暗喺 fragment shader；GLSL 常數由 `flagMesh.ts` 嘅 `WAVES`／`HOIST`／`LIFT`／`SHADE`／`LIGHT` 生成）；`useFlagAnimation` 揀 renderer（WebGL → 2D 靜止一格）；`webglcontextlost` → 靜止一格；減少動態效果靜止一格；`FlagCanvas` DPR 上限、`flagScene`、版面表、Preload 時間線不變 | feature | Frontend | design source: 而家 2D 旗幟（v16，樣唔變；截圖比對） | 2.5 | T-034（✅） | P0 | ✅ **完成（2026-11-26；review 100、QA S1 pass；iPhone fps 等 U-24 ⑥ 重量）**。**新（CR-010）**。估算：renderer 1、shader 同常數生成 0.5、後備同 context lost 0.25、測試 0.5、真機量度同調整 0.25。QA 鏈：`player-startup`。驗收標準見下面 |

**T-108 驗收標準**（Functional Spec §CR-008 決定 1–8）

| # | 驗收標準 |
| --- | --- |
| A1 | 歌單欄嘅行唔係掣：㩒落冇反應、Tab 唔會入任何一行、冇行嘅 `aria-label`「播放第 nn 首」；拖動、滾輪照捲；㩒歌單欄嘅位唔會開弧線歌單；`playHeldTrack`、`startHeld` 已刪（連測試）；淨空測試冇例外清單 |
| A2 | 歌單欄出現嘅情況同 Technical Spec「場景 × 載入／拎住 × 字母盤」表每一行一致：開 app 冇歌有；字母盤開住（有冇歌載入、指住邊隻碟都有）；拎住另一隻碟鬆手有；顯示緊載入嘅碟而字母盤收埋冇；弧線歌單或者 MV 開住冇；㩒暗位收返弧線歌單之後出返；開始播之後收起 |
| A3 | 拎住另一隻碟或者冇歌載入時㩒碟面：開嗰隻碟嘅弧線歌單，弧線上見得到嘅歌名由歌單欄位置飄去弧線（`LIST_FLOAT` 數值），其餘行原地淡出；顯示緊載入嘅碟㩒碟面照舊直接開；字母盤開住㩒碟面冇反應（`discChange` 唔會去 `list`） |
| A4 | 唱片夾任何時候都有圖案（未揀歌 = play）；未揀歌㩒 = 播顯示緊嗰隻碟第一首有音檔嘅歌（第一首冇音檔就揀下一首）；全部冇音檔（或者 Favourites 冇收藏）= 冇反應；拎住另一隻碟時 = 舊歌停、隻碟落轉盤、細唱片機消失、唱臂由泊位行完整開場；字母盤開住 = 冇反應 |
| A5 | 字母盤開住：冇三粒細掣、冇唱臂；鬆手：有三粒細掣（拎住另一隻碟都有；未揀歌時歌書、MV `aria-disabled`、播放模式可以用）；有細唱片機：冇唱臂；鬆手而冇細唱片機：有唱臂 |
| A6 | 歌單欄出現時逐行由右上（dx 170、dy −62）飄落，每行 0.46 秒、逐行遲 60 ms、成欄最多 560 ms；快擰途中唔顯示，停定 140 ms 先出；鬆手時欄底由 1470 縮到 1290，讓出嘅行 0.32 秒淡出、細掣同時淡入，欄頂唔郁；全部時長嚟自 `config/motion.ts`（`motion.test.ts`、`tokens.node.test.ts` 鎖數值）；減少動態效果全部即時 |
| A7 | 拎住另一隻碟時載入嘅碟播完（用播放 store 狀態模擬）：細唱片機留低、寫「已播完」（經語言檔）、唱針離開碟、碟停；歌單欄唔收；㩒細唱片機照返去 |
| A8 | 細唱片機兩行字喺歌單欄第一行上面（`labelDy` −62、`titleDy` −14）、歌名靠右 x 782、向左最多到 x 330、36 → 24 每次 2 再「…」，數值同第 19 版一樣（已做，只核對） |
| 通用 | 截圖同第 19 版對應格喺容許誤差內（T-040）；`npm run lint`、`npm run typecheck`、`npm test` 全綠；`.tsx` 檔 ≤ 150 行、函數 ≤ 50 行；介面文字書面語、經語言檔；冇寫死毫秒 |

**T-109 驗收標準**（Functional Spec §CR-009 決定 1；D95）

| # | 驗收標準 |
| --- | --- |
| A1 | 更新狀態 `none`：右上照舊係普通版本號（Light、灰色），冇掣；`waiting`（用緊 app、有新版本等緊）：版本號變成掣，數值同第 20 版 `UPDATE_PILL` 一樣（字級 26、高 58、右邊 1034、線寬 3、顏色 `#f09a00`），冇另外嘅提示；Preload 期間唔出 |
| A2 | 成粒掣（框線連字）不透明度 1 ↔ 0.2、一個循環 1.4 秒；時長嚟自 motion token（測試鎖數值）；冇光暈、冇陰影；減少動態效果：常亮、冇動畫 |
| A3 | 㩒掣（pointer、Enter、Space）= `applyNow()` 一次：reload（假 `UpdatePort` 驗）；就算 30 秒內 reload 過都照換 |
| A4 | 弧線歌單開住（之後歌書、MV 開住）：掣喺暗層下面變暗；㩒落冇反應；Tab 唔會去到佢；收返之後先㩒得；字母盤開住同拎住另一隻碟：照顯示、照㩒得，唔疊細唱片機 |
| A5 | 感應範圍 ≥ 44pt（~~`clearance.test.ts`~~ ⚠️ v1.9：`updateBox.test.ts`）；有 `aria-label`「已有新版本，立即更新並重新載入」（經語言檔 `update.applyLabel`，書面語） |
| A6 | `components/update-prompt`、`data-trap-stop`、舊字串已刪（連測試）；`AppPwa.test.tsx` 驗版本掣；截圖同第 20 版四格喺容許誤差內（T-040） |
| 通用 | `npm run lint`、`npm run typecheck`、`npm test` 全綠；`.tsx` ≤ 150 行、函數 ≤ 50 行；冇寫死毫秒同顏色 |

**T-110 驗收標準**（Functional Spec §CR-009 決定 3、4；D97、D98）

| # | 驗收標準 |
| --- | --- |
| A1 | 弧線歌單：由最後一首向下捲 = 接駁位 → 第一首；由第一首向上 = 接駁位 → 最後一首；拖動、滾輪、方向鍵都一樣；停低永遠係一首播得嘅歌（唔會停喺接駁位或者灰色行）；吸附唔會倒轉成個圈 |
| A2 | 每首歌同一時間只出現一次：框上面 min(4, ⌊N/2⌋) 格、下面 min(4, N − 上面)（N = 1、2、3、8、15、41 嘅 unit test）；N = 1：接駁位喺下面，捲極都係嗰首；N = 0：「尚未有歌曲」不變；Favourites 歌單一樣頭尾相接 |
| A3 | 接駁位：點（半徑 9）+ 專輯色短線（長 230、線寬 5、相隔 8）；不透明度 lerp(0.45, 1, …)；`aria-hidden`、㩒唔到；數值入 `layouts/phone.ts` |
| A4 | 由歌單欄開弧線歌單（`LIST_FLOAT`）：第一首起嘅行照舊飄落；接駁位同摺返嘅行（尾嗰幾首）喺 `frameDelay`（280 ms）原地淡入；減少動態效果即時；碟名下面嘅歌單欄唔頭尾相接（照舊到尾就停） |
| A5 | 旋鈕：擰過 ♥ = 第一隻碟、由第一隻碟向後 = ♥；指針即時跳去刻度另一頭（冇沿弧行嘅過場）；方向鍵頭尾相接，Home = 第一隻碟、End = ♥；`aria-valuenow` 啱 |
| A6 | 碟疊：指住 ♥ 時下一隻（右邊）係第一隻碟；指住第一隻碟時前面嗰隻係 ♥；「下一隻」畫喺上面；跨頭尾時碟唔會重新 mount（key 不變）；截圖同第 20 版「指住 ♥」「指住第一隻碟」喺容許誤差內 |
| 通用 | 同 T-109 |

**T-111 驗收標準**（Functional Spec §CR-009 決定 2；D96）（❌ v1.9：T-111 取消，只留做記錄）

| # | 驗收標準 |
| --- | --- |
| A1 | 手機打橫（`(pointer: coarse)`、闊 > 高、短邊 ≤ 500）：冇「請打直」；舞台轉 −90°（角度 90）或者 +90°（角度 270／−90），畫面同直向一樣（截圖：打橫 viewport 轉返之後同直向截圖喺容許誤差內）；平板、Duo 打開、電腦打橫照舊置中、唔轉 |
| A2 | 舞台大細用對調咗嘅闊高；安全區（瀏海、底部指示條）跟住轉，冇嘢被遮 |
| A3 | 打橫時：拖動歌單欄同弧線歌單，方向同直向一樣（向舞台嘅「上」拖 = 向上捲）；擰旋鈕順時針 = 下一隻碟；㩒掣位置啱 |
| A4 | 轉向改變（直 → 橫 → 另一邊橫 → 直）即時跟住，冇動畫；`quarterTurn`、`toStagePoint` 有 unit test |
| A5 | `components/rotate-notice`、`Stage covered`、`rotate.notice` 已刪（連測試）；manifest 照舊 `orientation: portrait` |
| 真機 | 喺 T-010 ⑥ 同 rgram.vercel.app 用真 iPhone 試（瀏覽器分頁、加咗落主畫面），結果寫入 spike 報告（T-011）；唔接受得 = 返用「請打直」（R-026） |
| 通用 | 同 T-109 |

**T-112 驗收標準**（D100）

| # | 驗收標準 |
| --- | --- |
| A1 | `public/icons/` 有 `icon-16.png`、`icon-32.png`、`icon-48.png`、`icon-maskable-192.png`，同 export 原檔 byte 一樣 |
| A2 | build 出嚟嘅 `index.html` 有三條 `<link rel="icon" type="image/png" sizes="16x16｜32x32｜48x48">`，冇用 192 做 favicon；`apple-touch-icon` 不變 |
| A3 | manifest `icons` = 192、512、maskable 192、maskable 512（maskable 兩個 `purpose: "maskable"`）；`manifest.node.test.ts` 驗檔案存在同 PNG 尺寸 |
| 通用 | `npm run lint`、`npm test`、`npm run build -w apps/player` 全綠；PWA gate pass |

**T-038 播完最後一首**（v1.8 加；Functional Spec D99）

| # | 驗收標準 |
| --- | --- |
| E1 | 順序模式（冇 Repeat）播完最後一首有音檔嘅歌：歌停、唱臂返泊位、唱片夾 pause → play、碟停 |
| E2 | 3 秒（token）之後：左上歌名部分淡出、歌單欄 `PANEL_FLOAT` 飄返出嚟，畫面同第 19／20 版「未揀歌嘅主頁」一樣；減少動態效果即時（3 秒照等） |
| E3 | 3 秒之前或者之後㩒唱片夾：由第一首有音檔嘅歌播（`playFirst`，由泊位行完整開場） |
| E4 | 🅰️ 3 秒內擰旋鈕、㩒碟面、開歌書／MV = 即刻變返未揀歌再做；歌書／MV 開住時播完 = 收埋先計；播完之後重開 app = 未揀歌（冇續播記錄） |
| E5 | 拎住另一隻碟時播完：D88 不變（細唱片機「已播完」）；㩒細唱片機返去 = 未揀歌嘅主頁 |

**T-038 播放（CR-010）**（v1.9 加；Functional Spec D103、D109、D110；Technical Spec「CR-010 → 播放架構」；spike 報告 §2）

| # | 驗收標準 |
| --- | --- |
| P1 | `playback/audioEngine.ts` 嘅介面同 Technical Spec（= spike 報告 §2.2）一樣；成個 app 一個 `<audio>`（唔放入 React tree、唔設 `crossOrigin`）；假 `HTMLAudioElement` 嘅 unit test 行晒每個成員嘅合約（世代、`cue` 停喺 0、`land` 預備未完、`pause` 已停照發、`stop` 唔發 `ended`、`ended` 同步接下一首、系統暫停／恢復、卡住 4 s／8 s／重試 2 次、錯誤分類） |
| P2 | 所有會 `start` 嘅路（`pressSpindle`、弧線歌單 Enter／Space、`playFirst`）由手勢 handler 同步行到 `controller.start()` → `engine.cue()`（測試驗同一個 call stack）；810 ms 後 `land()`；減少動態效果 `cue()` 之後即刻 `land()`；暫停之後繼續 = `play()` 即刻出聲 |
| P3 | `useHome` 用 `useSyncExternalStore(controller.subscribe, controller.getSnapshot)`；`PlaybackStatus` 有 `error`（唱臂泊位、唱片夾 play、一行錯誤提示經語言檔；再㩒 = 重新 `start` 同一首）；`advanced` 換歌唱臂唔郁、細唱片機歌名跟住換 |
| P4 | Media Session：controller 建立時註冊一次 `play`、`pause`、`previoustrack`、`nexttrack`、`seekto`；`seekbackward`、`seekforward`、`stop` = `null`；`metadata` 換歌嗰下同步設；`playbackState` 跟引擎事件（`release` = `none`）；`setPositionState` 夾喺 `[0, duration]`、長度未知唔設；每個 `setActionHandler` 包 `try/catch` |
| P5 | 🅰️ D109：畫面隱藏時自動下一首嘅歌載入失敗 → 跳去再下一首有音檔嘅歌一次；再失敗或者前景 = 停 + 提示 |
| P6 | 🅰️ D110：鎖屏「上一首」播咗超過 3 秒（`PREVIOUS_RESTART_S`，`config/limits.ts`）= `seek(0)`；否則上一首 |
| P7 | `STALL_NOTICE_MS`、`STALL_RETRY_MS`、`STALL_MAX_RETRIES`、`PREVIOUS_RESTART_S` 喺 `config/limits.ts`；`leadInMs()` 喺 `armPose.ts`，同 `useArmLeadIn` 讀同一組 token；`endedReleaseMs` 喺 `MOTION.input` |
| P8（真機，阻「完成」唔阻開發） | 用戶 U-24 ①②③⑤：落針即出聲（冇半秒延遲，唔得退返 spike 1a 原樣）；鎖機播完一整隻碟（≥ 5 首）、最後一首之後停；鎖屏暫停 → 等 → 播放，返入 app 一致、耳機掣；播緊時碟轉同唱臂順唔順 |
| 通用 | 同 T-109；E1–E5（播完最後一首）照舊 |

**T-113 驗收標準**（已合併；review 同 QA 照呢個驗，輕量）

| # | 驗收標準 |
| --- | --- |
| A1 | `node scripts/dev/build-test-catalog.mjs` 生成嘅檔同 committed 嘅 `apps/player/public/test-catalog/catalog.json` 一樣；`parseCatalogDocument()` 讀得到；21 張專輯、291 首歌 |
| A2 | 音檔 key 跟資料夾規則；封面、歌詞 `null`；`--audio=none` 全部灰色行；未知參數報錯 |
| A3 | 唔入 precache（`precache.node.test.ts`）；`VITE_CATALOG_URL` 可以係 root-relative（`defaultDeps.test.ts`） |
| A4 | 檔頭同 `README.md` 寫明臨時、T-041 之前拎走 |

**T-114 驗收標準**（spike 報告 §4；Technical Spec「CR-010 → Preload 旗幟用 WebGL」）

| # | 驗收標準 |
| --- | --- |
| A1 | 用戶 iPhone 兩個模式（Safari 分頁、主畫面 App；低耗電模式關）行 spike 5a：平均 ≥ 30 fps（目標 55+）、最慢一格 ≤ 50 ms、掉格 ≤ 10 %；低耗電模式開只記錄（U-24 ⑥） |
| A2 | 同而家 2D 版喺固定時間（`flagGustMs`）嘅一格截圖比對（Playwright Chromium，容許少量差異），睇落一樣 |
| A3 | 冇 WebGL（測試入面 `getContext('webgl')` 回 `null`）= 靜止一格、Preload 照行 |
| A4 | `webglcontextlost` = 靜止一格、唔 throw |
| A5 | 減少動態效果 = 靜止一格 |
| A6 | 唔掂 `flagScene`、版面表（`PRELOAD.flag`）同 Preload 時間線；GLSL 常數由 `flagMesh.ts` 生成（冇兩份） |
| 通用 | 同 T-109 |

**T-115 清單**（拆走 spike 頁；backlog B-090 ③ 九樣 + 三樣）

| # | 要拆 |
| --- | --- |
| 1 | `apps/player/spike.html` |
| 2 | `apps/player/vite.spike.config.ts` |
| 3 | `apps/player/src/spike/**` |
| 4 | `apps/player/src/pwa/spikePage.ts` |
| 5 | `vite.config.ts` 嘅 `spikeBuild()`（連 `SPIKE_CONFIG`） |
| 6 | `vite.config.ts` precache `globIgnores` 嘅 `SPIKE_PRECACHE_IGNORES`（連 import） |
| 7 | `pwa/manifest.ts` 導航 fallback denylist 嘅 spike 一行 |
| 8 | 根 `vitest.config.ts` 覆蓋率排除 `**/src/spike/**`；`i18n/hardCodedText.node.test.ts` 嘅 `spike/text.ts` 豁免 |
| 9 | `player-spike` 鏈：`qa/plans/player-spike.md` 標退役、ledger 嗰啲行（QA 做）；`.claude/CLAUDE.md` chain 表（主 session） |
| 10 | `apps/player/tsconfig.node.json` `include` 嘅 `vite.spike.config.ts` |
| 11 | `pwa/manifest.node.test.ts` 嘅 `describe('spike page (T-010)')` 成段 |
| 12 | `pwa/precache.node.test.ts` 嘅 `SKIPPED_PLUGIN = 'spike-build'` 同註解 |
| 驗收 | `npm run lint`、`npm run typecheck`、`npm test`、`npm run build -w apps/player` 全綠；build 出嚟冇 `spike.html`；PWA gate pass；`grep -ri spike apps/player` 冇結果（`CHANGELOG` 之類記錄除外） |

**T-116 驗收標準**（Functional Spec D108；Technical Spec「CR-010 → 冇設計嘅同步頁同部署準備」）

| # | 驗收標準 |
| --- | --- |
| A1 | `apps/admin` 喺根 `tsconfig.json` `references`、`vitest.config.ts` `projects`、`ci.yml` 各有一行；`npm run lint`、`npm run typecheck`、`npm test`、`npm run build -w apps/admin` 全綠；介面文字書面語、全部經 `src/i18n/zh-Hant.ts`（測試鎖住） |
| A2 | 冇 session = 登入掣（`/auth/google/start?next=/`）；有 session = email、「登出」、「同步」掣；唔喺白名單 = Worker 嘅「沒有權限」頁 |
| A3 | 同步 runner（注入 `fetch` 嘅 unit test）：API-033 → 照次序逐個 API-034；`more: true` 帶 `from=nextFrom` 再叫直到完；一個資料夾失敗唔停其他；收集 `added`／`updated`／`unchanged`／`failed`／`checks`／`pendingRemovals`／`coverJobs` 同 API-033 嘅 `invalid`／`duplicateIds`／`missingAlbums`／`truncated` |
| A4 | 封面工作（unit test 用假圖）：置中裁正方形（唔係正方形帶 `notSquare`）、1200 同 320（細過 1200 放大）、WebP、第一張抽專輯色、API-050 × 2 → API-017（帶 `sourceKey`、`sourceEtag`）；CORS／網絡／檔案錯誤分開講、唔停成個同步 |
| A5 | 冇任何 API-035 請求（測試鎖住）；要確認嘅移除只喺記錄列出 |
| A6 | `wrangler.toml`：`[assets]` 開咗；`CATALOG` = `rb-discography-catalog`；`database_id`、`GOOGLE_CLIENT_ID`、`WORKER_ORIGIN`、`PLAYER_ORIGINS` 填咗用戶嘅值；**冇 `ADMIN_EMAILS`**；`validateEnv` 冇 `ADMIN_EMAILS` 或者係 placeholder 回 500；`.dev.vars.example` 有 `ADMIN_EMAILS` 嘅假值；repo 入面冇真 email |
| A7 | 用戶部署指引第 2 部分（交畀主 session 轉畀用戶；唔入公開 repo 嘅值用 placeholder）；第一次部署之後用戶回報：登入得、同步完成、`/catalog/v1/catalog.json` 有內容、B-060 ② 同 API-034 實際操作數 |
| 通用 | `.ts` 函數 ≤ 30 行、`.tsx` ≤ 50 行、檔案 ≤ 150 行；冇 magic number；`npm audit` 冇新高風險（`@jsquash/webp` 同 903-player 一樣） |

### Phase E — 管理端 UI

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-050 | **P-3 管理端 mockup**（`_mockups_/admin/index.html`）→ 用戶確認。第 1 版因為太似 903-player 被否決；第 2 版：鋁面板、螺絲、專輯以碟呈現、儀錶統計、每首歌一個文字框，冇發佈 / 發佈記錄 / 歌詞編輯畫面。D37 已確認：`副題：` 行已加（commit `82000ed`）；文字框下面嘅細控件（歌詞參考連結、備註、手動指定檔案）未畫，要補 | docs | PM + Frontend | proposal: Functional Spec P-3（CR-003 改寫） | 1.5 + 1.5 + 0.5 + 0.5 + 0.5 + 1 | — | P0 | 重開：第 2 版已交（commit `d60b02b`）。**CR-004：補畫（+0.5）**：掃描結果加「封面」（來源預覽、新／已更換／相同、圓碟預覽同專輯色）同「歌曲文字」（逐個檔嘅狀態、歌名變更、逐行錯誤、清歌詞警告、逐項揀選、一個確認掣）；專輯表格加發行類別、序號、預期資料夾名。**CR-005 再補（+0.5）**：專輯頁「第二張封面」一格、掃描結果加第二張封面同「已略過」一類（冇音檔嘅 `.txt`、MV，連原因）、封面細過 1200 嘅放大提示。**CR-006 再補（+0.5）**：專輯表格刪「類型」（顯示類別中文名）、「發行日期」換「年份」；歌曲表冇拖動排序，展開行加「歌號」；掃描結果加「將會新增歌曲」（歌號、歌名同來源、有冇歌曲文字同 MV、`.txt` 錯誤）同「音檔已不在資料夾」（確認 = 清走音檔連結）；示範一張跳號嘅碟（例如 KOMOREBI 01、02、03、05…）。補完先**請用戶確認（U-8）** **CR-007：第 4 版（+1；commit `8fb28a7`，已出）**：專輯 = 牆上 CD 展示架（按類別分層板，有音檔嘅 CD 露出少少）、統計 = hi-fi 機面板（四個指針錶、掃描掣、上次掃描時間）、掃描結果（要你確認／檢查結果／已新增／已更新／沒有改動）、專輯頁（`info.txt` 文字框連檢查、唯讀欄、封面兩格、灰色行、歌曲文字框）、冇 `info.txt` 嘅專輯頁、登入、沒有權限；冇新增專輯／歌曲。**等用戶確認（U-8）**；第 3 版（`29309fd`）作廢 |
| T-051 | 管理端 scaffold：登入、外框（鋁面板、螺絲）、共用元件（金屬掣、儀錶、碟）、i18n；只做淺色。903-player 只移植行為，外觀按 AD 重做 | feature | Frontend | mockup: AD 第 4 版（**等確認**） | 1.75 | T-050 確認、T-021、T-116 | P0 | 改（1.5 → 2.5） ⚠️ CR-007：Mockup Binding 改為 AD 第 4 版（等確認）。⚠️ **CR-010（v1.9）**：`apps/admin` scaffold（Vite、workspace 接駁、i18n 檔）同登入流程（Google、沒有權限）**搬去 T-116**；呢度剩有設計嘅外框（鋁面板、螺絲）、共用元件（金屬掣、儀錶、碟）、登入同沒有權限嘅**設計畫面**；2.5 → 1.75 |
| T-052 | ⚠️ **CR-007 改寫**：專輯列表（CD 展示架、按類別分層、hi-fi 機面板統計同「掃描媒體資料夾」掣、上次掃描時間、檢查結果數目）；專輯頁：唯讀資料（資料夾、類別、字母盤標記、專輯色、兩格封面）、`info.txt` 文字框（API-018／019，連檢查結果、版本衝突提示）、檢查結果；冇 `info.txt` 嘅專輯頁。之前（作廢）：專輯列表（碟 + 儀錶統計 + 拖動排序）、專輯資料、封面裁切、專輯色、類別選單、序號、第二張封面上載 | feature | Frontend | mockup: AD 第 4 版（**等確認**） | 2 | T-051、T-104、T-106 | P0 | 改；**CR-004**：2 → 2.5；**CR-005**：2.5 → 3；CR-006：估算不變（換欄） **CR-007**：3 → 2（冇人手輸入同封面上載） |
| T-053 | ⚠️ **CR-007 改寫**：歌曲表（歌號、歌名、音檔／MV／歌曲文字狀態；冇音檔 = 灰色）；㩒行展開歌曲文字框（API-040／041：即時逐行檢查、未儲存提示、清歌詞要確認、版本衝突提示、灰色行唔開）。之前（作廢）：新增、刪除、歌號欄、參考欄、手動指定、掃描面板 | feature | Frontend | mockup: AD 第 4 版（**等確認**） | 1.5 | T-052、T-106、T-029 | P0 | 改（2 → 2.5；吸收 T-081）；**CR-004**：2.5 → 3.5；**CR-005**：3.5 → 4；**CR-006**：4 → 4.5（拖動排序冇咗抵消少少） **CR-007**：4.5 → 1.5（掃描畫面搬去 T-055） |
| T-054 | ~~發佈面板：變更摘要、警告、記錄~~ | — | — | — | 0 | — | — | **取消**（決定 7） |
| T-055 | **掃描畫面**（CR-007；Functional Spec D73、D74、D76、D77、FR-127、FR-130、FR-131）：hi-fi 機面板嘅「掃描媒體資料夾」→ API-033 → 逐個資料夾 API-034（進度；`more` 再叫）→ `coverJobs` 喺瀏覽器處理（由 bucket 公開網址攞圖、置中裁切、1200／320、WebP、第一張抽專輯色 → API-050 × 2 → API-017；CORS 失敗講明原因）→ 掃描結果分組（要你確認：已不在媒體資料夾／檢查結果／已新增／已更新／沒有改動）→ 移除逐項剔選、「確認移除」→ API-035（分批）；中途閂頁唔會壞 | feature | Frontend | mockup: AD 第 4 版「掃描結果」（**等確認**） | 1.25 | T-051、T-105、T-106、T-116 | P0 | **新（CR-007）**；封面處理（裁切、放大、WebP、抽色）由 T-052 搬嚟。⚠️ **CR-010（v1.9）**：同步 runner（API-033 → 逐個資料夾 API-034 連 `more`）同封面工作（攞原圖、裁切、1200／320、WebP、抽色、API-050 × 2 → API-017）**搬去 T-116**（`src/sync/`、`src/covers/`，呢度重用）；呢度剩：hi-fi 機面板嘅掣同進度、結果分組畫面、移除逐項剔選同「確認移除」→ API-035（分批）、中途閂頁唔會壞、`COVER_FAILED` 點記（B-081 ③）；2.5 → 1.25 |
| T-116 | **冇設計嘅同步頁同部署準備**（CR-010 決定 8；Functional Spec D108；Technical Spec「CR-010 → 冇設計嘅同步頁同部署準備」）：① `apps/admin` scaffold（Vite + React、i18n 檔同書面語測試；根 `tsconfig.json`、`vitest.config.ts`、`ci.yml` 各加一行）同登入（冇 session → Google 登入；白名單；沒有權限頁照用 Worker 嘅）② 同步 runner `src/sync/`（`GET /api/sync` → 逐個資料夾 API-034，`more` 帶 `from` 再叫）③ 封面工作 `src/covers/`（`fetch(MEDIA_BASE + key)` → 置中裁切 → 1200／320 → WebP → 第一張 `dominantColor()` → API-050 × 2 → API-017）④ 移除只列出，**唔叫 API-035** ⑤ 一段純文字記錄（每個資料夾、檢查結果、封面結果、要確認嘅移除、總數）⑥ Worker 出頁：`wrangler.toml` 開 `[assets]` ⑦ `ADMIN_EMAILS` 由 `[vars]` 搬去 Worker secret（`validateEnv`、`.dev.vars.example`、註解跟住改）⑧ `wrangler.toml` 填值：`CATALOG` bucket = `rb-discography-catalog`、D1 `database_id`、`GOOGLE_CLIENT_ID`、`WORKER_ORIGIN = https://r-gram-api.dcwhung.workers.dev`、`PLAYER_ORIGINS = https://rgram.vercel.app` ⑨ 用戶部署指引第 2 部分（build admin → `wrangler d1 migrations apply r-gram --remote` → 三個 secret → `wrangler deploy` → 確認 redirect URI → bucket CORS 加 Worker origin → 登入同步 → Vercel `VITE_CATALOG_URL` 改指 Worker）；第一次部署順手驗 B-060 ②、B-074 ④ | feature | Frontend + Backend（env）+ DevOps（指引） | none-required（用戶明確要求而家唔做介面設計；臨時工具；Preview-First 例外記錄喺 Functional Spec D108） | 2.75 | T-021、T-105、T-106（✅）；用戶 U-3 ✅、U-4 ✅；部署：U-5 | P0 | **新（CR-010）**；**進行中**（developer 2026-11-26 開工，中途被用量上限打斷，續做緊）。估算：scaffold 同登入 0.75、同步 runner 0.5、封面處理 0.75、記錄同移除清單 0.25、部署準備（`[assets]`、secret、值、指引）0.5。由 T-051 搬嚟 0.75、由 T-055 搬嚟 1.25；淨新增 0.75（部署準備同臨時記錄頁）。QA 鏈：新 `admin-sync`（`apps/admin`）、`api-auth`（`env`、`validateEnv`、`wrangler.toml`）。驗收標準見下面 |

### Phase F — MV 同系統整合

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-060 | MV 電視：機身、升起 / 開機 / 熄機 / 收埋過場、▶ ❚❚ ■、收返後唔自動續播（唱臂喺泊位）；`videoEngine`；高身手機嘅擺位 | feature | Frontend | mockup: HT「MV 電視」「MV 收返之後」 | 2.5 | T-038 | P1 | ⚠️ **CR-010（v1.9）**：`videoEngine` 照 Technical Spec「CR-010 → MV 音訊」：成個 app **一個** `<video>`（`crossOrigin="anonymous"`、`playsInline`；`createMediaElementSource` 每個 element 只可以一次），手勢入面 `cue`、開機 `reveal`；電視開住時 Media Session 嘅目標轉去 `mv`（handler 去 `videoEngine`、metadata = 歌名 + 「MV」），收埋轉返 `record`。估算不變 |
| T-061 | 電視旋鈕：音量（~~特徵檢測 → Web Audio → 靜音開關~~ ⚠️ CR-010：**只用 `GainNode`**：音量 + 靜音 = gain 0（記住音量）；唔用 `video.volume`、`video.muted`；MV 路徑設 `navigator.audioSession.type = 'playback'`（🅰️ D104）；冇 `AudioContext` = 旋鈕 `aria-disabled`）、快轉 / 倒轉 | feature | Frontend | mockup: HT「MV 電視」 | 1.25 | T-060、T-011（✅） | P1 | ⚠️ **CR-010（v1.9）**：少咗兩條後備路，1.5 → 1.25。完成後用戶真機核對側邊靜音撥掣（U-24 ④） |
| T-062 | Media Session（鎖屏 / 耳機）同續播（記住碟、歌、位置） | feature | Frontend | none-required | 1 | T-038 | P1 | ⚠️ **CR-010（v1.9）**：Media Session 嘅建立同規則已移入 T-038（controller 擁有，spike 報告 §2.6）；呢度剩續播（記住碟、歌、位置；D99 ③ 播完唔記）同耳機掣核對。估算暫時不變，T-038 完成後再睇（可能減到 0.5） |

### Phase G — 收藏、播放模式、歌書

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-070 | 收藏：本機 store、心形掣、虛擬專輯 `favouritesAlbum`、♥ 入口、碟面、Favourites 歌單（連空狀態） | feature | Frontend | mockup: HT「Favourites 碟」三格 | 2 | T-038 | P1 | ✅ **完成（2026-11-26；review 95 → 100、QA S1 pass）**。QA 鏈：`player-favourites`（新）。設計稿冇講嘅做法同用戶兩個決定見 backlog B-093 ② |
| T-071 | 播放模式：隊列四個模式、模式掣 | feature | Frontend | mockup: HT 播放模式放大圖 | 1 | T-038 | P1 | |
| T-072 | 歌書：暗層、曲詞編監、開收過場（歌詞行先留空）；**歌書開住時暫停，歌書留住**；㩒暗位收返 | feature | Frontend | mockup: HT 第 18 版「歌書（㩒 i）」+ 互動格（歌書開住時暫停） | 1 | T-038（U-11 ✅ 已確認） | P1 | 改；設計稿唔再阻 |

### Phase H — 歌詞

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-080 | ~~歌詞 API：儲存、驗證、清除、發佈時出歌詞 JSON~~ | — | — | — | 0 | — | — | **取消**（併入 T-023） |
| T-081 | ~~歌詞編輯器（即時逐行驗證、參考連結）~~ | — | — | — | 0 | — | — | **取消**（併入 T-053） |
| T-082 | 歌書歌詞，兩個版面（設計稿第 17 版）。① 有時間標記：`activeLine`、弧線行；而家嗰行太長先縮字（44 → 32），仍然放唔落就喺框入面斷行、框線跟住變高；其他行各佔一列，放唔落嘅部分喺右邊淡出；唱到下一行成組沿弧線移動（D22 第 17 版修訂：冇跑馬燈）。② 冇時間標記（D32；D38 第 17 版修訂）：成份歌詞一次過顯示嘅直身一欄，冇框線、冇 highlight；自動斷行（共用純函數 `wrapLine`：優先喺空格位斷、續行縮入一個字）；放唔晒上下捲，頂底淡出；播放／暫停唔影響位置。試排版唔做（只係設計輔助） | feature | Frontend | mockup: HT 第 18 版「歌書（㩒 i）」「歌書（歌詞冇時間標記）」+「歌詞冇時間標記：試排版」兩格（第 17 版加入，已確認） | 2.5 | T-072、T-029 | P1 | 改（1.5 → 2；第 17 版兩個歌詞版面再 → 2.5）；D32 ✅ 已確認，D22、D38 喺第 17 版修訂（✅ 2026-11-25）；設計稿唔再阻 |
| T-083 | ⚠️ **CR-007 改寫**：只留歌曲文字框入面播音檔並顯示而家時間（FR-112）。~~批量匯入 `.lrc`、由同名歌帶入~~（取消，Functional Spec D81） | feature | Frontend | mockup: AD 第 4 版（**等確認**） | 0.5 | T-053 | P1 | 改（2 → 1.5）。CR-004：批量匯入 `.lrc` 同掃描讀 `.txt` 有重疊，開工前問用戶仲要唔要（開放問題） **CR-007**：1.5 → 0.5 |

### Phase I–K — 其他裝置

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-090、T-092、T-094 | P-7 mockup：iPhone Duo、HomeView、電腦（各一份，逐份確認） | docs | PM + Frontend | proposal: Functional Spec P-7 | 各 1 | Phase D 完成 | P1 | |
| T-091、T-093、T-095 | 各裝置幾何資料表 + 版面判斷；淨空測試照跑；截圖比對證明現有裝置零改變 | feature | Frontend | mockup: 對應嗰份（確認之後） | 各 2 | 對應 mockup、T-040 | P1 | |

Phase L（P2 項目）而家唔拆。

---

## 可以由 903-player 移植嘅檔案

| 用途 | 來源（`dcwhung/903-player`） | 用喺 |
| --- | --- | --- |
| Monorepo 設定 | 根目錄 `package.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts`、`tsconfig.json` | T-001 |
| CI | `.github/workflows/ci.yml`、`deploy-api.yml`；`vercel.json` | T-001、T-028、T-041 |
| 認證 | `apps/api/src/auth/{google,oauthState,session,middleware,routes,deniedPage}.ts`、`src/lib/{crypto,env}.ts` | T-021 |
| 圖片 | `apps/api/src/assets/{webp,png,imageName,storedImage,routes}.ts` | T-024 |
| Catalog 生成同對外 | `apps/api/src/catalog/{serve,store}.ts`；`publish.ts` 只參考砌 document 嗰部分。CR-003：`warnings.ts` 同發佈記錄唔再用 | T-026 |
| Worker 測試 | `apps/api/test/{applyMigrations,helpers,fixtures}.ts`、`vitest.config.ts` | T-020 |
| 管理端元件 | `apps/admin/src/ui/`（`ImageSlot`、`CropEditor`、`SortableList`、`Toast`、`ConfirmDialog`）。CR-003：**只移植行為**，外觀按 AD 重做；`SegmentedTabs`、`SaveBar` 用唔用睇 AD | T-051–T-053 |
| i18n | `apps/admin/src/i18n/{t.ts,writtenChinese.test.ts}` | T-030、T-051 |
| PWA | `apps/player/src/pwa/updateManager.ts`、`src/config/appVersion.ts` | T-039 |

播放端場景元件冇得移植：由 `_mockups_/home-turntable/src/template.html` 嘅常數同繪圖函數改寫（`metal()`、`discArt()`、`spindle()`、`tonearm()`、`knob()`、`dialRing()`、`booklet()`、`listLayer()`、`tvSet()`）。管理端嘅鋁面板、螺絲、碟、儀錶由 `_mockups_/admin/src/template.html` 改寫。

---

## 風險登記

| 編號 | 風險 | 可能性 | 影響 | 應對 | 負責 |
| --- | --- | --- | --- | --- | --- |
| R-001 | iOS 上「㩒 play 後 1.5 秒先出聲」解鎖唔成功 | 中 | 高 | Phase B 第一項驗證；退路：落針動畫縮短到手勢容許範圍，或者即刻靜音播、落針時取消靜音 | Frontend⚠️ **v1.9：關閉**（spike 1a、1c 兩個模式都得；開場 810 ms 短過測試嘅 1.5 秒；剩低「出聲延遲」見 R-031） |
| R-002 | 鎖屏下自動下一首失敗 | 中 | 高 | 同一個 `<audio>` 換 `src`；唱片唔經 Web Audio；Phase B 驗證 | Frontend⚠️ **v1.9：減低** → R-030（短片段得；長時間未驗） |
| R-003 | iPhone MV 音量旋鈕做唔到 | 中 | 中 | 退做靜音開關（spec 已容許） | Frontend⚠️ **v1.9：關閉**（gain、CORS 得；靜音改用 gain，T-061）；側邊靜音撥掣見 R-029 |
| R-004 | 旗幟或者模糊濾鏡 fps 唔夠 | 中 | 中 | 降網格密度、限 DPR；模糊改用預先模糊嘅靜態圖 | Frontend⚠️ **v1.9**：模糊部分關閉（60 fps，CSS `blur()`）；旗幟部分已發生 → R-027 |
| R-005 | SVG 濾鏡（金屬紋、內陰影、落影）喺 iOS Safari 表現同 Chromium 有出入；單一 SVG 入面轉碟嘅 fps 未知（backlog B-032） | 中 | 中 | T-033 已完成：出一個真機預覽，順手量轉碟時嘅 fps；有出入就改用預先生成嘅貼圖，或者將隻碟抽出嚟做獨立一層 | Frontend⚠️ **v1.9：減低**（模糊部分關閉）；轉碟（碟轉 + 唱臂 + 進度圈）fps 未量：T-038 真機核對（U-24 ⑤） |
| R-006 | 用戶 dashboard 設定未做，部署任務卡住 | 中 | 中 | 所有開發同測試都可以喺本機模擬環境完成；只有 T-010、T-028、T-041 同真機測試受阻 | 用戶 / DevOps⚠️ **v1.9：減低**：Vercel（U-7）、D1 同 private bucket（U-3）、OAuth（U-4）已做；剩部署時入 secret（U-5）同之後嘅 GitHub secret（U-6） |
| R-007 | 呢個雲端 session 只可以 push 去 `claude/charming-cannon-8yulp0`；repo 未有 `main` | 高（已存在） | 低 | 用戶已定（決定 12，A-1）：全部留喺呢條 branch，第一個可用版本由用戶開 PR 入 `main`。每個任務一組 commit，review 同 QA 照做 | Main agent |
| R-008 | 管理端設計稿第 2 版、P-7 mockup 確認需要多輪 | 中 | 中 | Phase C、D、F、G 都唔受佢哋阻；mockup 同開發並行 | PM⚠️ v1.9：不變（仍然開）；T-116 令真內容唔使等設計稿 |
| R-009 | Mockup 用 Rokkitt 量字闊，真機有 Lubalin Graph 時字闊唔同。CR-004：用戶上載咗字體去 bucket 之後，所有裝置都會係 Lubalin Graph（只有 Book 字重；CR-005 D53：照 Book 粗幼，唔模擬粗體） | 高 | 低 | 版面以 Rokkitt 做準；E2E 兩隻字都影；字體載入後重新量字（T-044） | QA |
| R-010 | 真實媒體檔名（中文、空格、符號）令配對或者網址出錯 | 中 | 中 | `matchMediaFiles` 同砌網址嘅測試用真實檔名；用戶上載第一張碟之後即刻跑掃描 | Backend |
| R-011 | CR-003：儲存即生效而且冇版本記錄，儲存錯咗喺介面冇得還原（Functional Spec R-14） | 中 | 中 | 人手儲存、逐行驗證、清走成段歌詞同刪除要再確認（D30）；T-028 確認 D1 嘅時間點還原並寫入操作清單 | Backend / DevOps |
| R-012 | CR-003：管理端用自己嘅視覺語言，共用元件要重做（Functional Spec R-15） | 中 | 中（進度） | 行為照樣移植；T-051 已加 1 人日；金屬零件係咪同播放端共用，設計稿第 2 版確認之後定 | Frontend |
| R-013 | CR-003：T-029、T-042、T-096 會改到已凍結嘅 QA 鏈（`catalog-core`、`player-foundation`、`api-auth`）入面嘅檔 | 高（已確定） | 低 | 按 validation gate 只重驗有改動嘅部分；QA 欄已加 1 人日 | QA |
| R-014 | ~~CR-003：D30–D39 未確認，Backend 線喺 T-029、T-023、T-026 卡住；D32 會推翻已確認嘅 C4，可能唔被接受~~ **已解除（2026-11-25）**：用戶確認 D30、D31、D32、D34、D36–D39，D32 取代 C4 | — | — | 淨返 D35（統計項目）等 U-8：T-022 照建議做，設計稿第 2 版確認時有改就跟住調 API-010（細改） | PM / Backend |
| R-015 | CR-004：內容資料重新生成（T-097）改到 id、歌號或者配對結果，令 fixture、寫死嘅數同下游任務（T-027、T-040）對唔上；`discography.json` 而家冇生成 script | 中 | 中 | 已有 16 個 id 用明確對照表保持不變；寫死嘅數喺同一個任務改；T-097 要報告新嘅配對數字，唔可以估；T-027 排喺佢後面 | Backend |
| R-016 | CR-004：一次掃描要讀好多歌曲文字檔（原聲大碟 41 首），撞到 Worker 每個請求嘅操作上限 | 中 | 中 | ETag 冇變嘅唔讀；超過就分批；T-025 開工先照 Cloudflare 文件核實上限 | Backend |
| R-017 | CR-004：媒體 bucket 嘅 CORS 設漏（要包播放端同管理端兩邊嘅 origin，連本機開發）：掃描套用唔到封面、bucket 字體載入唔到 | 中 | 低 | U-1 列明；管理端講明原因；字體失敗用內建 Rokkitt | 用戶 / Frontend |
| R-018 | CR-004：用戶上載嘅資料夾名同預期唔同（短名串法未確認、序號或者 id 打錯），掃描搵唔到檔 | 中 | 低 | T-097 交一份 21 個資料夾名清單；管理端顯示預期資料夾名（可複製）；仍然可以手動改綁；`FOLDER_EMPTY` 嘅訊息寫明搵緊邊個名 | PM / Backend |
| R-019 | ~~CR-004：五條待確認（D43、D44、D47、D48、D49）同管理端設計稿補畫，令 Phase C 尾同 Phase E 再等。⚠️ CR-005：D43、D47、D48 已答；剩低 D44、D49 同 CR-005 帶出嘅幾條（U-17）~~ **已解除（2026-11-25，CR-006）**：U-17 全部答咗；CR-006 帶出嘅建議（U-19）照建議做，唔阻 | — | — | — | PM |
| R-020 | ~~CR-005：播放端設計稿第 18 版確認要多一輪，T-036 嘅淡出部分同 T-047 等住~~ **已解除（2026-11-25）**：第 18 版已確認（U-18）；多咗嘅範圍已拆成 T-048、T-049 | — | — | — | PM |
| R-021 | ~~v1.4：拎住嘅碟嘅歌單欄行高約 24pt（D57，用戶揀咗）喺真機容易㩒錯；歌號用專輯色，疊住同色嘅碟時對比偏低（開放問題）~~ **已關閉（2026-11-26，CR-008）**：歌單欄嘅行唔再係掣（D82，D57 作廢），冇㩒錯嘅問題；歌號顏色用戶睇過比較格之後決定照用專輯色（D90） | — | — | — | Frontend / QA |
| R-022 | CR-006：掃描變成主要資料來源。① 冇 `.txt` 嘅歌冇曲詞編監同歌詞、歌名用檔名（Functional Spec R-19）；② 第一次掃描一張碟要建立十幾至四十幾首歌、讀晒 `.txt`，撞 Worker 每個請求嘅操作上限（R-016）；③ 用戶改咗檔名嘅歌號，舊歌會變「音檔已不在資料夾」、新歌號當新歌（收藏唔跟過去，D61） | 中 | 中 | ① 掃描結果逐首標「沒有歌曲文字檔」，用戶可以照參考資料寫 `.txt` 再掃描；② `create` 分批，T-025 開工先核實上限；③ 掃描結果講明，管理端可以先改歌號再掃描；永遠唔自動刪歌（D62） | Backend / PM |
| R-023 | CR-007：管理端寫入公開嘅媒體 bucket，code 有錯會改壞用戶嘅 `.txt`（Functional Spec R-20） | 低 | 高 | 只兩條寫入路徑、server 砌 key、`onlyIf` 版本前提、冇 delete、測試鎖住；U-13 建議用戶喺電腦留一份 | Backend |
| R-024 | CR-007：封面喺瀏覽器處理：掃描期間要開住管理端；bucket CORS 冇管理端 origin 就處理唔到（Functional Spec R-22） | 中 | 低 | 檢查結果講明，下次掃描再試；U-1 | Frontend / 用戶 |
| R-025 | CR-007：改到 9 條已凍結嘅 QA 鏈，同已做嘅 code 有約 4 人日作廢；資料夾暫時唔見會令成張專輯列入移除（Functional Spec R-21） | 高（已確定） | 中 | 按 validation gate 只重驗有改動嘅部分；QA 欄已加 1.5；移除永遠確認先做 | QA / Backend |
| R-026 | CR-009：iOS 網頁冇得鎖方向，打橫時 app 將舞台反方向轉 90 度（Functional Spec D96、R-23）：系統照轉約 0.3 秒、狀態列走去側邊，可能閃一下；聽眾未必接受 | 中 | 中 | spike（T-010 ⑥）先喺真 iPhone 驗（瀏覽器分頁同主畫面兩種），T-111 先做完整版；唔接受得就返用「請打直」（T-039 嘅 code 喺 git 歷史，約 0.25 人日接返）；Android PWA 由 manifest 鎖直，唔受影響 | Frontend / 用戶⚠️ **v1.9：關閉**（已發生，已處理）：用戶兩個模式都唔接受轉向過場；D96 撤回、T-111 取消 |
| R-027 | v1.9（CR-010）：Preload 旗幟每格約 200 ms：開 app 嘅第一印象卡、主線程被佔，載入本身都慢咗 | 高（已量） | 中 | T-114：WebGL renderer + 2D 靜止一格後備；spike 5a 重量（U-24 ⑥） | Frontend |
| R-028 | v1.9：鎖屏 `play` action 從來冇收到：store 同實際播放對唔上（唱臂、唱片夾、時間錯） | 中 | 中 | 狀態跟 element 事件；設 `playbackState`、`positionState`；兩個 handler 都註冊（T-038）；真機核對（U-24 ③） | Frontend |
| R-029 | v1.9：側邊靜音撥掣開咗：MV（Web Audio）冇聲，唱片有聲 | 中 | 低至中 | 開電視手勢入面 `audioSession.type = 'playback'`；T-061 真機核對（U-24 ④）；唔得就喺電視顯示提示（另開 CR） | Frontend |
| R-030 | v1.9：長時間鎖機自動下一首失敗（spike 只換咗 3 次、每首 10–25 秒；903-player 見過 iOS 喺 `ended` 收起 audio session） | 中 | 高 | `ended` 同步換歌（已證明）；T-038 真機鎖機播完一整隻碟（U-24 ②）；唔得就改為畫面隱藏時喺結尾前 `EARLY_ADVANCE_S`（0.5 s）換歌 | Frontend |
| R-031 | v1.9：落針同出聲之間有延遲（1a 量到 0.5–0.6 秒） | 中 | 低 | 「停喺 0」預備；真機核對（U-24 ①）；唔得退返 1a 原樣 | Frontend |
| R-032 | v1.9：只驗咗一部 iPhone（iOS 18.7）：舊 iOS（16、17）同 Android Chrome 未驗 | 中 | 中 | 產品唔靠 1b 嘅窗口（照解鎖）；`audioSession`、`setPositionState` 特徵檢測；S3 發佈前搵一部 Android 同（如有）一部 iOS 16／17 行一次 U-24 清單（🅰️ Q6） | 用戶／QA |

---

## 依賴關係

### 內部依賴

```
T-001 ─┬─ T-002 ─┬─ T-029 ──────────┐
       │         │                  ▼
       │         ├─ T-022 ───────► T-023 → T-025（要 T-098）
       │         │     └ T-024 ──────────► T-026 → T-027（要 T-097、T-098）→ T-028
       │         ├─ T-097（內容資料；要新版來源檔）
       │         └─ T-031 → T-034（要 T-044）
       ├─ T-020 ─┬─ T-096 → T-022 → T-098（CR-004）→ T-025、T-027、T-052
       │         └─ T-021 ─────────── T-051 → T-052 → T-053 → T-083
       ├─ T-030 → T-032 ─┐
       │        └ T-033 ─┴ T-035 ─┬─ T-036（要 T-042、T-046）→ T-048 ─┐
       │                          ├─ T-037 ─┬──────────────────────┴ T-049
       │                          │         │
       │                          ├─ T-039 → T-041
       │                          └─ T-040
       └─ T-010 → T-011 ───────────────────┴ T-038（要 T-042）─┬─ T-060 → T-061
                                                              ├─ T-062
                                                              ├─ T-070、T-071
                                                              └─ T-072 → T-082（要 T-029）
T-043（播放端設計稿第 17 版，U-11 ✅ 2026-11-25 已確認）→ T-042 → T-036、T-038；T-043 → T-072、T-082
T-050（管理端設計稿第 2 版，U-8）→ T-051
T-023、T-025、T-029 → T-053
CR-004：T-035 → T-044 → T-034；~~T-024 → T-099（等 D48）→ T-027 嘅封面部分~~
CR-005：T-098 → T-100 ─┬─ T-099 → T-052（尺寸對位）
                       ├─ T-046 → T-034、T-036
                       └─ T-025
~~T-045（播放端設計稿第 18 版，U-18）→ T-047、T-036 嘅淡出部分、T-040 嘅第 18 版格~~ ✅ v1.4：T-045 完成（U-18），唔再阻
v1.4：T-036 → T-048 → T-049（亦要 T-037）；T-049 → T-038（接出聲，同一個 `start` 路徑）；T-048、T-049 → T-040 嘅拎住格
CR-006：T-098、T-100 → T-101 ─┬─ T-027
                              └─ T-052
        T-023 → T-102 ─┬─ T-025 → T-053
                       └─ T-053
CR-007：T-101、T-102 → T-103 → T-104 → T-105 → T-106 ─┬─ T-053
                                     │                 └─ T-055
                                     └─ T-052（亦要 T-106）
        T-050 第 4 版（U-8）→ T-051 ─┬─ T-052 → T-053 → T-083
                                    └─ T-055（要 T-105、T-106）
        T-099 取消（併入 T-106）；T-025、T-027 由 T-105、T-104 取代
CR-008：T-037、T-048、T-049（✅）→ T-108 ─┬─ T-040 嘅第 19 版格
                                          └─ T-038（接 `playFirst`、「播完」狀態）
CR-009：T-039、T-108（✅）→ T-109 ───────────────┐
        T-036、T-037、T-108（✅）→ T-110 → T-111 ─┼─ T-040 嘅第 20 版格、打橫 viewport
        T-039（✅）→ T-112                        │
        T-038（播完最後一首，要 T-011）────────────┘
        U-1 ②④ → T-010（加 ⑥ 打橫）→ U-2 → T-011 → T-038；T-010 ⑥ + T-111 → R-026 結論
CR-010：T-010、T-011、U-2（✅）→ T-038（進行中）─┬─ T-060 → T-061
                                                ├─ T-062
                                                └─ T-070、T-071、T-072
        T-034（✅）→ T-114 → U-24 ⑥ → T-115（拆 spike 頁）
        ~~T-110 → T-111~~（取消，D96 撤回）
        T-031、T-104（✅）→ T-113（已合併）──────────┐
        T-021、T-105、T-106（✅）→ T-116 ─┬─ 部署（用戶，U-5）→ U-1 CORS 加 Worker origin → Vercel `VITE_CATALOG_URL` 指 Worker
                                        │                     └─ T-041（拎走 T-113）←┘
                                        └─ T-051（設計外框）→ T-052、T-053、T-055（要 U-8）
```

⚠️ v1.9：T-038、T-114、T-116 互相唔依賴，可以並行（T-038 同 T-114 都喺 `apps/player`，但檔案唔重疊：`src/playback`、`app/useHome` vs `components/flag`）；T-115 等 T-114 量完。⚠️ v1.8：T-109、T-110、T-112 互相唔依賴，可以並行（T-109 同 T-110 都掂 `layouts/phone.ts`，合併時要留意）；T-111 排喺 T-110 之後（同一批手勢檔）。可以並行嘅三條線：**Backend**（CR-007：T-103 → T-104 → T-105 → T-106；CR-006：T-101、T-102 起，之後 T-025、T-027；~~CR-004：T-098、T-097 起，之後 T-025、T-027~~）、**播放端**（T-034、T-036、T-037、T-046、T-047 起，之後 T-048 → T-049）、**Mockup 確認**（T-050 補畫 → U-8；U-11 已完成）。佢哋只共用 `packages/catalog`。

### 外部依賴（要用戶做）

| 編號 | 事項 | 影響任務 | 幾時要 |
| --- | --- | --- | --- |
| U-1 | ⚠️ **2026-11-26 用戶回覆「2/ 攪埋」：② CORS 已設（呢個 session 去唔到 bucket，冇自己驗證；T-010 真機一齊驗）。只剩 ④ 測試檔。** 之前：v1.8（2026-11-26）：剩低 ② 同 ④（①③ 已做）。② CORS 容許嘅 origin 而家知道咗：`https://rgram.vercel.app`（播放端）、`http://localhost:5173`、`https://localhost:8787`（開發；管理端 Worker 網址部署之後再加）；現成嘅 JSON 已經畀咗用戶。④ 測試檔放 **`album-11-komorebi/`**（KOMOREBI，決定 14）。T-010 只等呢兩樣。以下係之前嘅寫法：⚠️ **CR-004 改寫**（CR-006：**仍然未做**；CORS 冇播放端 origin，字體會跌返 Rokkitt）。媒體 bucket **`rb-discography`**（✅ 用戶已開；`r-gram-media`、`r-gram-album` 兩個名作廢）：① 開公開存取（`r2.dev` 網址或者自訂網域），將公開網址話畀我（填 `MEDIA_BASE`）；② 設 CORS：容許嘅 origin = **播放端**（Vercel 網址，MV 音量同字體要用）**同管理端**（Worker 嘅網址，掃描套用封面要用），開發期間加 `http://localhost:5173` 同 `https://localhost:8787`；method `GET`、`HEAD`；容許 `Range` header；③ 唔好開列目錄；④ 上載一張碟嘅測試檔：2–3 首歌（`.m4a` 或 `.mp3`）+ 1 個 MV（`.mp4`，fast start），檔名以歌號開頭，放喺嗰張碟嘅資料夾（命名見 U-13）。~~**用邊張碟未定（決定 14）**~~ ✅ KOMOREBI，`album-11-komorebi`（CR-009） | T-010、T-025、T-028、T-044、T-053 | Phase B 開始前。**CR-005：仍然未做**（CORS 要加播放端同管理端 origin） ⚠️ **CR-007**：管理端 origin 更加重要：掃描時封面喺管理端頁面由 bucket 攞原圖；管理端寫返文字檔經 Worker，唔使開 bucket 嘅 PUT CORS⚠️ **v1.9**：④ KOMOREBI 測試檔已用（spike 過咗）；**T-116 部署之後**：CORS 加 Worker origin `https://r-gram-api.dcwhung.workers.dev`（管理端封面處理要） |
| U-2 | 用 iPhone 開 spike 網址，照清單逐項試（約 15 分鐘）。⚠️ v1.8：加 ⑥ 打橫（瀏覽器分頁同加咗落主畫面），答接唔接受（R-026） | T-011、T-111 嘅結論 | T-010 完成後✅ **2026-11-26 完成**（Safari 分頁同主畫面 App 各一次；結果入咗 spike 報告；打橫唔接受 → D96 撤回） |
| U-3 | ✅ **2026-11-26 完成**：R2 private bucket 叫 **`rb-discography-catalog`**（~~`r-gram-catalog`~~）；D1 開咗 `r-gram`（id 由 T-116 填入 `wrangler.toml`） | ~~T-028~~ T-116 | 完成 |
| U-4 | ✅ **2026-11-26 完成**：Google Cloud OAuth client（client id 由 T-116 填入 `wrangler.toml`）。**請確認**已登記 redirect URI `https://r-gram-api.dcwhung.workers.dev/auth/google/callback`（本機開發另加 `https://localhost:8787/auth/google/callback`） | ~~T-028~~ T-116 | 完成（redirect URI 等確認） |
| U-5 | Worker secret：`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`；⚠️ v1.9 加 **`ADMIN_EMAILS`**（白名單 email，唔入公開 repo） | T-116（第一次部署，用戶喺自己電腦照指引第 2 部分行） | 部署時 |
| U-6 | GitHub secret：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。⚠️ v1.9：手動部署**唔使**；`deploy-api.yml`（T-028）先要 | T-028 | T-028 時 |
| U-7 | ✅ **2026-11-26 完成**：用戶開咗 Vercel project、連咗 repo；播放端網址 **`https://rgram.vercel.app`**。repo 嘅預設 branch 就係 session branch（`claude/charming-cannon-8yulp0`），所以 Vercel 自動用佢（A-7 唔再需要）。✅ 用戶 2026-11-26 回覆「攪晒」：網站開到、`VITE_FONT_URL` 已設（呢個 session 去唔到 vercel.app，冇自己驗證；T-041 照樣檢查一次）。以下係之前嘅寫法：~~**仍然未做**。~~ Vercel 開 project 連 repo（`VITE_CATALOG_URL` 可以到 T-041 先設；CR-006：連 `VITE_FONT_URL` = `<MEDIA_BASE>_fonts/lubalin-graph-book.otf`）。**決定 13：提前到 T-010 之前**，spike 頁放喺度；用邊條 branch 部署見 A-7 | T-010、T-041 | **Phase B 開始前**（之前係 Phase D 尾） |
| U-8 | ⚠️ **CR-007：確認管理端設計稿第 4 版**（`_mockups_/admin/`，commit `8fb28a7`）：CD 展示架、hi-fi 機面板（四個指針錶 = 統計，Functional Spec D35、D80）、掃描結果分組、專輯頁（`info.txt` 文字框、唯讀欄、封面兩格、灰色行、歌曲文字框）、冇 `info.txt` 嘅專輯頁。一齊確認第 4 版已經話咗畀用戶知嘅做法：專輯色只由 `cover.jpg` 自動抽；歌名以 `info.txt` 為準、檔名對唔上只出檢查結果；冇 `info.txt` 嘅資料夾照加、用 id 做名；掃描結果嘅分組同移除剔選；音檔冇咗確認移除之後歌變灰、歌詞同 MV 唔再顯示。之前：~~確認管理端設計稿第 2 版（連 CR-004 至 CR-006 補畫）~~（第 3 版 `29309fd` 用戶 2026-11-26 睇過，由 CR-007 取代） | T-051、T-052、T-053、T-055 | 而家（第 4 版已出） |
| U-9 | 確認 P-7 各裝置 mockup | Phase I–K | 各自出稿後 |
| U-10 | 高清 / 向量 RubberBand logo（冇就用現有圖） | T-034、T-070 | 唔阻開發 |
| U-11 | ~~確認播放端設計稿第 16 版（`_mockups_/home-turntable/`，commit `e6f367c`；補兩格 commit `7ecf24b`：歌詞冇時間標記時嘅歌書、冇歌專輯嘅歌單）~~ ✅ **2026-11-25 完成**：用戶睇過第 16、17 版，答「用框入面斷行，第 17 版確認」。第 17 版（commit `3cfc327` 至 `9d0c9d6`）係播放端嘅 Design Source，包埋第 16 版嘅內容 | 已解除：T-036、T-042、T-072；T-037 嘅空狀態、T-082 嘅歌詞版面；T-038 嘅設計稿部分（T-038 仲要等 T-011） | 完成 |
| U-12 | ~~確認 Functional Spec D30–D39~~ ✅ **2026-11-25 完成**：用戶答「嗰 8 條跟建議」，D30、D31、D32、D34、D36–D39 已確認（D33 係技術決定；D35 轉去 U-8）。本文件 A-7、A-8 唔喺嗰八條問題入面，仍然係建議，要另外問（見開放問題） | 已解除：T-029、T-096、T-022、T-023、T-026；D36：T-038；D38：T-082。仍然等：~~A-7（T-010）~~（v1.8：唔再需要）、A-8（T-028、T-041） | D30–D39：完成；A-7、A-8：Phase B 前 |
| U-13 | ⚠️ **CR-007 改寫：照資料夾規則上載專輯**去 `rb-discography`（**而家係唯一資料來源**）。每張專輯一個資料夾，全部同一層，名 = `<類別>-<NN>-<id>`（例如 `album-11-komorebi`；類別 `album`／`ep`／`best`／`live`／`ost`／`single`；名決定 id、類別、序號，改名 = 改專輯）。資料夾入面：① **`info.txt`**（UTF-8）：`唱片名稱：…`、`發行年份：…`、`曲目：` 之後每首一行 `1. 歌名`（`01.`、`1、` 都得；可以跳號；冇音檔嘅歌照列，播放端會灰色）；② `cover.jpg`（或者 `.png`，最好正方形、1200 或以上；會置中裁切）、可選 `cover2.jpg｜png`；③ 音檔 `NN 歌名.m4a｜mp3`（歌號要同 `info.txt` 一樣）；④ 可選 `NN 歌名.txt`（曲詞編監同歌詞，格式同而家一樣；`副題：` 唔再用）；⑤ 可選 MV `NN 歌名.mp4｜m4v`（fast start）。精選、現場碟嘅歌**要喺自己資料夾放一份音檔**（唔可以再借其他資料夾）。上載完喺管理端㩒「掃描」。**建議喺自己電腦留一份成個資料夾**（管理端會寫返 `info.txt` 同 `.txt`，Functional Spec R-20）。之前（CR-004 至 CR-006 嘅講法，作廢）：~~手動指定其他資料夾音檔、冇 `info.txt`、歌由音檔建立~~ | T-105、T-055 嘅真實驗證；內容完整度 | 而家（T-097 嘅資料夾名清單喺 review 修正之後交）；唔阻開發（開發用本機模擬 bucket） |
| U-14 | ✅ **2026-11-25 完成**（用戶已上載去媒體 bucket；檔名見 U-16）。~~**CR-004（可選）：上載 slab 字體**去 `rb-discography/_fonts/`（ITC Lubalin Graph Std Book；`.woff2` 最好，`.otf` 都得；想要真粗體可以多上載一個較粗嘅檔），將檔案網址話畀我，或者自己喺 Vercel 設 build 變數（建議名 `VITE_FONT_URL`，T-044 已定案；只有一個網址），之後重新 build 播放端。**字體檔唔好放入 repo**。留意：bucket 係公開網址，知道網址嘅人下載到（Functional Spec R-16）；唔上載就用內建 Rokkitt~~ | T-044 嘅真機驗證 | 完成 |
| U-15 | **CR-004：答七條問題**。✅ **2026-11-25 答咗五條**（CR-005）：D43 接受、D47「按類型再按編號」、D48 → D50「細嘅自動放大到 1200」、D23 → D51「斷成兩行」、播緊時轉碟 → D52。**剩低 D44、D49，搬去 U-17** | — | 部分完成 |
| U-16 | ✅ **2026-11-25 完成**（CR-006）：檔案 `_fonts/lubalin-graph-book.otf`；`VITE_FONT_URL` = `<MEDIA_BASE>_fonts/lubalin-graph-book.otf`（本機 `.env.local`；正式版喺 Vercel，U-7、T-041）。~~**CR-005：話我知字體檔喺 bucket 嘅檔名**（或者自己喺 Vercel 設 `VITE_FONT_URL` = `<MEDIA_BASE>_fonts/<檔名>`，一定要 https），之後重新 build 播放端。同時確認 bucket CORS 有播放端 origin（U-1），否則字體會跌返 Rokkitt~~ | T-044 嘅真機驗證、T-041 | 完成（真機驗證等 U-1、U-7） |
| U-17 | ✅ **2026-11-25 完成**（CR-006）：① D44「由類別自動帶出」；② D49 由 D60 取代（掃描係主要資料來源）；③ `.mp3`、手動指定音檔：兩樣都係；④ `cover2.png`：收；⑤ S-119：只要年份（2016）。~~**CR-005：答以下問題**（全部有建議，見「開放問題」）：① D44「類型」欄；② D49 掃描新增歌曲（改為以音檔做錨嘅問法）；③ D54 兩個例外：`.mp3` 算唔算音檔、手動指定音檔嘅歌照唔照匯入自己資料夾嘅 `.txt`／MV；④ D55 `cover2.png` 收唔收；⑤ review S-119：「終於好天氣（方皓玟 × RubberBand）」來源只有 2016-06，冇完整發行日期同唱片公司，要唔要補~~ | ①：T-052；②③④：T-025（照建議先做）；⑤：T-027（唔阻開發，管理端之後都改到） | 完成 |
| U-18 | ~~**CR-005：確認播放端設計稿第 18 版**（`_mockups_/home-turntable/`，commit `ae30893`）：轉盤真實 22 格；左上長歌名兩行嘅數值；播緊時揀碟嘅淡出淡入，連「喺另一隻碟鬆手」（唱臂泊位、唔顯示歌名、㩒唱片夾開歌單）~~ ✅ **2026-11-25 完成**：用戶確認第 18 版（第 ③ 點改咗幾輪，source commit `4e739cd`；「喺另一隻碟鬆手」改為拎住嗰隻碟：細唱片機 + 歌單欄） | 已解除：T-036、T-047、T-040；新任務 T-048、T-049 | 完成 |
| U-19 | **CR-006：確認 PM 建議**（Functional Spec §CR-006；全部照建議做，唔阻開發）：① D60 歌號跟檔名、可以跳號、可以改，拖動排序取消（✅ 用戶 2026-11-25 同意）；② D61 歌 id 建立時 = `<專輯 id>-<兩位歌號>`、之後不變；③ D62 音檔消失唔自動刪歌，確認後只清音檔連結；④ D63 細項：`releaseDate` 刪走、冇年份時橫線照畫；⑤ D59 細項：初始資料連唱片公司；⑥ D64 歌單同 credit 留做參考資料 | ①②：T-102；③：T-025；④：T-101；⑤：T-027；⑥：冇 | 對應任務開工前（未答照建議做） ⚠️ **CR-007**：②（D61）照用；①（D60）改為跟 `info.txt`；③（D62）併入 D76；⑤（唱片公司）作廢；④⑥ 不變 |
| U-20 | **CR-007：確認 PM 建議**（Functional Spec §CR-007 標 🅰️ 嘅；未答照建議做，唔阻開發）：`info.txt` 格式細節（D68）；歌號唔喺 `info.txt` 嘅音檔唔加（D70）；冇 `info.txt` 照加專輯（D70）；歌名以 `info.txt` 為準（D70）；轉盤次序固定 = 類別 → 序號 → id（D69）；封面置中裁切、冇人手上載、專輯色只自動抽（D69、D74）；移除逐項剔選 + 一個確認（D73）；舊檔 `副題：` 行略過（D72）；取消批量匯入、由同名歌帶入、參考連結（D81）；要唔要 T-107（由參考資料生成起始 `info.txt`／`.txt`，D79） | T-103、T-105、T-055、T-107 | 對應任務開工前；畫面部分同 U-8 一齊 |
| U-21 | ~~**App icon**：用戶要求，另一個 session 設計緊；確認之後由 T-039（PWA manifest）接入~~ ✅ **2026-11-26 完成**：用戶揀方案 D（黑碟，`_mockups_/app-icon/export/d-black-disc/`），T-039 已接入（`beb3324`；Functional Spec D94）。壓縮 icon 檔見 backlog B-085 ① | T-039 | 完成 |
| U-22 | **CR-008：確認主 session 代決定嘅實作對齊**（Functional Spec §CR-008「實作對齊」；code 已經咁做，未答照現狀，唔阻開發）：① S-157 比較歌名唔理檔名放唔到嘅符號（`Re: SimpleLoveSong` ＝ `Re SimpleLoveSong.m4a`）；② S-161 `info.txt` 曲目行 `01 - 歌名` 嘅橫線當分隔；③ S-164 `info.txt` 用唔到（唔係 UTF-8、太大、讀唔到）而之前用過：保留上次嘅碟名、年份、曲目，唔列移除；④ S-166 改歌號 = 新歌（收藏跟舊 id），接受；⑤ S-181 太大嘅 `info.txt`／歌曲文字檔唔可以喺管理端覆蓋，要喺電腦改細；⑥ S-183 等緊確認移除嘅歌唔可以存歌曲文字 | 有異議先改 code（T-105、T-106 嘅檔）；④：T-028 runbook、T-053 提示 | 唔阻開發 |
| U-23 | **CR-009：確認 PM 建議**（Functional Spec §CR-009 標 🅰️ 嘅；未答照建議做，唔阻開發）：① 版本掣：暗層開住唔入 Tab 次序、弧線歌單嘅 Tab 兜圈唔包、Preload 期間唔出（D95）；② 打橫反方向轉跟系統轉向角度、讀唔到當向左打橫、安全區跟住轉（D96）；③ 接駁位讀屏唔讀（D97）；④ 播完最後一首：3 秒內做其他操作即刻變返未揀歌、歌書／MV 開住收埋先計、唔記續播位置、Shuffle 一樣、拎住期間播完返去即刻未揀歌（D99） | T-109、T-111、T-110、T-038 | 對應任務開工前；唔阻開發⚠️ v1.9：② 作廢（D96 撤回） |
| U-24 | **v1.9（CR-010）：真機核對清單**（spike 報告 §3；每次約 10–15 分鐘，iPhone 分頁 + 主畫面 App）：① 落針即出聲（冇半秒延遲）② 鎖機播完一整隻碟（≥ 5 首正常長度）；最後一首之後停、鎖屏冇嘢 ③ 鎖屏暫停 → 等 10 秒 → 鎖屏播放；返入 app 唱臂、唱片夾、時間一致；耳機掣 ④ 側邊靜音撥掣開：MV 有冇聲；MV 之後唱片鎖屏仲正常 ⑤ 播緊時碟轉同唱臂順唔順 ⑥ spike 5a 旗幟重量（兩個模式）⑦ Android Chrome（同可以嘅話舊 iPhone）行 ①–④ | ①②③⑤：T-038「完成」；④：T-061；⑥：T-114、T-115；⑦：S3 發佈前 | 各任務合併、部署之後；唔阻開發 |
| U-25 | **v1.9（CR-010）：確認預設**（🅰️；主 session 照做，唔阻）：Q1 旗幟用 WebGL — 係；Q2 側邊靜音撥掣開咗 MV 照有聲 — 係；Q3 鎖機時自動下一首載入失敗跳過一次（只限畫面隱藏）— 係；Q4 鎖屏「上一首」播咗超過 3 秒 = 由頭播 — 係；Q5 spike 頁留到旗幟重量完先拆 — 係；Q6 發佈前喺 Android 同較舊嘅 iPhone 行核對清單 — 有就做；另：「請打直」照 T-039 嘅樣（D101） | T-114、T-061、T-038、T-115、S3 | 唔阻；有異議就改 |

---

## 工作量估算

單位：理想人日（粗略；已包自測，未包 review 同 QA 嗰兩欄以外嘅來回）。括號係 v1.0 嘅數。2026-11-25 設計稿第 17 版補充之後：Phase D 前端 18 → 19、Phase H 前端 3 → 3.5，總計 80.5 → 82。**v1.2（CR-004）**：Phase C 後端 10.5 → 15.5、Phase D 前端 19 → 20、Phase E 前端 10 → 12、QA + Review 14.5 → 16，總計 82 → 91.5。**v1.3（CR-005）**：Phase C 後端 15.5 → 17、QA 3.5 → 4；Phase D 前端 20 → 22、QA 6 → 6.5；Phase E 前端 12 → 13.5，總計 91.5 → 97.5。**v1.4（第 18 版確認）**：Phase D 前端 22 → 26、QA 6.5 → 7.5，總計 97.5 → 102.5。**v1.5（CR-006）**：Phase C 後端 17 → 18.5、QA 4 → 5；Phase E 前端 13.5 → 14.5，總計 102.5 → 106。**v1.6（CR-007）**：Phase C 後端 18.5 → 25.5、QA 5 → 6.5；Phase E 前端 14.5 → 14；Phase H 前端 3.5 → 3、後端 0.5 → 0，總計 106 → 113。**v1.7（CR-008）**：Phase D 前端 26 → 29.5、QA 7.5 → 8.5，總計 113 → 117.5。**v1.8（CR-009）**：Phase B 前端 2 → 2.25；Phase D 前端 29.5 → 35.5、QA 8.5 → 10，總計 117.5 → 125.25。**v1.9（CR-010）**：Phase B 前端 2.25 → 2.5；Phase C DevOps 0.5 → 0.25；Phase D 前端 35.5 → 37.75、QA 10 → 10.25；Phase E 前端 14 → 14.25、DevOps 0 → 0.5、QA 1.5 → 1.75；Phase F 前端 5 → 4.75，總計 125.25 → 128.5。

| Phase | 前端 | 後端 | DevOps | QA + Review | 總計 |
| --- | --- | --- | --- | --- | --- |
| A 基礎 | — | 2 | 1 | 0.5 | 3.5 |
| B 真機 spike | 2.5（2） | — | — | — | 2.5（2） |
| C Backend API | — | 25.5（9） | 0.25 | 6.5（2） | 32.25（11.5） |
| D 播放端核心 | 37.75（16.5） | — | 0.5 | 10.25（5；包 T-040） | 48.5（22） |
| E 管理端 UI | 14.25（8） | — | 0.5 | 1.75 | 16.5（9.5） |
| F MV 同系統整合 | 4.75（5） | — | — | 1 | 5.75（6） |
| G 收藏、模式、歌書 | 4 | — | — | 1 | 5 |
| H 歌詞 | 3（4） | 0（2） | — | 1 | 4（7） |
| I–K 其他裝置 | 9 | — | — | 1.5 | 10.5 |
| **總計** | **75.25（48.5）** | **27.5（13）** | **2.25（2）** | **23.5（13.5）** | **128.5（77）** |

Phase L 未計。

CR-003 嘅增減：

| 項目 | 人日 |
| --- | --- |
| 取消 T-054、T-080、T-081；T-026 簡化 | −1、−1、−1.5、−0.5 |
| T-083 範圍收窄 | −0.5 |
| T-050 第 2 版（已做）、T-051、T-053 | +1.5、+1、+0.5 |
| T-029、T-096、T-023 | +1、+0.5、+0.5 |
| T-042、T-043（已做）、T-082 | +1、+0.5、+0.5 |
| QA + Review（重驗已凍結嘅鏈、新任務） | +1 |
| **淨增（CR-003，v1.1）** | **+3.5** |
| 設計稿第 17 版補充（2026-11-25）：T-043 第 17 版（已做）、T-042 加唱針開場、T-082 兩個歌詞版面 | +0.5、+0.5、+0.5 |
| **合共（77 → 82）** | **+5** |

第 17 版嘅其餘內容唔改估算：T-036 嘅字母規則係一個純函數加細點（留喺 2 人日）；T-038、T-072 嘅範圍冇變。

CR-004 嘅增減（v1.2）：

| 項目 | 人日 |
| --- | --- |
| T-025 掃描連封面來源同歌曲文字檔（1 → 2.5） | +1.5 |
| T-097 內容資料重新生成（新） | +1.5 |
| T-098 專輯資料模型、資料夾規則、bucket 改名（新） | +1 |
| T-099 封面尺寸規則（新；等 D48，唔接受就取消） | +0.5 |
| T-027 seed 跟新資料、類別同序號、封面（1 → 1.5） | +0.5 |
| T-044 播放端字體（新） | +1 |
| T-050 管理端設計稿補畫、T-052（2 → 2.5）、T-053（2.5 → 3.5） | +0.5、+0.5、+1 |
| QA + Review（新任務；重驗已凍結嘅鏈：`api-albums`、`api-assets`、`api-auth`、`catalog-core`、`player-catalog`、`player-foundation`） | +1.5 |
| **淨增（CR-004）** | **+9.5** |
| **合共（77 → 91.5）** | **+14.5** |

唔改估算：T-034（只加依賴）、T-036（規則已有，只係由第一日起適用）、T-040（換 fixture）。

CR-005 嘅增減（v1.3）：

| 項目 | 人日 |
| --- | --- |
| T-100 第二張封面：資料模型、內容檔、專輯 API（新） | +1 |
| T-025 音檔做錨、`cover2.jpg`（2.5 → 3） | +0.5 |
| T-045 播放端設計稿第 18 版（新；已出） | +0.5 |
| T-046 播放端隨機封面（新） | +0.5 |
| T-047 左上歌名兩行（新） | +0.5 |
| T-036 揀碟時淡出淡入、碟停轉（2 → 2.5） | +0.5 |
| T-050 再補畫、T-052（2.5 → 3）、T-053（3.5 → 4） | +0.5、+0.5、+0.5 |
| T-099 改範圍（放寬規則取消，加第二張封面兩個欄） | 0 |
| QA + Review（T-100、T-046、T-047；重驗 `api-albums`、`api-auth`（schema）、`catalog-core`、`player-catalog`、`player-home`） | +1 |
| **淨增（CR-005）** | **+6** |
| **合共（77 → 97.5）** | **+20.5** |

唔改估算：T-027（放大同出縮圖用同一個圖片處理步驟）、T-034（只係叫 T-046 嘅函數）、T-044（唔使改 code）。D49 確認後嘅「新增歌曲」已計入 T-025 嘅 2.5。Noto Sans HK 如果併入 T-044（開放問題），再加 0.5。

v1.4（CR-005 補充：第 18 版確認）嘅增減：

| 項目 | 人日 |
| --- | --- |
| T-048 拎住另一隻碟、細唱片機（新，由 T-036 拆出） | +1.5 |
| T-049 拎住嘅碟嘅歌單欄（新，由 T-036 拆出） | +2 |
| T-045 第 ③ 點多咗幾輪（已做；0.5 → 0.5 + 0.5） | +0.5 |
| T-040 第 18 版嘅格同「拎另一隻碟」流程（1.5 → 2） | +0.5 |
| QA + Review（T-048、T-049；重驗 `player-home`、`player-core`、`player-foundation` 嘅受影響檔） | +0.5 |
| **淨增（v1.4）** | **+5** |
| **合共（77 → 102.5）** | **+25.5** |

CR-006 嘅增減（v1.5）：

| 項目 | 人日 |
| --- | --- |
| T-101 專輯只有年份、刪 `releaseDate`／`type`（新；D1、API、內容檔、seed script、fixtures） | +1 |
| T-102 歌號跟檔名、歌 id 跟歌號、API-023 取消（新） | +1 |
| T-025 掃描建立歌曲、「音檔已不在資料夾」（3 → 3.5） | +0.5 |
| T-027 只入專輯，唔使圖片處理（1.5 → 0.5） | −1 |
| T-050 再補畫（CR-006 嘅畫面） | +0.5 |
| T-053 掃描結果兩類、歌號欄（4 → 4.5） | +0.5 |
| QA + Review（T-101、T-102；重驗 `api-albums`、`api-tracks`、`api-catalog`、`api-auth`（schema）、`catalog-core`、`seed-tools`、`player-catalog`） | +1 |
| **淨增（CR-006）** | **+3.5** |
| **合共（77 → 106）** | **+29** |

唔改估算：T-052（換欄）、T-037、T-049（顯示 `track.no` 本身已經係咁計）、T-044（唔使改 code）。T-025 入面原本預留嘅「D49 新增歌曲」改做「建立歌曲」，所以只加 0.5。

CR-007 嘅增減（v1.6）：

| 項目 | 人日 |
| --- | --- |
| T-103 `info.txt` 同資料夾名 parser（新） | +1 |
| T-104 資料模型、內容檔、拎走人手寫入 API 同 seed、fixtures（新） | +2 |
| T-105 全 bucket 同步（新） | +3 |
| T-106 寫返 bucket、封面結果 endpoint（新） | +1.5 |
| T-099 取消（併入 T-106） | −0.5 |
| T-050 管理端設計稿第 4 版（已出） | +1 |
| T-052（3 → 2）、T-053（4.5 → 1.5）、T-055 掃描畫面（新，2.5） | −1、−3、+2.5 |
| T-083 只留播音檔對時（1.5 → 0.5；前端 −0.5、後端 −0.5） | −1 |
| QA + Review（T-103–T-106、T-055；重驗 `api-albums`、`api-tracks`、`api-media`、`api-catalog`、`api-auth`（schema）、`catalog-core`、`catalog-song-text`、`player-catalog`） | +1.5 |
| **淨增（CR-007）** | **+7** |
| **合共（77 → 113）** | **+36** |

唔計入總數：T-107（可選，0.5，等用戶揀）；已做而作廢嘅約 4 人日（已經用咗，唔再計）。唔改估算：T-051（外框同共用元件，第 4 版仍然係鋁面板）、T-028（runbook 換步驟）、全部播放端任務（只改 fixtures，喺 T-104）。

CR-008 嘅增減（v1.7）：

| 項目 | 人日 |
| --- | --- |
| T-108 揀碟歌單欄第 19 版（新）：拎走同反轉已做嘅 code（`playHeldTrack`、`startHeld`、行 focus、`openList` 守衛、D57 例外）0.5；`showsColumn`、細掣、唱臂規則同 `playFirst` 1；`PANEL_FLOAT` 飄落、停定先出、鬆手縮短 0.75；`LIST_FLOAT` 由歌單欄飄落弧線 0.5；「已播完」、核對細唱片機嘅字、淨空規則 0.25 | +3 |
| T-045 播放端設計稿第 19 版（已做） | +0.5 |
| T-040 第 19 版嘅格同新流程（2 → 2.5） | +0.5 |
| QA + Review（T-108；重驗 `player-holding`、`player-list`、`player-home`、`player-dial`、`player-core`、`player-foundation` 嘅受影響檔） | +0.5 |
| **淨增（CR-008）** | **+4.5** |
| **合共（77 → 117.5）** | **+40.5** |

T-108 嘅理由：大部分係改已有嘅元件（歌單欄、細唱片機、唱片夾、`stageReducer`），唔使新元件；但有兩個新過場（`PANEL_FLOAT`、`LIST_FLOAT`）同一個橫跨六條 QA 鏈嘅顯示規則，T-048 + T-049（3.5）係最接近嘅參考，今次冇新元件、有更多過場，所以估 3（團隊上限 3 日）。超出就將 `LIST_FLOAT`（飄落弧線，0.5）拆做獨立任務。唔改估算：T-038（同一個 `start` 路徑；「播完」狀態本身已經要做）、T-037、T-039（CR-008 嘅部分已喺修正做咗）、T-048、T-049（已完成；作廢約 0.5 人日唔再計）。

CR-009 嘅增減（v1.8）：

| 項目 | 人日 |
| --- | --- |
| T-109 版本掣（新）：元件、`updatePill` 幾何同顏色、閃嘅 token 0.25；`TopGroup` 圖層（暗層下面）、`covered`、Tab 次序 0.25；`UpdatePort` context、`applyNow`、拎走 `update-prompt`／`data-trap-stop`／舊字串 0.25；淨空、減少動態效果、測試 0.25 | +1 |
| T-110 頭尾相接（新）：弧線歌單圈數學（摺返、`loopWindow`、圈上吸附、頭尾相接鍵盤）0.75；接駁位元件同 `LIST_FLOAT` 摺返行 0.5；旋鈕唔夾、`mod`、指針跳 0.25；碟疊 `stackOffset`、窗口、次序 0.25；測試 0.25 | +2 |
| T-111 手機打橫轉返（新）：`quarterTurn`、舞台 transform、闊高對調 0.5；安全區 left／right 同轉向 0.25；`toStagePoint`、`useDragScroll`、旋鈕測試 0.25；拎走 `rotate-notice`／`covered`／字串 0.25；真機問題修正預留 0.25 | +1.5 |
| T-112 app icon 細尺寸（新）：抄四個檔、`APP_ICONS`、manifest、`iconLinks()` 0.25；測試同 build／PWA 檢查 0.25 | +0.5 |
| T-038 播完最後一首（2 → 2.5）：3 秒 timer 同「放低隻碟」、提早結束、續播記錄、測試 | +0.5 |
| T-010 加 ⑥ 打橫（1.5 → 1.75）：spike 頁一個反方向轉嘅舞台 | +0.25 |
| T-045 播放端設計稿第 20 版（已做） | +0.5 |
| T-040 第 20 版嘅格、播完、打橫 viewport（2.5 → 3） | +0.5 |
| QA + Review（T-109–T-112；重驗 `player-pwa`、`player-home`、`player-holding`、`player-list`、`player-dial`、`player-foundation`、`player-core` 嘅受影響檔） | +1 |
| **淨增（CR-009）** | **+7.75** |
| **合共（77 → 125.25）** | **+48.25** |

唔計入：T-039 嘅 `update-prompt`、`rotate-notice` 作廢（約 0.5 人日，已用咗）。T-110 估 2：最接近嘅參考係 T-037（弧線歌單，1.5）同 T-036 嘅旋鈕部分；今次係改已有嘅純函數同兩個元件，冇新過場，所以低過團隊上限。T-111 估 1.5：主要風險喺真機（R-026），已經預留 0.25；真機唔接受得就返用「請打直」，T-111 嘅大部分會作廢。

CR-010 嘅增減（v1.9）：

| 項目 | 人日 |
| --- | --- |
| T-038 按 spike 報告（2.5 → 3.25）：外部 store 同 `useHome` 搬遷 0.25、Media Session 狀態同步同系統暫停／恢復 0.25、卡住重試同錯誤 0.25 | +0.75 |
| T-111 取消（D96 撤回） | −1.5 |
| T-113 臨時測試 catalog（新；已做） | +0.5 |
| T-114 Preload 旗幟 WebGL（新）：renderer 1、shader 同常數生成 0.5、後備同 context lost 0.25、測試 0.5、真機量度同調整 0.25 | +2.5 |
| T-115 拆 spike 頁（新；Phase B） | +0.25 |
| T-061 只用 gain（1.5 → 1.25） | −0.25 |
| T-116 冇設計嘅同步頁同部署準備（新）：scaffold 同登入 0.75、同步 runner 0.5、封面處理 0.75、記錄同移除清單 0.25（前端 2.25）；`[assets]`、`ADMIN_EMAILS` secret、`wrangler.toml` 值、用戶部署指引 0.5（DevOps） | +2.75 |
| T-051（2.5 → 1.75：scaffold 同登入搬去 T-116）、T-055（2.5 → 1.25：同步 runner 同封面處理搬去 T-116） | −0.75、−1.25 |
| T-028（0.5 → 0.25：第一次部署嘅指引搬去 T-116） | −0.25 |
| QA + Review（T-113 輕量、T-114、T-116 新鏈 `admin-sync`、T-038 新鏈 `player-playback`（已計喺原本 T-038 嘅份）；T-115 重驗 `player-pwa`、`repo-scaffold`、`player-foundation`；減 T-111 嘅份） | +0.5 |
| **淨增（CR-010）** | **+3.25** |
| **合共（77 → 128.5）** | **+51.5** |

唔計入：T-111 已用咗嘅大約一個鐘（branch 留底，唔再計）。T-116 由 T-051、T-055 搬嚟嘅 2 人日唔重複計：淨新增 0.75（部署準備 0.5 + 臨時記錄頁 0.25）。T-062 暫時不變（Media Session 移入 T-038，T-038 完成後再睇可唔可以減 0.5）。T-114 估 2.5（團隊上限 3）：超出就將截圖比對拆開。

v1.4 嘅「唔改估算」：T-036（2.5；「喺另一隻碟鬆手 = 泊位」嗰部分作廢，加嘅「左上歌名嗰部分淡出」細）、T-037（只係寫清楚範圍；共用截短函數本身要寫）、T-038（同一個 `start` 路徑）、T-047（數值同 v1.3 寫嘅一樣）。如果 T-036 冇拆，估算會係 2.5 + 1.5 + 2 = 6 人日，超過 3 日，所以拆開。

---

## 建議開始順序

Step 1（T-001、T-002）同 Step 2 嘅頭一段（T-020、T-021、T-030、T-031、T-032、T-033）已完成；D30–D39 已確認（U-12）；T-096、T-029、T-022、T-023、T-024 已完成；T-026、T-035、T-042 已實作；播放端設計稿第 17 版已確認（U-11）。由而家開始（v1.6，CR-007；下面圖入面 T-025、T-027、T-099 已由 T-103–T-106 取代）：

```
而家   → 用戶：設 `rb-discography` 嘅 CORS（`https://rgram.vercel.app` + 本機，U-1 ②）；上載 KOMOREBI 測試檔（U-1 ④）；
         ~~開 Vercel（U-7）~~ ✅；~~A-7~~（唔再需要）、A-8；~~定 spike 測試碟~~ ✅ KOMOREBI；照資料夾規則上載專輯（U-13）；有空睇 U-19（唔阻）。
         （U-16、U-17、U-18 ✅）
並行   → v1.9：T-038（進行中）→ U-24 ①②③⑤ → T-060 → T-061；T-114（可以開工）→ U-24 ⑥ → T-115
         v1.9 後端：T-116（進行中）→ 用戶部署（U-5；指引第 2 部分）→ U-1 CORS 加 Worker origin → Vercel `VITE_CATALOG_URL` 指 Worker
         v1.9 用戶而家：確認 OAuth redirect URI；設 Vercel `VITE_CATALOG_URL=/test-catalog/catalog.json`（T-113）；有空睇 U-25
         ~~播放端（v1.8）：T-109、T-110、T-112（進行中）→ T-111（等 T-110）~~（✅ 完成；T-111 取消）
         播放端（v1.8）：T-109、T-110、T-112（進行中）→ T-111（等 T-110）→ T-040 嘅第 20 版格；用戶確認 rgram.vercel.app 開到
         Spike（v1.8）：U-1 ② CORS、④ KOMOREBI 測試檔 → T-010（連 ⑥ 打橫）→ U-2 → T-011 → T-038
         播放端（v1.7）：T-108（進行中）→ T-040 嘅第 19 版格；T-038 接 `playFirst`
         Backend（v1.6）：T-103 → T-104 → T-105 → T-106
         Mockup：管理端設計稿第 4 版 → 用戶確認（U-8、U-20）→ T-051 → T-052、T-053、T-055
         ~~Backend：T-101、T-102 → T-025、T-027；T-099~~（已完成或者取消）
         播放端：T-046、T-047、T-034、T-037、T-039、T-040（拎住嘅格等 T-048、T-049）；
         T-036（要 T-046）→ T-048 → T-049（亦要 T-037）
         Mockup：T-050 補畫（CR-004 + CR-005）→ 用戶確認（U-8，連 D35）
         Spike ：T-010（要 U-1、U-7、測試碟）→ 用戶真機試（U-2）→ T-011

每個任務照團隊流程：TDD → Code Reviewer → QA，通過先做下一個依賴佢嘅任務。

---

## 假設及前提

| 編號 | 假設 |
| --- | --- |
| A-1 | **Branch**（✅ 用戶 2026-11-25 確認，決定 12）：全部任務喺 `claude/charming-cannon-8yulp0` 做，每個任務一組 conventional commit；第一個可用版本由用戶開 PR 入 `main` |
| A-2 | 版本同工具跟 903-player 現用版本（Technical Spec Tech Stack 表） |
| A-3 | Phase B 嘅 spike 頁放喺 Vercel（✅ 用戶 2026-11-25 確認，決定 13；U-7 提前） |
| A-4 | 開發期間播放端用 fixture catalog 同本機模擬媒體，唔等真 Backend 部署 |
| A-5 | Dashboard 設定由你做；我提供逐步清單同要填嘅值 |
| A-6 | **分工**（用戶 2026-11-25 指示）：mockup 確認之後，developer、reviewer、QA 嘅 subagent 用 Opus 跑；主 session 只做協調 |
| A-7 | ✅ **v1.8：唔再需要**：repo 嘅預設 branch 就係 session branch，Vercel project（U-7，2026-11-26）自動用佢做 Production Branch；`main` 開咗之後先要改。以下係之前嘅建議：~~**待用戶確認**（唔喺 2026-11-25 嗰八條問題入面，仍然係建議）：未有 `main` 之前，Vercel project 嘅 Production Branch 暫時設做 `claude/charming-cannon-8yulp0`，spike 頁由呢條 branch 部署；`main` 開咗之後改返 `main`。理由：Technical Spec 定咗只部署 production branch，而 `main` 要到第一個可用版本先有~~ |
| A-8 | **待用戶確認**（唔喺 2026-11-25 嗰八條問題入面，仍然係建議）。⚠️ CR-007 建議改為：「第一個可用版本」= Phase C + D + T-051 + T-055（冇初始資料之後，要管理端掃描先有內容）。之前：「第一個可用版本」= Phase C + D 完成（管理端 API 有齊、手機上播到歌）。T-028（Worker）同 T-041（播放端）嘅第一次正式部署喺 PR 合併入 `main` 之後做；之前只用本機環境同 spike 網址⚠️ **v1.9**：用戶 2026-11-26 揀先做後端：Worker 喺 `main` 之前由用戶手動部署（T-116），播放端 Production 照用 session branch；T-041（播放端正式部署、拎走測試 catalog）同 `deploy-api.yml`（T-028）仍然等 `main` |
| A-9 | CR-004：只有媒體 bucket 改名（`rb-discography`）；內容檔用嘅 private bucket 仍然叫 `r-gram-catalog`，D1 仍然叫 `r-gram`（用戶冇提過要改；U-3 未做，要改都仲嚟得切）⚠️ v1.9：用戶開 private bucket 時用咗 **`rb-discography-catalog`**（U-3），`r-gram-catalog` 作廢；D1 照舊 `r-gram` |
| A-10 | CR-004：用戶 2026-11-25 提供嘅新版 `rubberband-discography.html`、`rubberband-credits.html` 由主 session 放入 `_design_/`（寫 v1.2 時 repo 入面仲係舊版：17 個專輯段）。T-097 由佢哋開始；冇呢兩個檔，T-097 開唔到工 |
| A-11 | ✅ **已關閉（CR-005，2026-11-25）**：用戶確認短名同次序（同建議一樣），唔使改。~~CR-004：類別短名、初始次序未確認之前，T-097、T-098 照建議做（`album`／`ep`／`best`／`live`／`ost`／`single`；先類別後序號）。未部署過，之後要改只係改常數同重跑 script；但用戶一開始上載（U-13）就要用到短名，所以 U-15 要喺 U-13 之前答~~ |

---

## 開放問題

| 問題 | 影響任務 | 邊個決定 | 幾時要 |
| --- | --- | --- | --- |
| ~~Branch 模式照 A-1，定係准我開 `main` 同 `feature/` branch？~~ | 全部 | 用戶 | ✅ 2026-11-25：照 A-1（決定 12） |
| ~~Spike 頁放邊度（A-3）？~~ | T-010 | 用戶 | ✅ 2026-11-25：Vercel（決定 13） |
| ~~測試媒體用邊張碟？~~ | T-010、T-011、T-038（只阻呢三個） | 用戶 | ✅ 2026-11-26：KOMOREBI，`album-11-komorebi`（決定 14；CR-009） |
| ~~歌書入面㩒唱片夾暫停，歌書應唔應該留住？~~ | T-072 | 用戶 | ✅ 2026-11-25：留住（決定 5） |
| ~~Functional Spec D30–D39 接唔接受？~~ | T-029、T-023、T-026、T-096、T-038、T-082、T-083 | 用戶 | ✅ 2026-11-25：D30、D31、D32、D34、D36–D39 照建議接受（U-12；D32 取代 C4）。D33 係技術決定；D35 見下一行 |
| Functional Spec D35（統計項目）接唔接受？ | T-022（API-010 嘅統計欄，照建議先做）、T-052 | 用戶 | 同管理端設計稿第 2 版一齊（U-8） |
| ~~A-7（Vercel 暫時用 session branch 部署）、~~A-8（第一個可用版本 = Phase C + D）接唔接受？（2026-11-25 嗰八條問題冇包，仍然未答）。⚠️ v1.8：A-7 唔再需要（repo 預設 branch = session branch，U-7 ✅） | T-028、T-041 | 用戶 | T-028 前 |
| ~~播放端設計稿第 16 版確認~~ | T-036、T-038、T-042、T-072 | 用戶 | ✅ 2026-11-25：第 17 版已確認（U-11；包埋第 16 版嘅內容） |
| 管理端設計稿第 2 版確認（連 D35） | Phase E | 用戶 | U-8 |
| 歌書歌詞嘅兩個細節：① 同一首歌入面長短行交替時，弧線版面（`ARC`）同長行版面（`LONG`）點過渡；② 高身手機上純文字歌詞欄嘅頂底跟邊一組（建議：頂跟貼頂組、底跟貼底組） | T-082 | Frontend 照設計稿第 17 版定案（用戶知情；睇到同設計稿有出入就問返） | T-082 開工時 |
| 管理端要唔要同播放端共用金屬 SVG 零件（車床紋、螺絲、金屬掣；抽去一個共用 package），定係各自一份？ | T-051 | Architect（用戶知情） | 管理端設計稿第 2 版確認之後 |
| ~~**CR-004 D43**：類別短名用 `album`／`ep`／`best`／`live`／`ost`／`single`？~~ | U-13、T-097、T-098 | 用戶 | ✅ 2026-11-25：接受（CR-005） |
| ~~**CR-004 D44**：原有嘅自由文字「類型」欄改為由發行類別自動帶出（管理端唔再另外輸入）？**建議：係**（未答 = 保留自由文字，seed 填類別中文名）~~ | T-098、T-052 | 用戶（U-17） | ✅ 2026-11-25：「由類別自動帶出」（CR-006；`type` 喺 T-101 刪走） |
| ~~**CR-004 D47**~~：轉盤初始次序照用戶嘅歌單檔（先類別、後序號），定係照發行日期（舊資料嘅做法）？**建議：先類別、後序號**（錄音室專輯 A 至 K 順序，字母盤每 3 格一個字母時最易搵） | T-097（只影響 `order`） | 用戶 | ✅ 2026-11-25：「按類型再按編號」（CR-005） |
| ~~**CR-004 D48**（backlog B-053）~~：細過 1200 嘅封面唔放大，大封面規則放寬為「正方形、640 至 1200」，seed 自己出 320 縮圖，並列出要補圖嘅專輯？**建議：接受**（640 嘅封面喺 3 倍屏手機會矇，所以要列出嚟補） | T-099、T-027 嘅封面部分、T-052 | 用戶 | ✅ 2026-11-25：「細嘅自動放大到 1200」（CR-005 D50 取代 D48） |
| ~~**CR-004 D49**（CR-005 改問法）：資料夾有**音檔**而嗰個歌號未有歌（而歌號啱啱接住現有歌單）時，掃描可唔可以新增歌曲（歌名由同歌號 `.txt` 帶，冇就用音檔檔名）？**建議：可以**~~ | T-025、T-053 | 用戶（U-17） | ✅ 2026-11-25：由 CR-006 D60 取代（掃描係主要資料來源；有音檔就建立，可以跳號） |
| ~~**D23（review W-018）**：左上歌名縮到最細字級都放唔落點處理？~~ | T-047 | 用戶 | ✅ 2026-11-25：「斷成兩行」（CR-005 D51；數值喺第 18 版確認） |
| ~~**播緊時轉去睇另一隻碟嘅唱臂（review S-081）**~~ | T-036 | 用戶 | ✅ 2026-11-25：揀碟時唱臂同三粒細掣淡出、碟唔轉、聲唔停；返去鬆手淡入返（CR-005 D52；第 18 版確認時改寫為「拎另一隻碟睇」：細唱片機 + 歌單欄，T-036、T-048、T-049） |
| ~~**CR-005 D54**：① `.mp3` 算唔算音檔？② 已經有手動指定音檔嘅歌，佢自己資料夾入面嘅 `.txt`、MV 照唔照匯入？**建議：兩樣都係**~~ | T-025 | 用戶（U-17） | ✅ 2026-11-25：兩樣都係（CR-006） |
| ~~**CR-005 D55**：第二張封面收唔收 `cover2.png`？**建議：收**（同第一張一樣）~~ | T-025 | 用戶（U-17） | ✅ 2026-11-25：收（CR-006） |
| ~~**Review S-119**：「終於好天氣」冇完整發行日期同唱片公司，補定留空？~~ | T-027 | 用戶（U-17） | ✅ 2026-11-25：只要年份（2016），唱片公司留空（CR-006 D63；T-101） |
| **CR-006 PM 建議**（U-19）：D60 歌號跟檔名、可以跳號、可以改；D61 歌 id 跟歌號、之後不變；D62 音檔消失唔自動刪歌；D63 細項（刪 `releaseDate`、冇年份橫線照畫）；D59 細項（初始資料連唱片公司）；D64 參考資料 | T-101、T-102、T-025、T-027 | 用戶（U-19） | 對應任務開工前（未答照建議做；唔阻開發） |
| ~~**播放端設計稿第 18 版**（commit `ae30893`）確認~~ | T-036 嘅淡出部分、T-047、T-040 | 用戶（U-18） | ✅ 2026-11-25：已確認（source commit `4e739cd`） |
| ~~**Functional Spec D58**：細唱片機嘅邊界情況（唱臂姿勢跟同一套規則、自動下一首換歌名、拎住狀態唔記低、拎住期間 ♥ = 轉去 ♥ 格）照建議做？~~ | T-048、T-038 | 用戶（知情） | ✅ 2026-11-25：照建議（CR-006，用戶冇異議） |
| ~~拎住嘅碟嘅歌單欄：歌號用專輯色，疊住同色嘅碟時對比可能偏低。用戶知情，未要求改~~ | T-049 | 用戶 | ✅ 2026-11-26：照用專輯色（CR-008 D90；S-172 關閉） |
| ~~**CR-008**：冇拎住時播完最後一首之後，主頁算唔算「已揀歌」（歌單欄出唔出、唱片夾播邊首）？設計稿第 19 版冇畫。🅰️ 建議：算已揀歌（左上照顯示最後一首、冇歌單欄；唱片夾由泊位重播嗰首），同 D36 ② 一致~~ | T-038、T-108 | 用戶 | ✅ 2026-11-26：**唔算**；3 秒後變返未揀歌，㩒 play 由第一首播（CR-009 D99；建議唔採用） |
| ~~**CR-008**：更新提示（「已有新版本」「立即更新」）同「請打直」畫面嘅外觀（設計稿冇畫；提示喺 321pt 闊以下會撞細唱片機感應範圍，backlog B-085 ③）~~ | T-039 | 用戶 | ✅ 2026-11-26：兩樣都拎走：版本掣（T-109）、打橫轉返（T-111）（CR-009） |
| **CR-009**：PM 建議（U-23：版本掣 Tab 次序、打橫方向同安全區、接駁位讀屏、播完最後一首嘅邊界情況） | T-109、T-110、T-111、T-038 | 用戶（U-23） | 對應任務開工前；未答照建議做 |
| ~~**CR-009**：iOS 打橫反方向轉嘅真機效果接唔接受（R-026）？~~ | T-111 | 用戶（U-2） | ✅ 2026-11-26：唔接受，改返「請打直」（CR-010 D101；T-111 取消） |
| **CR-010**：預設 Q1–Q6（U-25） | T-114、T-061、T-038、T-115 | 用戶（U-25） | 唔阻；未答照做 |
| **CR-010**：OAuth redirect URI 登記咗未？Vercel `VITE_CATALOG_URL=/test-catalog/catalog.json` 設咗未？ | T-116、T-113 | 用戶 | 而家 |
| **CR-010**：`scripts/dev/`（T-113）同 `apps/admin`（T-116）歸邊條 QA 鏈（建議：`repo-scaffold`、新 `admin-sync`；`player-playback` 畀 T-038） | T-113、T-116、T-038 | 主 session（`.claude/CLAUDE.md`） | 對應 QA 之前 |
| **v1.8**：rgram.vercel.app 第一次 build 開唔開到？（呢個 session 驗唔到） | T-010、T-041 | 用戶 | 而家 |
| **CR-008**：主 session 代決定嘅實作對齊（U-22：S-157、S-161、S-164、S-166、S-181、S-183） | T-105、T-106、T-028、T-053 | 用戶（U-22） | 唔阻開發 |
| CR-004：掃描讀到 `.txt` 之後，批量匯入 `.lrc`（US-107、FR-110，P1）仲要唔要？**建議：保留 P1 但排最後**，T-083 開工時再睇 | T-083 | 用戶 | T-083 開工前 |
| CR-004：Noto Sans HK 而家都未隨 app 提供（Technical Spec Tech Stack 一直有寫；中文而家用系統字）。要唔要併入 T-044？**建議：併入**（同一套字體載入同重新量字機制；+0.5；留意分片 woff2 嘅 precache，backlog B-013） | T-044、T-034 | Architect（用戶知情） | T-044 完成之前 |
| CR-004：一次掃描 Worker 可以讀幾多個歌曲文字檔（Cloudflare 每個請求嘅操作上限）？ | T-025 | Backend 照 Cloudflare 文件核實；超過就分批 | T-025 開工時 |

---

## 驗證

| 層 | 做法 |
| --- | --- |
| 每個任務 | `npm run lint`、`npm test`、相關 `npm run build`；Code Reviewer 報告；QA 按階段驗收 |
| Phase A | Fixture catalog 通過 `parseCatalogDocument()`；`matchCredits` 結果 = ~~187 直接配對 / 22 同名配對 / 53 冇資料~~（CR-004：舊資料嘅數，作廢；新數字由 T-097 報告，寫入測試同 spec） |
| Phase C | Worker 測試喺 workerd 跑；本機 `wrangler dev` + seed 後用 `curl` 讀 `/catalog/v1/catalog.json`（CR-004：21 個發行、291 首歌全部喺度，每個發行有類別同序號；之前 17、262）；改一首歌嘅文字再讀一次，內容同 ETag 已變；`parseSongText(formatSongText(x))` round-trip；CR-004：本機模擬 bucket 放一個照規則命名嘅資料夾（`cover.jpg`、兩三個 `.txt`、音檔），掃描預覽啱、套用後再掃描全部係 `same`；喺管理端改咗嗰首歌之後再掃描，唔會建議改返 |
| Phase D 起 | Playwright E2E（假 catalog + 本機媒體）；同 mockup 截圖比對（連高身畫面）；淨空規則測試（掃 1 至 30 張專輯） |
| CR-003 跟進 | T-029、T-042、T-096 改到已凍結嘅 QA 鏈：按 validation gate 重驗有改動嘅檔 |
| CR-004 跟進 | T-097、T-098、T-099、T-044 改到已凍結嘅 QA 鏈（`catalog-core`、`api-auth` 嘅 schema、`api-albums`、`api-assets`、`player-catalog`、`player-foundation`）：按 validation gate 重驗有改動嘅檔；T-025 完成時加新鏈（`apps/api/src/media`） |
| CR-005 跟進 | T-100、T-099、T-046、T-047 改到已凍結嘅 QA 鏈（`api-albums`、`api-auth` 嘅 schema、`catalog-core`、`player-catalog`、`player-home`）：按 validation gate 重驗有改動嘅檔。掃描：本機模擬 bucket 放一個有 `cover.jpg`、`cover2.jpg`、有音檔同冇音檔嘅歌號（各有 `.txt`、`.mp4`）嘅資料夾，預覽入面冇音檔嗰幾個係「已略過」；播放端：同一份 catalog 開兩次 app（注入唔同 `random`）見到兩張封面、專輯色一樣 |
| CR-005 第 18 版（v1.4） | Unit：`holding` 同衍生顯示、`returnToLoaded`、`playHeldTrack`、`openList` 守衛、`columnLayout`；淨空：歌單欄避開字母盤同刻度、細唱片機感應範圍、D57 例外清單；E2E：第 18 版嘅格連 22 格，「播緊 → 擰去另一隻碟 → 鬆手 → 㩒一行／㩒細唱片機」，減少動態效果再行一次；T-036、T-047、T-048、T-049 改到已凍結嘅鏈（`player-home`、`player-core`、`player-foundation`）按 validation gate 重驗 |
| CR-006 跟進 | T-101、T-102 改到已凍結嘅 QA 鏈（`api-albums`、`api-tracks`、`api-catalog`、`api-auth` 嘅 schema、`catalog-core`、`seed-tools`、`player-catalog`）：按 validation gate 重驗有改動嘅檔；`python3 -m unittest discover -s _design_/tools`（CI 未跑）。掃描：本機模擬 bucket 放一張跳號嘅碟（01、02、03、05、07…，有啲有 `.txt`、有啲冇、一個 `.txt` 有錯、一個 `.mp3`），掃描 → 全部入「將會新增歌曲」→ 套用 → 歌號同檔名一樣、id = `<專輯 id>-<NN>`、冇 `.txt` 嘅歌名 = 檔名；再掃描全部係 `same`、冇重覆；刪走一個音檔再掃描 → 「音檔已不在資料夾」，套用後歌仲喺度（灰色）；seed：本機重跑兩次 → 21 張專輯、0 首歌、「終於好天氣」年份 2016 |
| CR-007 跟進 | T-103–T-106 改到已凍結嘅 QA 鏈（`api-albums`、`api-tracks`、`api-media`、`api-seed`、`api-catalog`、`api-auth` 嘅 schema、`catalog-core`、`catalog-song-text`、`player-catalog`）：按 validation gate 只重驗有改動嘅檔；新鏈 `api-sync`。`parseAlbumInfo()` 用用戶畀嘅 KOMOREBI `info.txt` 同全形半形、`01.`、`1、`、BOM、CRLF、認唔到嘅行做測試。本機模擬 bucket：見 Phase C 完成標準；寫返：改 `info.txt`／`.txt` → bucket 嘅檔內容同版本變咗；用舊版本寫 → 409，檔冇變；其他 route 冇 `MEDIA.put`／`MEDIA.delete`。播放端：同一份 fixture 刪 `label`、`subtitle` 之後全部測試照過 |
| CR-008 跟進（v1.7） | T-108：Technical Spec「場景 × 載入／拎住 × 字母盤」表每一行都有 unit test（歌單欄、細掣、唱臂、細唱片機、唱片夾、碟面）；冇 `playHeldTrack`／`startHeld`；淨空冇例外；motion token 鎖數值；E2E：第 19 版嘅格同「開 app → 㩒唱片夾播第一首 → 擰去另一隻碟 → 鬆手 → 㩒碟面（飄落弧線）→ 㩒暗位（歌單欄出返）→ 㩒唱片夾」，減少動態效果再行一次；改到嘅已凍結鏈（`player-holding`、`player-list`、`player-home`、`player-dial`、`player-core`、`player-foundation`）按 validation gate 只重驗有改動嘅檔 |
| CR-009 跟進（v1.8） | T-109：假 `UpdatePort` 驗 `none`／`waiting`、㩒 = `applyNow` 一次、`covered` 時唔㩒得唔 focus 得、減少動態效果冇動畫；T-110：圈數學（N = 0、1、2、3、8、15、41）、圈上吸附唔倒轉、鍵盤頭尾相接、旋鈕跨頭尾、`stackOffset`；T-111：`quarterTurn`、`toStagePoint`、打橫 viewport 截圖同直向一樣、拖動方向；T-112：manifest 同 icon 檔；T-038：播完 → 3 秒 → 未揀歌；E2E：第 20 版嘅格；改到嘅已凍結鏈（`player-pwa`、`player-home`、`player-holding`、`player-list`、`player-dial`、`player-foundation`、`player-core`）按 validation gate 只重驗有改動嘅檔；真機：T-010 ⑥ 打橫 |
| CR-010 跟進（v1.9） | T-038：假 `HTMLAudioElement` 行晒引擎合約；手勢同一個 call stack；Media Session 規則；D109、D110；真機 U-24 ①②③⑤。T-114：截圖比對、冇 WebGL／context lost／減少動態效果三條後備、spike 5a 真機（U-24 ⑥）。T-115：build 冇 spike、PWA gate。T-116：同步 runner 同封面工作嘅 unit test、冇 API-035、`wrangler.toml` 冇 email；部署之後用戶回報（登入、同步、`catalog.json`、B-060 ②、操作數）。T-113：生成結果同 committed 檔一樣。改到嘅已凍結鏈（`player-home`、`player-holding`、`player-startup`、`player-pwa`、`repo-scaffold`、`player-foundation`、`api-auth`）按 validation gate 只重驗有改動嘅檔；新鏈 `player-playback`、`admin-sync` |
| CR-004 字體 | 三個情況各影一次：冇設定 bucket 字體（Rokkitt）、設定咗而且載入到、設定咗但載入唔到（跌返 Rokkitt，Preload 照完成）；字體遲到之後長碟名唔出界（W-017） |
| 真機 | Phase B 清單；之後每個 Phase 完成有一張真機檢查表（安裝、鎖屏、自動更新） |

---

## 修訂記錄

| 版本 | 日期 | 改動 |
| --- | --- | --- |
| v1.0 | 2026-11-25 00:07 | 初稿；用戶批准 |
| v1.1 | 2026-11-25 08:06 | **CR-003**（Functional Spec v1.4、Technical Spec v1.2）。取消 T-054、T-080、T-081；改 T-010、T-022、T-023、T-026、T-027、T-028、T-035、T-036、T-038、T-039、T-040、T-041、T-051–T-053、T-072、T-082、T-083；T-050 重開（管理端設計稿第 2 版已交，等確認）；新增 T-029、T-042、T-043（已交，等確認）、T-096。U-7 提前；加 U-11、U-12；A-1、A-3 確認；加 A-6（subagent 用 Opus）、A-7、A-8（待確認）；加 R-011–R-014；開放問題關閉三條、加四條；工作量 77 → 80.5；加進度表 |
| v1.1（確認） | 2026-11-25 | **2026-11-25：D30–D39 確認**（CR-003 之內嘅狀態更新，唔係新 CR；版本號、任務編號、工作量不變）。U-12 完成：T-029、T-096、T-022、T-023、T-026 唔再受阻；T-038（D36）、T-082（D32、D38）、T-083（D34）對應嘅決定已確認。仍然受阻：T-036、T-038、T-042、T-072（U-11）同 Phase E（U-8）。D35 轉去同 U-8 一齊確認；A-7、A-8、測試碟仍然未定。R-014 解除。進度：T-031、T-032、T-033 完成（review 同 QA S1 都過）。設計稿：T-043 補咗兩格（commit `7ecf24b`：純文字歌詞嘅歌書 D38、冇歌專輯嘅歌單 D39），一齊等 U-11；T-050 加咗 `副題：` 行（commit `82000ed`）。D39 嘅空狀態落點寫入 T-037（嗰部分要 U-11） |
| v1.1（第 17 版確認） | 2026-11-25 | **2026-11-25：播放端設計稿第 17 版確認**（CR-003 之內嘅補充，唔係新 CR；版本號、任務編號不變）。**U-11 完成**：用戶答「用框入面斷行，第 17 版確認」，第 17 版係播放端嘅 Design Source。播放端設計稿唔再阻任何任務：T-042 可以即刻開工；T-036 排喺 T-035、T-042 之後；T-037 嘅空狀態、T-072、T-082 嘅畫面已確認；T-038 仍然等 spike（T-011）同測試碟。Mockup Binding：T-036、T-038、T-042、T-072、T-082 改為「HT 第 17 版」。範圍：T-042 加唱針開場（1 → 1.5）；T-082 做兩個歌詞版面（純文字直身一欄連自動斷行同上下捲；有時間標記嘅長行喺框入面斷行，冇跑馬燈）（2 → 2.5）；T-036 加字母規則（估算不變）；T-043 加第 17 版（0.5 → 0.5 + 0.5，已做）；T-038 接上唱針開場（估算不變）。工作量 80.5 → 82。進度：T-022 完成（review 85 → re-review 100，QA S1 pass）；T-029、T-096 完成（review 95，QA S1 pass）；T-023 完成（review 95 / 100；QA S1 pass：`qa/2026-11-25_11-32_qa_api-tracks.md`，寫呢次更新期間交咗）；T-043 完成。開放問題：播放端設計稿一條關閉，加 T-082 兩個細節。仍然等用戶：U-8（管理端設計稿第 2 版連 D35）、A-7、A-8、spike 測試碟 |
| v1.2 | 2026-11-25 12:40 | **CR-004**（Functional Spec v1.5、Technical Spec v1.3；用戶 2026-11-25 嘅 5 項決定）。改 T-025（掃描連封面來源同歌曲文字檔，1 → 2.5）、T-027（新資料、類別同序號、封面，1 → 1.5）、T-034（要 T-044）、T-036、T-040（22 格、新 fixture）、T-050（補畫，+0.5）、T-052（2 → 2.5）、T-053（2.5 → 3.5）；T-024 嘅描述改正（「兩個尺寸 WebP、抽專輯色」搬去 T-052；T-024 review S-088）。新增 T-044（播放端字體，backlog B-054；進行中）、T-097（內容資料重新生成）、T-098（專輯資料模型、資料夾規則、bucket 改名 `rb-discography`）、T-099（封面尺寸規則，等 D48）。U-1 改寫（bucket 名、CORS 連管理端 origin）；加 U-13（照資料夾規則上載專輯）、U-14（可選：上載字體）、U-15（七條問題）。加 A-9–A-11、R-015–R-019；R-009 更新。開放問題加十條（D43、D44、D47、D48、D49、W-018、播緊時轉碟、US-107、Noto Sans HK、掃描上限）。工作量 82 → 91.5。寫 17／262／187-22-53 嘅地方改咗或者標咗作廢（新配對數字等 T-097）。進度：T-024 完成（review 100，QA S1 pass）；T-042、T-035 已實作同 review（pass 90 / 100），QA 等 W-017 修完；T-026 已實作未 review；T-044 進行中 |
| v1.3 | 2026-11-25 16:40 | **CR-005**（Functional Spec v1.6、Technical Spec v1.4；用戶 2026-11-25 嘅 8 項決定）。新增 T-045（播放端設計稿第 18 版，已出 `ae30893`，等 U-18）、T-046（隨機封面）、T-047（左上歌名兩行）、T-100（第二張封面 Backend）；改 T-025（3）、T-027（唔再等 D48）、T-034、T-036（2.5；淡出部分等第 18 版）、T-037（唔再受阻）、T-040、T-050（+0.5）、T-052（3）、T-053（4）；T-099 改範圍（放寬規則取消）。U-14 完成；U-15 大部分答咗；加 U-16（字體檔名）、U-17（D44、D49、D54 兩個例外、`cover2.png`、review S-119）、U-18（第 18 版）。A-11 關閉；R-019 更新；加 R-020。工作量 91.5 → 97.5。進度：T-026 完成（re-review 100，QA S1 pass）；T-042、T-035、T-044 完成（QA S1 pass）；T-098、T-097 已合併（`c7af11b`），review pass 90 / 100，修正進行中（W-028：內容檔 `category`、`categoryNo` 必填）；T-097 嘅 credit 數字（246 / 0 / 45，review S-122）寫入 |
| v1.4 | 2026-11-25 19:36 | **CR-005 補充：播放端設計稿第 18 版確認**（Functional Spec v1.7、Technical Spec v1.5）。U-18 完成；T-045 完成（0.5 → 0.5 + 0.5）。第 ③ 點確認為「拎另一隻碟睇」（細唱片機、歌單欄），T-036 拆開：T-036 留轉碟本身同淡出淡入（連左上歌名嗰部分；2.5 不變），新增 T-048（拎住另一隻碟、細唱片機，1.5）、T-049（拎住嘅碟嘅歌單欄，2）。改 T-037（弧線歌單只限載入嘅碟／冇歌載入；共用截短函數）、T-038（接「㩒一行」；估算不變）、T-040（第 18 版嘅格同流程，1.5 → 2）、T-047（唔再等）。全部未完成播放端任務嘅 Mockup Binding 改為 HT 第 18 版。Phase D 完成標準加「拎另一隻碟」流程。R-020 解除；加 R-021（行高同對比）。開放問題：第 18 版一條關閉，加 D58、歌號對比（都唔阻）。工作量 97.5 → 102.5。進度表更新（T-098、T-097、T-100 已完成；可以開工嘅播放端任務） |
| v1.5 | 2026-11-25 21:10 | **CR-006**（Functional Spec v1.8、Technical Spec v1.6；用戶 2026-11-25 對 U-16、U-17 嘅答案）。U-16、U-17 完成；加 U-19（CR-006 嘅 PM 建議，唔阻）。新增 T-101（專輯只有年份、刪 `releaseDate`／`type`，1）、T-102（歌號跟檔名、歌 id 跟歌號、API-023 取消，1）。改 T-025（掃描建立歌曲、「音檔已不在資料夾」，3 → 3.5；要 T-102）、T-027（只入 21 張專輯，1.5 → 0.5；要 T-101）、T-050（再補畫，+0.5）、T-052（換欄；要 T-101）、T-053（掃描結果兩類、歌號欄，4 → 4.5；要 T-102）、T-037、T-049（顯示 `track.no`）、T-041（`VITE_FONT_URL`）、T-044、T-097、T-098 嘅備注。U-1、U-7、U-8、U-13 補 CR-006 嘅內容。R-019 解除；加 R-022。Phase C 完成標準改（21 張專輯、0 首歌；掃描建立歌）。開放問題：關閉 D44、D49、D54、D55、S-119、D58，加 CR-006 PM 建議一條。驗證加 CR-006 一行。工作量 102.5 → 106 |
| v1.6 | 2026-11-26 10:30 | **CR-007**（Functional Spec v1.9、Technical Spec v1.7；用戶 2026-11-26 睇完管理端設計稿第 3 版之後嘅指示）。新增 T-103（`info.txt` 同資料夾名，1）、T-104（資料模型、內容檔、拎走人手寫入同 seed，2）、T-105（全 bucket 同步，3）、T-106（寫返 bucket、封面結果，1.5）、T-055（掃描畫面，2.5）；可選 T-107（未計）。取消 T-099（併入 T-106）。改 T-050（第 4 版，commit `8fb28a7`，+1，等確認）、T-052（3 → 2）、T-053（4.5 → 1.5）、T-083（1.5 → 0.5）、T-028（runbook）；T-022、T-023、T-025、T-027、T-101、T-102 加備注（T-027 作廢）。管理端任務綁第 4 版（等確認）。Phase C、E 完成標準改；依賴圖加 CR-007；U-1、U-8、U-13 改寫，U-19 部分作廢，加 U-20（CR-007 PM 建議）、U-21（app icon，另一個 session）；A-8 建議改；加 R-023–R-025；驗證加 CR-007 一行。工作量 106 → 113；已做而作廢約 4 人日 |
| v1.7 | 2026-11-26 11:40 | **CR-008**（Functional Spec v1.10、Technical Spec v1.8；用戶 2026-11-26 逐點定案；播放端設計稿第 19 版確認，commit `ca8c52a`）。新增 **T-108**（揀碟歌單欄第 19 版，Frontend，3，進行中；驗收標準 A1–A8 + 通用；依賴 T-037、T-048、T-049）。改 T-038（接 `playFirst` 同「播完」狀態，估算不變）、T-040（截圖同流程對第 19 版，2 → 2.5）、T-045（第 19 版，+0.5，已做）；T-037、T-048、T-049 標完成同 CR-008 作廢嘅部分（約 0.5 人日，唔再計）。Mockup Binding：HT 第 19 版。Phase D 完成標準改（冇「㩒一行」、冇 D57 例外）。R-021 關閉。U-21 完成（app icon 方案 D）；加 U-22（CR-008 實作對齊，唔阻）。開放問題：歌號對比關閉；加播完之後算唔算已揀歌、更新提示同「請打直」外觀、U-22。依賴圖、開始順序、驗證加 CR-008。工作量 113 → 117.5 |
| v1.8 | 2026-11-26 16:30 | **CR-009**（Functional Spec v1.11、Technical Spec v1.9；用戶 2026-11-26，CR-008 之後；播放端設計稿第 20 版確認，commit `a335587`）。新增 **T-109**（版本掣，1，進行中）、**T-110**（弧線歌單同旋鈕頭尾相接，2，進行中）、**T-111**（手機打橫轉返，1.5，等 T-110）、**T-112**（app icon 細尺寸同 maskable 192，0.5，進行中），各有驗收標準。改 T-038（播完最後一首，2 → 2.5；加驗收標準 E1–E5）、T-010（加 ⑥ 打橫；測試碟 KOMOREBI；只等 U-1 ②④；1.5 → 1.75）、T-040（第 20 版嘅格、播完、打橫 viewport；2.5 → 3）、T-045（第 20 版，+0.5，已做）；T-039（`update-prompt`、`rotate-notice` 作廢，約 0.5 人日唔再計）、T-041（檢查 `VITE_FONT_URL`、用戶確認網站開到）加備注。Mockup Binding：HT 第 20 版。Phase B 阻塞、Phase D 完成標準改。**U-7 完成**（`https://rgram.vercel.app`）；**A-7 唔再需要**；U-1 剩低 ② CORS（origin 已知）同 ④ KOMOREBI 測試檔；U-2 加打橫；加 U-23（CR-009 PM 建議）。加 R-026。開放問題：測試碟、A-7、CR-008 兩條關閉；加 U-23、iOS 打橫、Vercel 第一次 build。依賴圖、開始順序、驗證加 CR-009。工作量 117.5 → 125.25 |
| v1.9 | 2026-11-26 17:50 | **CR-010**（Functional Spec v1.12、Technical Spec v1.10；spike 報告 `reports/2026-11-26_17-10_spike-report_T-011.md`；用戶 2026-11-26 嘅決定）。完成 T-010、T-011、U-2、U-3（private bucket `rb-discography-catalog`、D1 `r-gram`）、U-4（OAuth client）。**取消 T-111**（−1.5；D96 撤回）。新增 **T-113**（臨時測試 catalog，0.5，已合併）、**T-114**（Preload 旗幟 WebGL，2.5，可以開工；報告叫「T-113」）、**T-115**（拆 spike 頁，0.25，等 T-114；報告叫「T-114」；十二樣清單）、**T-116**（冇設計嘅同步頁同部署準備，2.75，進行中），各有驗收標準。改 T-038（3.25，進行中，驗收 P1–P8）、T-060、T-061（1.25）、T-062、T-028（0.25）、T-041、T-051（1.75）、T-055（1.25）；T-109、T-110 跟 code 改字眼（B-090 ①）；驗收標準由 T-051、T-055 搬去 T-116。Phase B 完成、Phase D 完成標準改。R-001、R-003、R-026 關閉；R-002、R-004、R-005、R-006、R-008 更新；加 R-027–R-032。U-1、U-5、U-6、U-23 更新；加 U-24（真機核對）、U-25（CR-010 預設）；A-8、A-9 更新。開放問題、依賴圖、開始順序、驗證加 CR-010。工作量 125.25 → 128.5 |
