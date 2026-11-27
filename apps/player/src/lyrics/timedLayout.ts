/*
 * 有時間標記嘅歌詞點排（純函數；設計稿第 18 版 booklet() 嘅 ARC、第 17 版 longLyrics()；Functional Spec D22 第 17 版修訂；
 * Technical Spec「歌書歌詞版面」）。座標係舞台（貼底組）嘅設計單位。
 * - 而家嗰行喺框入面；佢一列放得落（44 → 32）= 弧線版面：其他行沿同碟同心嘅弧線、每行隔 arc.stepDeg、字 32
 * - 縮到 32 都放唔落 = 長行版面：框入面斷成幾列、框跟住變高；其他行由框線邊隔 gap 起計、行距 50、字 28，x 跟弧線
 *   （T-082 定案：同一首歌入面長短行交替時，每次換行都按而家嗰行揀版面，行嘅位置同字級由畫面做過場）
 * - 空白行（間奏）同第一行之前：唔 highlight 任何一行，框入面留空（弧線版面），上下照出前後嘅字
 * - 其他行唔斷行、唔用「…」：同唱片夾同一個高度嘅行去到唱片夾之前，其餘去到畫面右邊留 edgeGap；放唔落 = 右邊淡出
 * 上下各畫 around + 1 行：最外嗰行透明，換行時由佢淡入（畫面做過場）。
 */
import { polar } from '../stage/geometry';
import { DESIGN_WIDTH } from '../stage/fitStage';
import type { LyricFade, StageLayout } from '../stage/layouts';
import { type FittedLyric, fitLyricLine } from './fitLyricLine';
import type { MeasureAt } from './wrapLine';

/** 而家嗰行用粗體量，其他行用普通字重量 */
export interface LyricMeasures {
    bold: MeasureAt;
    regular: MeasureAt;
}

export interface LyricRowPose {
    /** 原本歌詞入面第幾行（換行時用嚟對返同一行做過場） */
    index: number;
    text: string;
    /** 離框幾多行（負 = 上面） */
    k: number;
    /** 行嘅左邊同垂直中線 */
    x: number;
    y: number;
    size: number;
    opacity: number;
    /** 右邊界；`cut` = 放唔落，右邊淡出 */
    limit: number;
    cut: boolean;
}

export interface FocusPose extends FittedLyric {
    index: number;
    x: number;
    /** 第一列嘅垂直中線；之後每列 + pitch */
    y: number;
    pitch: number;
    limit: number;
}

export interface TimedLayout {
    long: boolean;
    frameHeight: number;
    /** 間奏、第一行之前 = null */
    focus: FocusPose | null;
    others: LyricRowPose[];
}

interface Slot {
    index: number;
    text: string;
}

const DEG_FOCUS = 180;
const HALF = 0.5;

/** 有字嘅行（空白行唔佔位）；`anchor` = 而家嗰行喺入面第幾個，或者間奏時「下一行」喺第幾個 */
const slotsOf = (lines: readonly { text: string }[], active: number) => {
    const slots: Slot[] = [];
    lines.forEach((line, index) => {
        if (line.text.trim() !== '') slots.push({ index, text: line.text });
    });
    const anchor = slots.filter((slot) => slot.index < active).length;
    const focused = slots[anchor]?.index === active;
    return { slots, anchor, focused };
};

/** 離框 k 行（k ≠ 0）係第幾個有字嘅行：間奏時框係一個空位，下面嘅行少一格 */
const slotAt = (anchor: number, focused: boolean, k: number) =>
    focused || k < 0 ? anchor + k : anchor + k - 1;

const fadeAt = (fade: LyricFade, k: number, around: number) =>
    Math.abs(k) > around ? 0 : Math.max(fade.min, fade.near - (Math.abs(k) - 1) * fade.step);

/** 右邊界：離碟心高度少過唱片夾窿 + hubGap 嘅行去到唱片夾之前；其餘去到畫面右邊 */
const rightLimit = (layout: StageLayout, y: number) => {
    const { hubGap, edgeGap } = layout.booklet.lyrics;
    const clear = layout.disc.r * layout.hub.clear;
    return Math.abs(y - layout.disc.y) < clear + hubGap
        ? layout.disc.x - clear - hubGap
        : DESIGN_WIDTH - edgeGap;
};

