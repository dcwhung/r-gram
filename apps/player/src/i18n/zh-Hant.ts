/*
 * 繁體中文語言檔（預設語言）。介面文字一律用中文書面語，唔用廣東話口語字（writtenChinese.test.ts 會擋）。
 * 用詞以已確認嘅設計稿做準：_mockups_/home-turntable/index.html（Functional Spec CR-002「介面語言同 i18n」）。
 * 專輯名、歌名、歌詞、人名係資料，唔喺呢度。`{名}` 係參數。
 */
export const zhHant = {
    app: {
        name: 'R Gram',
        /** PWA 描述（manifest 同 `<meta name="description">`；build 時由 vite.config.ts 注入） */
        description: '歌迷自製的 RubberBand 唱片機（非官方）',
        unofficial: '歌迷自製　非官方',
        version: 'v{version}',
    },
    preload: {
        /** 進度線（role="progressbar"）嘅標籤 */
        loading: '載入中',
        /** 內容資料完全攞唔到（網絡同本機副本都冇；Functional Spec US-001） */
        failed: '未能載入唱片資料',
        retry: '重試',
        /** 底部：非官方聲明 · 版本號（設計稿第 18 版 preloadCard()；兩邊各兩個半形空格） */
        footer: '{notice}  ·  {version}',
    },
    album: {
        trackCount: '{count} 首',
    },
    track: {
        number: '第 {no} 首',
        /** 左上資訊：歌號 · 播放位置（`m:ss`） */
        position: '第 {no} 首 · {time}',
        /** 音檔載入失敗（US-004 一行錯誤提示）：左上「第 nn 首 · 」後面取代時間 */
        failed: '未能播放',
        /** 同一件事，畀讀屏（live region）：講埋歌名 */
        failedNotice: '未能播放「{title}」',
    },
    list: {
        open: '開啟歌單',
        close: '關閉歌單',
        /** 冇歌嘅碟（設計稿 T.emptyAlbum；Functional Spec D39） */
        empty: '尚未有歌曲',
        /** 弧線歌單（role="listbox"，T-037）同碟名下面嘅歌單欄（role="list"）嘅名 */
        label: '{album} 的歌曲',
        /** 一行（弧線歌單 role="option"、歌單欄 role="listitem"）：歌號同歌名 */
        track: '第 {no} 首：{title}',
        /** 未有音檔嘅一行（灰色、唔停得；D11） */
        unavailable: '第 {no} 首：{title}（未有音檔）',
    },
    playback: {
        play: '播放',
        pause: '暫停',
    },
    disc: {
        change: '選擇唱片',
        changeDone: '完成選擇',
    },
    /** 拎住另一隻碟時右上角嘅細唱片機（T-048；設計稿第 18 版 T.nowPlaying、loadedPaused、backToPlaying） */
    miniTurntable: {
        playing: '播放中',
        paused: '已暫停',
        /** 載入嘅歌播完（設計稿第 19 版 T.loadedEnded） */
        ended: '已播完',
        /** 成粒掣嘅名：講埋入面嗰首歌（完整歌名，唔截短；review S-175） */
        backPlaying: '返回播放中的唱片：{title}',
        backPaused: '返回已暫停的唱片：{title}',
        backEnded: '返回已播完的唱片：{title}',
        /** 載入嘅歌載入失敗（S-242；細唱片機嘅字用 track.failed，同左上一樣） */
        backFailed: '返回未能播放的唱片：{title}',
    },
    favourites: {
        title: '我的收藏',
        empty: '尚未收藏歌曲',
        go: '前往「我的收藏」',
        add: '收藏這首歌',
        remove: '取消收藏這首歌',
        /** Favourites 碟嘅歌原本嗰隻碟（D19；設計稿 TRACKS.favourites：碟名 · 年份；冇年份就淨係碟名） */
        origin: '{album} · {year}',
    },
    booklet: {
        open: '歌書：歌詞及創作人員',
        close: '關閉歌書',
        composer: '曲',
        lyricist: '詞',
        arranger: '編',
        producer: '監',
    },
    mv: {
        open: '觀看 MV',
        play: '播放 MV',
        pause: '暫停 MV',
        stop: '關閉電視',
        volume: 'MV 音量',
        seek: '快轉或倒轉',
    },
    mode: {
        label: '播放模式：{mode}',
        order: '順序播放',
        all: '全部重複',
        one: '單曲重複',
        shuffle: '隨機播放',
    },
    /** 手機打橫時嘅畫面（T-039；Functional Spec US-015「請打直」） */
    rotate: {
        notice: '請將裝置轉為直向',
    },
    /**
     * 用緊 app 時有新版（T-039、T-109；Functional Spec D14：下次開 app 會自動更新）：右上版本號變成掣。
     * available：讀屏聽到嘅通知；applyLabel：版本掣嘅完整名，講明會重新載入（播放會停）
     */
    update: {
        available: '已有新版本',
        applyLabel: '已有新版本，立即更新並重新載入',
    },
} as const;
