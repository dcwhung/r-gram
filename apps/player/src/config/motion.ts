/*
 * 動畫時長 token（毫秒）。元件唔可以寫死毫秒數。
 * - feedback：㩒落去嘅即時回饋，全部 ≤ 300ms（團隊規則）
 * - scene：場景過場，用戶已接受超過 300ms（Functional Spec D1）；數值以設計稿第 15 版做準（CR-002「過場動畫」）
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
        /** 碟轉一圈 */
        discRotationMs: 5400,
        /** 唱臂轉入碟上面 / 返泊位（由泊位開始播嘅第一段：升高住轉入） */
        tonearmMs: 650,
        /** 唱針放低 / 升起（開場第二段、暫停、繼續）；設計稿第 17 版 ARM_IN.dropMs */
        needleDropMs: 160,
        bookletOpenMs: 400,
        bookletCloseMs: 240,
        /** MV 電視由底部升起（有回彈） */
        tvRiseMs: 800,
        /** 螢幕開機：升到位嗰刻開始 */
        crtOnMs: 220,
        crtOffMs: 150,
        /** 電視向下收埋（熄機之後） */
        tvDropMs: 450,
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
    /** 輸入規則（唔係動畫）：減少動態效果都一樣 */
    input: {
        /** 㩒住旋鈕幾耐先開字母盤（S-152：輕點唔開，免得開咗即刻收、閃一下） */
        dialHoldMs: 180,
        /** 快擰途中唔顯示歌單欄：旋鈕停喺一隻碟幾耐先出（設計稿第 19 版 PANEL_FLOAT.settle；B-086 ④） */
        columnSettleMs: 140,
    },
} as const;
