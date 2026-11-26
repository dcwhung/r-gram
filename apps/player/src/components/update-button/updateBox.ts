import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { StageLayout } from '../../stage/layouts';

/** 版本掣嘅膠囊：位置、大細、圓角，同字嘅右邊（text-anchor end）同基線 */
export interface UpdatePillBox {
    x: number;
    y: number;
    w: number;
    h: number;
    rx: number;
    /** 膠囊中線（感應範圍以佢做中心） */
    mid: number;
    textX: number;
    textY: number;
}

export interface UpdateHitBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * 版本掣嘅膠囊（設計稿第 20 版 updatePillBox()）：右邊固定喺 `right`，左右各留 `padX` 包住啲字。
 * `textWidth` 係量到嘅闊度（TextMeasure：每個字後面都加咗字距）；SVG 嘅字距都加喺最後一個字後面，
 * 所以字形實際闊 = textWidth − 字距，字嘅 end 要再向右推一個字距，字形先會離框 `padX`
 */
export const updatePillBox = ({ info }: StageLayout, textWidth: number): UpdatePillBox => {
    const { update, version } = info;
    const glyphs = textWidth - version.spacing;
    const w = update.padX * 2 + glyphs;
    const mid = version.y + update.midDy;
    return {
        x: update.right - w,
        y: mid - update.h / 2,
        w,
        h: update.h,
        rx: update.h / 2,
        mid,
        textX: update.right - update.padX + version.spacing,
        textY: version.y,
    };
};

/** 感應範圍（設計稿 updateButton() 嘅 hit）：高 `hit`、最少同樣咁闊，再向右伸到畫面邊 */
export const updateHitBox = ({ info }: StageLayout, pill: UpdatePillBox): UpdateHitBox => {
    const { update } = info;
    const w = Math.max(pill.w, update.hit) + (DESIGN_WIDTH - update.right);
    return { x: DESIGN_WIDTH - w, y: pill.mid - update.hit / 2, w, h: update.hit };
};