/** 框入面可以用嘅闊度：框線左邊再入 inset，去到唱片夾窿邊留 rim（設計稿 = 410） */
export const frameTextWidth = ({ arc, disc, hub, booklet }: StageLayout): number =>
    arc.r - disc.r * hub.clear - booklet.lyrics.rim - booklet.lyrics.inset;

/** 弧線版面：第 k 行喺 180 − k × stepDeg */
const arcPoint = (layout: StageLayout, k: number) =>
    polar(layout.disc, layout.arc.r, DEG_FOCUS - k * layout.arc.stepDeg);

/** 長行版面：第 k 行由框線邊隔 gap 起計，每行 otherPitch；x 跟弧線。去到弧線外面（|dy| ≥ r）= null */
const longPoint = (layout: StageLayout, k: number, frameHeight: number) => {
    const { gap, otherPitch } = layout.booklet.lyrics.long;
    const dy = Math.sign(k) * (frameHeight / 2 + gap + otherPitch * (Math.abs(k) - HALF));
    const { r } = layout.arc;
    if (Math.abs(dy) >= r) return null;
    return { x: layout.disc.x - Math.sqrt(r ** 2 - dy ** 2), y: layout.disc.y + dy };
};

const fitFocus = (text: string, layout: StageLayout, measure: MeasureAt) => {
    const { arc, long } = layout.booklet.lyrics;
    const spec = {
        size: arc.now,
        minSize: arc.nowMin,
        step: arc.nowStep,
        width: frameTextWidth(layout),
        maxRows: long.maxRows,
    };
    return fitLyricLine(text, spec, measure);
};

/** 框入面嗰行：一列 = 喺弧線（碟心正左）；幾列 = 框線左邊再入 inset，幾列上下置中 */
const focusPose = (slot: Slot, fitted: FittedLyric, layout: StageLayout): FocusPose => {
    const { inset, long } = layout.booklet.lyrics;
    const wrapped = fitted.rows.length > 1;
    const left = layout.disc.x - layout.arc.r;
    const pitch = wrapped ? long.pitch : 0;
    const y = layout.disc.y - ((fitted.rows.length - 1) * pitch) / 2;
    const limit = layout.disc.x - layout.disc.r * layout.hub.clear - layout.booklet.lyrics.rim;
    return { ...fitted, index: slot.index, x: wrapped ? left + inset : left, y, pitch, limit };
};

const otherPose = (
    slot: Slot,
    k: number,
    point: { x: number; y: number },
    style: { size: number; opacity: number },
    measure: MeasureAt,
    layout: StageLayout,
): LyricRowPose => {
    const limit = rightLimit(layout, point.y);
    const cut = point.x + measure(slot.text, style.size) > limit;
    return { index: slot.index, text: slot.text, k, ...point, ...style, limit, cut };
};

/** 其他行：上下各 around + 1 行（最外嗰行透明） */
const othersOf = (
    layout: StageLayout,
    { slots, anchor, focused }: ReturnType<typeof slotsOf>,
    frame: { long: boolean; height: number },
    measure: MeasureAt,
): LyricRowPose[] => {
    const lyrics = layout.booklet.lyrics;
    const look = frame.long ? lyrics.long : lyrics.arc;
    const poses: LyricRowPose[] = [];
    for (let k = -look.around - 1; k <= look.around + 1; k += 1) {
        const slot = k === 0 ? undefined : slots[slotAt(anchor, focused, k)];
        const point = frame.long ? longPoint(layout, k, frame.height) : arcPoint(layout, k);
        if (!slot || !point) continue;
        const style = { size: look.other, opacity: fadeAt(look.fade, k, look.around) };
        poses.push(otherPose(slot, k, point, style, measure, layout));
    }
    return poses;
};

export const timedLayout = (
    lines: readonly { text: string }[],
    active: number,
    layout: StageLayout,
    measures: LyricMeasures,
): TimedLayout => {
    const slots = slotsOf(lines, active);
    const current = slots.focused ? slots.slots[slots.anchor] : undefined;
    const fitted = current && fitFocus(current.text, layout, measures.bold);
    const long = (fitted?.rows.length ?? 1) > 1;
    const { pitch, pad } = layout.booklet.lyrics.long;
    const frameHeight =
        fitted && long ? fitted.rows.length * pitch + pad : layout.booklet.frame.height;
    const focus = current && fitted ? focusPose(current, fitted, layout) : null;
    const others = othersOf(layout, slots, { long, height: frameHeight }, measures.regular);
    return { long, frameHeight, focus, others };
};
