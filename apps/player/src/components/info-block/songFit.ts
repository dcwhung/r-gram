/*
 * 左上歌名嘅排位（設計稿第 18 版 fitSong()、songRows()；Functional Spec D51）：字級、每行基線，同心形位置。
 * 純函數，量度由外面注入（字體載入完會換，useTextMeasure）。
 */
import type { InfoLayout } from '../../stage/layouts';
import { fitLines } from '../../utils/fitLines';
import type { TextMeasure } from '../../utils/textMeasure';

/** 歌名字重（Noto Sans HK Bold；同 infoBlock.css `.info-song`） */
export const SONG_WEIGHT = 700;

export interface SongRow {
    text: string;
    /** 基線 */
    y: number;
}

export interface SongFit {
    size: number;
    rows: SongRow[];
    /** 第一行基線：三條專輯色棒跟佢 */
    top: number;
    /** 心形中心：跟喺最後一行尾 */
    heart: { x: number; y: number };
}

/** 第一行同第二行可用嘅闊度：心形連佢右半邊都要喺上限之內（冇心形就唔使留） */
const roomFor = ({ song, heart }: InfoLayout, withHeart: boolean) => ({
    maxWidth: song.maxRight - song.x - (withHeart ? heart.gap + heart.size / 2 : 0),
    secondMaxWidth: song.secondRight - song.x,
});

/** `withHeart = false`：歌單開住時冇心形（設計稿 fitSong(title, false)），可用闊度多返心形嗰段 */
export const fitSongTitle = (
    title: string,
    info: InfoLayout,
    measure: TextMeasure,
    withHeart = true,
): SongFit => {
    const { song, heart } = info;
    const widthAt = (text: string, size: number) =>
        measure(text, { family: 'cjk', size, weight: SONG_WEIGHT, spacing: 0 });
    const { lines, size } = fitLines(title, {
        size: song.size,
        minSize: song.minSize,
        step: song.step,
        ...roomFor(info, withHeart),
        measure: widthAt,
    });
    // 兩行：第一行向上移，「第 nn 首」行唔郁
    const top = lines.length > 1 ? song.y - song.lift : song.y;
    const rows = lines.map((text, index) => ({ text, y: top + index * song.pitch }));
    const last = rows[rows.length - 1] ?? { text: '', y: top };
    return {
        size,
        rows,
        top,
        heart: {
            x: song.x + widthAt(last.text, size) + heart.gap,
            y: last.y - size * heart.rise,
        },
    };
};
