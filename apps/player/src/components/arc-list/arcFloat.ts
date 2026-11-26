/*
 * 由歌單欄開弧線歌單嘅飄落（純函數；設計稿第 19 版 listLayer() 嘅 list-row-float、LIST_FLOAT）。
 * 見到嘅弧線行由上至下逐行由歌單欄嘅位（第 slot 行、歌單欄字級）出發，飄去弧線上嘅位同字級。
 * 用「平移 + 縮放（原點 0 0）」表達：起點 = scale × (x, y) + (fx, fy)；終點 = 原位
 */
import type { CSSProperties } from 'react';
import { MOTION } from '../../config/motion';
import type { ArcRowPose } from '../../stage/arcRows';
import type { StageLayout } from '../../stage/layouts';
import { px, ratio } from '../svgNumber';

export interface ArcFloat {
    fx: number;
    fy: number;
    scale: number;
    delayMs: number;
}

/**
 * 每行嘅起點。弧線歌單喺貼底組（向下移咗 extraUnits），歌單欄喺貼頂組，所以起點要減返 extraUnits。
 * 以行嘅 index 做 key
 */
export const arcFloats = (
    poses: readonly ArcRowPose[],
    { heldTracks: column }: StageLayout,
    extraUnits: number,
    staggerMs: number,
): ReadonlyMap<number, ArcFloat> =>
    new Map(
        poses.map((pose, slot) => {
            const scale = column.size / pose.size;
            const fromY = column.top + column.pitch * (slot + 0.5) - extraUnits;
            const float = {
                fx: column.x - scale * pose.x,
                fy: fromY - scale * pose.y,
                scale,
                delayMs: slot * staggerMs,
            };
            return [pose.index, float];
        }),
    );

/** 成個飄落幾耐：見到嘅行（框上下各 floor(visible) 行連框入面）逐行出發，最後一行落位為止 */
export const listFloatTotalMs = ({ list }: StageLayout): number => {
    const rows = Math.floor(list.visible) * 2 + 1;
    return rows * MOTION.scene.listRowStaggerMs + MOTION.scene.listRowFloatMs;
};

/** 歌單欄歌名嘅透明度（heldTracks.css 嘅 .held-title）：飄落由呢度開始 */
const COLUMN_TITLE_OPACITY = 0.9;

/** 飄落嘅 CSS 變數（arcList.css 嘅 arc-row-float）；終點透明度 = 行本身嘅透明度 */
export const arcFloatStyle = (float: ArcFloat, opacity: number) =>
    ({
        '--float-x': `${px(float.fx)}px`,
        '--float-y': `${px(float.fy)}px`,
        '--float-scale': ratio(float.scale),
        '--float-from': COLUMN_TITLE_OPACITY,
        '--float-to': ratio(opacity),
        '--float-delay': `${float.delayMs}ms`,
    }) as CSSProperties;
