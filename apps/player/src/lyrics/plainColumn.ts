/*
 * 冇時間標記嘅歌詞：直身一欄（純函數；Functional Spec D38 第 17 版修訂；Technical Spec「歌書歌詞版面」；
 * 設計稿第 17 版 PLAIN_LAYOUT、plainRows()）。成份歌詞一次過排好：每行用 wrapLine() 斷（續行縮入一個字），
 * 空行 = 空一列（分段）。冇框線、冇 highlight，全部列一樣。
 * 欄喺三粒細掣右邊（x）；右邊界 = 唱片夾窿左邊再留 hubGap（由幾何計）。頂跟貼頂組（曲詞編監下面），
 * 底跟貼底組（旋鈕上面）：高身手機多出嚟嘅高度畀歌詞欄（T-082 定案，照 Functional Spec 建議）。
 */
import type { StageLayout } from '../stage/layouts';
import { type MeasureAt, type WrappedRow, wrapLine } from './wrapLine';

export interface PlainColumn {
    x: number;
    right: number;
    /** 貼頂組座標 */
    top: number;
    bottom: number;
    size: number;
    pitch: number;
}

/** `extraUnits` = 高身手機多出嚟嘅高度（貼底組向下移咗幾多） */
export const plainColumn = (layout: StageLayout, extraUnits: number): PlainColumn => {
    const { plain, hubGap } = layout.booklet.lyrics;
    return {
        x: plain.x,
        right: layout.disc.x - layout.disc.r * layout.hub.clear - hubGap,
        top: plain.top,
        bottom: plain.bottom + extraUnits,
        size: plain.size,
        pitch: plain.size * plain.pitch,
    };
};

export const plainRows = (
    lines: readonly { text: string }[],
    layout: StageLayout,
    measure: MeasureAt,
): WrappedRow[] => {
    const { plain } = layout.booklet.lyrics;
    const spec = {
        size: plain.size,
        width: plainColumn(layout, 0).right - plain.x,
        indentEm: plain.indentEm,
    };
    return lines.flatMap((line) => wrapLine(line.text.trim(), spec, measure));
};
