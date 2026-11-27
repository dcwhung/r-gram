/*
 * 歌書嘅曲詞編監（純函數；設計稿第 18 版 booklet()、CREDITS、creditsGap()；Functional Spec CR-002「歌書」）：
 * 左上資訊下面一欄，次序曲、詞、編、監；冇資料嘅項目唔顯示，下面嘅行向上補位。
 * 唔可以伸入 CD 同轉盤嘅範圍（離轉盤邊 ≥ clearance.platter）：名太長先縮字，最細都放唔落先「…」（設計稿冇畫）。
 */
import { CREDIT_FIELDS, type CreditField, type TrackCredits } from '@r-gram/catalog';
import { circleLeftAt } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { fitText } from '../../utils/fitText';

export interface CreditRow {
    field: CreditField;
    /** 基線 */
    y: number;
    /** 名（縮唔落先截短） */
    text: string;
    size: number;
}

/**
 * 喺基線 y 嘅名最右可以去到邊：轉盤邊再出 clearance.platter 嘅圓（量法同設計稿 creditsGap() 一樣：離碟心嘅距離）；
 * 呢個高度冇轉盤（轉盤頂上面）就停喺 maxRight
 */
export const creditRight = (layout: StageLayout, y: number): number => {
    const { disc, platter, clearance, booklet } = layout;
    const edge = circleLeftAt(disc, platter.r + clearance.platter, y);
    const { maxRight } = booklet.credits;
    return Number.isNaN(edge) ? maxRight : Math.min(maxRight, edge);
};

/** 有值嘅項目（次序跟 CREDIT_FIELDS） */
const filled = (credits: TrackCredits) =>
    CREDIT_FIELDS.flatMap((field) => {
        const value = credits[field];
        return value ? [{ field, value }] : [];
    });

export const creditRows = (
    credits: TrackCredits | null,
    layout: StageLayout,
    measure: (text: string, size: number) => number,
): CreditRow[] => {
    if (!credits) return [];
    const column = layout.booklet.credits;
    const valueX = column.x + column.valueDx;
    return filled(credits).map(({ field, value }, index) => {
        const y = column.y + index * column.pitch;
        const fitted = fitText(value, {
            size: column.value,
            minSize: column.minSize,
            step: column.step,
            maxWidth: creditRight(layout, y) - valueX,
            measure,
        });
        return { field, y, ...fitted };
    });
};
