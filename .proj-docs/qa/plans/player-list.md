# Test Plan — player-list

- Chain: 播放端弧線歌單（`apps/player`）：主頁㩒碟面開歌單（`DiscFace`、`useListOpener`）、`listView` 衍生值、`arcRows` 弧線排列、暗層 / 白框 / 行（`arc-list/**`）、捲動（拖動、滾輪、鍵盤、吸附；`scroll/**` 同歌單欄共用）、歌單開住時左上歌號同歌名（`ListSongLines`、`SongPart`）。任務 T-037；review W-050、W-051（用戶決定）、W-053、S-198、S-199、S-204
- AC（L1 來源：FS = Functional Spec v1.9 US-004、D11、D23、D25、D39、D60；TS = Technical Spec v1.7「弧線排列」「歌單：拖動 / 滾輪捲動 + 吸附」；設計稿 = `_mockups_/home-turntable/src/template.html` 第 18 版 `LIST`、`listLayer()`、`focusFrame()`、`dimLayer()`，格「歌單（㩒碟面）」「歌單（專輯未有歌）」；backlog B-084 ②）:
    - AC-1 開關：主頁㩒碟面開（有歌載入：碟面係掣、入 Tab；冇歌載入：唱片夾係「開啟歌單」、碟面淨係畀手指）；拎住另一隻碟、MV、字母盤開住時唔開（W-052 未定，維持唔開）；開 = focus 入 listbox（冇歌 = 暗層）；Esc / 㩒暗位收返，focus 返打開嗰粒掣
    - AC-2 幾何（設計單位）：行 k 喺 180 − 9.2k°、半徑 556；揀中 42 號 700、其他 32 號 500；歌號 0.72 × 字級、專輯色；歌名 x = 歌號 x + 歌號字級 × 1.25 + 18；透明度 max(0.06, (1 − |k|/4.3)^1.5 × (k = 0 ? 1 : 0.62) × (灰色 ? 0.5 : 1))；白框 `M0 −44H−450a44 44 0 0 0 0 88H0` @ (828, 1196)、線 3；暗層 0.8 黑、唱片夾窿半徑 112；框入面嗰行同唱片夾同一高度
    - AC-3 資料：歌號 = `track.no`（跳號照顯示）；長歌名約 8 個全形字（42 號 × 8）後「…」；灰色行（`audio: null`）`aria-disabled`、`#9a978f`、再淡一半；冇歌「尚未有歌曲」（框入面 42 號）
    - AC-4 捲動：拖動跟手、放手吸附整行；滾輪 `preventDefault`、頁面唔郁；Ctrl + 滾輪留畀瀏覽器（S-198）；方向 / Page / Home / End（跳灰色行；全灰嘅碟逐行行，S-204）；框入面 = 左上歌號歌名 = 播嘅嗰首；第二隻手指唔中斷第一隻手指，停喺整行（W-050）
    - AC-5 播（W-051）：行唔㩒得（㩒任何一行冇反應、唔收返）；播只經唱片夾（▶）或者 Enter / 空白鍵；㩒行以外嘅暗位收返
    - AC-6 無障礙：`listbox` + `option`（`aria-selected`、`aria-posinset/setsize`、`aria-activedescendant`）；暗層「關閉歌單」；Tab 只喺歌單、唱片夾、暗層同舞台外嘅更新掣之間兜圈（S-199）；減少動態效果冇過場
- Scope files:
    - `apps/player/src/components/arc-list/**`、`apps/player/src/components/scroll/**`（連 test、css）
    - `apps/player/src/app/`：`listView.ts`、`listView.test.ts`、`DiscFace.tsx`、`discFace.css`、`useListOpener.ts`
    - `apps/player/src/stage/arcRows.ts`、`arcRows.test.ts`；`apps/player/src/components/info-block/ListSongLines.tsx`、`SongPart.tsx`
    - 1-hop（屬其他鏈）：`HomeScene`、`Turntable`、`TopGroup`、`homeView`、`useHome`、`InfoBlock`（`player-home` / `player-holding`）；`held-tracks/**`（`player-holding`，共用 `scroll/**`）；`stageReducer`、`Spindle`（`player-core`）；`phone.ts`、`geometry.ts`、`zh-Hant.ts`（`player-foundation`）
- Commands: `npm run lint`、`npm run typecheck`、`npm run coverage`（全部 workspace 一次；門檻 80%）、`npm run build -w apps/player`
- Browser check（未有 e2e spec；T-040 加咗之後改跑 e2e）：production build（`VITE_CATALOG_URL` = `https://127.0.0.1:8743`），本機 https 假 Worker（21 張真專輯、真歌單；`juntos` 歌號跳號 + 兩個長歌名 + 灰色行；`hours` 冇歌；`ni-dou` 全灰）+ `127.0.0.1` 靜態 server；Chromium `/opt/pw-browsers/chromium`（route 擋晒非本機並記數）；393 × 852、1280 × 800，各 normal / `reduce`：AC-1 – AC-6 逐項；CDP touch 兩隻手指；1280 × 800 同設計稿兩格並排截圖
- PWA gate: no。Security / Data gate: no（歌名經 React 文字節點）。Performance gate: no（捲動唔量字，`useArcTitles` 由單元測試鎖住）
- Out of scope（已知、已接受）：W-052（字母盤開住㩒碟面，等用戶）；S-200（吸附冇過場）、S-201、S-206；設計稿 `LIST_FLOAT` 預覽（未實作）；真正出聲（T-038）；Favourites 歌單（T-070）
