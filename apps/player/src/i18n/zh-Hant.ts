/*
 * 繁體中文語言檔（預設語言）。介面文字一律用中文書面語，唔用廣東話口語字（writtenChinese.test.ts 會擋）。
 * 用詞以已確認嘅設計稿做準：_mockups_/home-turntable/index.html（Functional Spec CR-002「介面語言同 i18n」）。
 * 專輯名、歌名、歌詞、人名係資料，唔喺呢度。`{名}` 係參數。
 */
export const zhHant = {
    app: {
        name: 'R Gram',
        unofficial: '歌迷自製　非官方',
        version: 'v{version}',
    },
    album: {
        trackCount: '{count} 首',
    },
    track: {
        number: '第 {no} 首',
    },
    list: {
        open: '開啟歌單',
        close: '關閉歌單',
    },
    playback: {
        play: '播放',
        pause: '暫停',
    },
    disc: {
        change: '選擇唱片',
        changeDone: '完成選擇',
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
