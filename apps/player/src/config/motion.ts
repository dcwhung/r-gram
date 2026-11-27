/*
 * 動畫時長 token（毫秒）。元件唔可以寫死毫秒數。
 * - feedback：㩒落去嘅即時回饋，全部 ≤ 300ms（團隊規則）
 * - scene：場景過場，用戶已接受超過 300ms（Functional Spec D1）；數值以設計稿第 15 版做準（CR-002「過場動畫」）
 * - loop：不停重覆嘅提示（例如版本掣一明一暗）
 * - input：輸入嘅時間規則（例如㩒住幾耐），唔係動畫，冇 CSS 變數
 * styles/tokens.css 有同名嘅 CSS 變數；motion.test.ts 鎖住數值。
 */
export const FEEDBACK_MAX_MS = 300;

export const MOTION = {
    feedback: {
        /** 掣嘅光圈、icon 轉色 */
        toggleMs: 160,
        /** 文字、狀態淡入淡出 */
        fadeMs: 200,
        /** 唱片夾 icon 切換；唱針放低之後小燈光暈淡入 */
        swapMs: 120,
    },
    scene: {
        /** 轉碟：字母盤底盤、其他碟滑入、指針轉動 */
        discChangeMs: 500,
        /** 字母盤每個字母彈出 */
        dialKeyMs: 260,
        /** 打開時每個字母遲幾耐（順時針逐個出） */
        dialKeyOpenStepMs: 14,
        /** 收返時每個字母遲幾耐（由最尾一格先收） */
        dialKeyCloseStepMs: 8,
        /** 字母（同細點）淡入淡出（設計稿第 18 版 dialkey 嘅 opacity） */
        dialKeyFadeMs: 180,
        /** 字母盤底盤淡入淡出（設計稿 dialplate 嘅 opacity） */
        dialPlateFadeMs: 220,
        /**
         * 揀碟時唱臂、三粒細掣、左上歌名嗰部分淡出淡入；其他碟同旋鈕光圈嘅淡入淡出
         *（設計稿第 18 版 SWAP_FADE_MS；Functional Spec D52）
         */
        chromeFadeMs: 320,
        /** 歌單欄出現（字母盤開住）：每行由右上飄落兼淡入（設計稿第 19 版 PANEL_FLOAT.duration） */
        columnRowInMs: 460,
        /** 每行遲幾耐出發（行多就縮短：成欄攤開唔超過 columnRowSpreadMs） */
        columnRowStaggerMs: 60,
        columnRowSpreadMs: 560,
        /*
         * 由歌單欄開弧線歌單（設計稿第 19 版 LIST_FLOAT）：每行由歌單欄嘅位飄去弧線（逐行遲 stagger）；
         * 暗層淡入；框線等一陣先由唱片夾伸出；歌單欄其餘嘅行原地淡出
         */
        listRowFloatMs: 560,
        listRowStaggerMs: 80,
        listVeilMs: 360,
        listFrameDelayMs: 280,
        listFrameMs: 300,
        listGhostOutMs: 240,
        /** 碟轉一圈 */
        discRotationMs: 5400,
        /** 唱臂轉入碟上面 / 返泊位（由泊位開始播嘅第一段：升高住轉入） */
        tonearmMs: 650,
        /** 唱針放低 / 升起（開場第二段、暫停、繼續）；設計稿第 17 版 ARM_IN.dropMs */
        needleDropMs: 160,
        /** 歌書成個打開／收返（最長嗰部分完咗；收返完先轉場景狀態，期間鎖住 i 掣） */
        bookletOpenMs: 400,
        bookletCloseMs: 240,
        /*
         * 歌書嘅各部分（設計稿第 18 版 book-in／book-out；Technical Spec「歌書過場」；T-072）。
         * 打開：暗層同左上白字淡入 300；框線由唱片夾向左伸出 300；曲詞編監逐行由左滑入 240（第 i 行遲 40 + i × 40）。
         * 收返：暗層同白字淡出 240；框線縮返入唱片夾 220；曲詞編監淡出 160
         */
        bookletVeilInMs: 300,
        bookletFrameOutMs: 300,
        bookletCreditInMs: 240,
        bookletCreditDelayMs: 40,
        bookletCreditStepMs: 40,
        bookletVeilOutMs: 240,
        bookletFrameInMs: 220,
        bookletCreditOutMs: 160,
        /*
         * 歌書歌詞（T-082；設計稿 book-in／book-out）：打開時弧線歌詞由而家嗰行沿弧線展開 340（遲 60）、
         * 純文字欄淡入 300（遲 80）；收返時歌詞收返 220、純文字欄淡出 200。
         * 唱到下一行：成組沿弧線移去新位置（設計稿冇定時長，T-082 定 300：一行通常唱幾秒，0.3 秒移完唔會追唔切）
         */
        bookletLineFanMs: 340,
        bookletLineFanDelayMs: 60,
        bookletLineFoldMs: 220,
        bookletPlainInMs: 300,
        bookletPlainInDelayMs: 80,
        bookletPlainOutMs: 200,
        lyricAdvanceMs: 300,
        /*
         * MV 電視（設計稿「MV 電視」嘅 CSS：tvRise、antennaOut／In、crtOn、crt-white、crtOff、tvDrop、tv-veil；T-060）。
         * 開：升起 800（回彈）；天線 500 之後彈出 350；螢幕 700 開始由一條白線打開 220，白光 720 之後淡走 200；
         * 背後模糊層淡入 500。收（㩒 ■ 或者播完）：熄機 150（白光 100 淡入）→ 170 之後向下收埋 450、
         * 天線縮返 150、模糊層 170 之後淡走 450；TV_CLOSE_MS 630 之後先轉場景狀態
         */
        /** MV 電視由底部升起（有回彈） */
        tvRiseMs: 800,
        tvAntennaOutMs: 350,
        tvAntennaOutDelayMs: 500,
        tvAntennaInMs: 150,
        /** 螢幕開機：升到位嗰刻開始 */
        crtOnDelayMs: 700,
        crtOnMs: 220,
        crtFlashOutMs: 200,
        crtFlashOutDelayMs: 720,
        crtFlashInMs: 100,
        crtOffMs: 150,
        /** 電視向下收埋（熄機之後） */
        tvDropDelayMs: 170,
        tvDropMs: 450,
        tvVeilInMs: 500,
        tvVeilOutMs: 450,
        /** 㩒 ■ 之後幾耐電視先算收埋（熄機 + 停一停 + 收埋；設計稿 TV_CLOSE_MS） */
        tvCloseMs: 630,
        /*
         * Preload（T-034）：數值由設計稿 _mockups_/r-gram/src/anim.js（v16）嘅時間線 T 嚟
         *（loadStart 0.25 → loadEnd 1.85 → flagFade0 2.05 → flagFade1 2.8）
         */
        /** 載入完成後成塊旗淡出（同時放大少少） */
        flagFadeMs: 750,
        /** 進度到 100 之後停一停先淡出 */
        preloadHoldMs: 200,
        /** 進度線每完成一項向前行一步（v16 由 0 行到 100 用 1.6 秒；三項各三分之一） */
        preloadStepMs: 530,
        /** 開頭嘅風由七成力加到全力 */
        flagGustMs: 1000,
        /** 進度線同百分比喺開場之後幾耐先淡入、淡入用幾耐 */
        preloadBarDelayMs: 200,
        preloadBarInMs: 300,
    },
    /** 不停重覆嘅提示（減少動態效果時唔郁，CSS 處理） */
    loop: {
        /** 有新版本：成粒版本掣一明一暗一個來回（設計稿第 20 版 versionGlow，T-109） */
        updateBlinkMs: 1400,
    },
    /** 輸入規則（唔係動畫）：減少動態效果都一樣 */
    input: {
        /** 㩒住旋鈕幾耐先開字母盤（S-152：輕點唔開，免得開咗即刻收、閃一下） */
        dialHoldMs: 180,
        /** 快擰途中唔顯示歌單欄：旋鈕停喺一隻碟幾耐先出（設計稿第 19 版 PANEL_FLOAT.settle；B-086 ④） */
        columnSettleMs: 140,
        /**
         * 播完最後一首隔幾耐「放低隻碟」變返未揀歌（Functional Spec D99，用戶確認 3 秒；
         * Technical Spec「播完最後一首」）。減少動態效果照等
         */
        endedReleaseMs: 3000,
    },
} as const;
