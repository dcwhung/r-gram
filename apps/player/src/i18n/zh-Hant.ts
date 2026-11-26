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
    },
    list: {
        open: '開啟歌單',
        close: '關閉歌單',
        /** 冇歌嘅碟（設計稿 T.emptyAlbum；Functional Spec D39） */
        empty: '尚未有歌曲',
    },
    /** 拎住嘅碟嘅歌單欄（T-049；Functional Spec FR-044） */
    heldTracks: {
        /** 成欄（role="list"）嘅名 */
        label: '{album} 的歌曲',
        /** 播得嘅一行（掣）：歌號同歌名 */
        play: '播放第 {no} 首：{title}',
        /** 未有音檔嘅一行（灰色，唔係掣；D11、D70） */
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
        back: '返回播放中的唱片',
    },
    favourites: {
        title: '我的收藏',
        empty: '尚未收藏歌曲',
        go: '前往「我的收藏」',
        add: '收藏這首歌',
        remove: '取消收藏這首歌',
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
    rotate: {
        notice: '請將裝置轉為直向',
    },
} as const;
