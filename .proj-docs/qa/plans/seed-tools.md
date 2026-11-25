# Test Plan — seed-tools

- Chain: 內容資料轉檔 script（`_design_/tools/`）：由用戶嘅來源檔 `_design_/rubberband-discography.html`、`rubberband-credits.html` 生成 `apps/api/seed/discography.json`、`credits.json`（project 規則：seed 唔人手改）。任務 T-097（review 修正 W-029、S-120、S-121）、T-101（只有年份）
- AC（L1 來源：TS = Technical Spec v1.3「內容資料重新生成（T-097）」「資料夾名同發行類別」；FS = Functional Spec v1.5 CR-004「內容資料」「資料夾命名」、D43、D44、D46、D47）:
    - AC-1 數量（FS D46）：21 個發行、291 首歌；credit 21 個發行、252 行；每個發行 `trackCount` = 歌數
    - AC-2 類別同序號（FS「資料夾命名」表、D43、D44）：每個發行有 `category`（六個短名之一）、`categoryNo`（類別內由 1 連續）；CR-006（D44）：冇 `type` 輸出，原文留 `sourceMeta`；同類別同序號重覆 → script 停（`check_unique`）
    - AC-3 id 同次序（TS T-097「已有嘅 16 個 id 不變」、FS D47 建議）：16 個舊 id 不變、`singles` 冇咗、5 個新 id 由明確對照表定；初始 `order` 先類別後序號；21 個預期資料夾名同 FS 例子一致（`album-01-apollo-18` … `single-02-joeng-sai-gaai-dou-dung`）
    - AC-4 舊歌 id（TS T-097；`packages/catalog/src/seed/testing/previousTrackIds.json`）：`bce4dde` 嘅 262 首歌入面 261 個 id 同歌名不變（`singles-01` Ciao 搬去 `zoi-jat-hei-01`）；保留嘅 16 張碟 `title`、`label`、`wheelKey` 不變。CR-006（T-101；FS D63、TS「只有年份」Seed 生成行）：冇 `releaseDate` 輸出；`year` = 來源日期頭四位（`YYYY`、`YYYY-MM`、`YYYY-MM-DD`；開頭唔係四位數字 = `null`），21 張都有年份，「終於好天氣」= 2016，其他年份不變；歌單（291 首 id + 歌名）同 `7ad5390` 一樣
    - AC-5 可重現（CLAUDE.md「內容資料由 script 生成，唔人手改」）：兩個 script 再跑一次 → 同 committed 檔 byte 一樣（唔受 `PYTHONHASHSEED` 影響）；日期由來源檔讀，唔寫死；來源格式唔啱 → `SourceError`，淨 `main()` exit
    - AC-6 離線：只用標準庫；冇網絡 import；喺冇網絡嘅 namespace（`unshare -rn`）照跑得
- Scope files:
    - `_design_/tools/parse_discography.py`、`_design_/tools/parse_credits.py`、`_design_/tools/test_seed_tools.py`
    - 1-hop 輸入（冇其他鏈，喺呢度 freeze，改咗就要重驗）：`_design_/rubberband-discography.html`、`_design_/rubberband-credits.html`
    - 1-hop 輸出（屬 `catalog-core`，唔喺呢度 freeze）：`apps/api/seed/discography.json`、`credits.json`；消費者 `packages/catalog/src/seed/**`（屬 `catalog-core`）
- Commands:
    - `python3 -m unittest discover -s _design_/tools`（CI 未跑）
    - Probe（repo 外嘅 clone）：`PYTHONHASHSEED=0|1|random unshare -rn python3 -I _design_/tools/parse_discography.py <src> <scratch>.json`，再 `parse_credits.py <src> <scratch disco> <scratch>.json` → `cmp` committed 檔；Node 由 `git show bce4dde:apps/api/seed/discography.json` 自己砌舊 id 對 AC-3、AC-4
- PWA gate: no。Performance gate: no。Security / Data gate: yes（AC-4 id 唔可以變：聽眾機上嘅最愛 / 續播靠佢；AC-6）
- Out of scope: seed 寫入 D1 / R2（T-027）；封面下載同尺寸（D48、T-099）；credit 配對數字回寫 spec（S-122，PM）；D43 短名串法、D44、D47 用戶確認
