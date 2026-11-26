import { useState } from 'react';
import type { ArcListView } from '../../app/listView';
import { MOTION } from '../../config/motion';
import { arcRows, arcRowSpec } from '../../stage/arcRows';
import { heldColumnBottom } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { rowCentre } from '../held-tracks/columnLayout';
import { type ArcFloat, arcFloats } from './arcFloat';

export interface ArcFloatPlan {
    /** 見到嘅弧線行嘅起點（以行 index 做 key） */
    floats: ReadonlyMap<number, ArcFloat>;
    /** 歌單欄其餘嘅行（飄唔到弧線上）：原地淡出 */
    ghostRows: readonly number[];
}

/** 歌單欄（鬆咗手，欄底 bottomIdle）入面、排喺飄去弧線嗰幾行之後嘅行 */
const columnLeftovers = (layout: StageLayout, count: number, from: number, extra: number) => {
    const { top, pitch } = layout.heldTracks;
    const room = heldColumnBottom(layout, false, extra) - top;
    const rows: number[] = [];
    for (let index = from; index < count && rowCentre(index, pitch, 0) < room; index += 1) {
        rows.push(index);
    }
    return rows;
};

/**
 * 打開嗰陣（mount）計一次飄落嘅起點（設計稿第 19 版 listLayer()）：之後捲動唔會重計、唔會重播。
 * 唔係飄落（`floating` false）= null
 */
export const useArcFloat = (
    list: ArcListView,
    layout: StageLayout,
    floating: boolean,
): ArcFloatPlan | null => {
    const { extraUnits } = useStageFitContext();
    const [plan] = useState(() => {
        if (!floating) return null;
        const isOff = (index: number) => !list.rows[index]?.playable;
        const poses = arcRows(list.rows.length, list.focusIndex, arcRowSpec(layout), isOff);
        const stagger = MOTION.scene.listRowStaggerMs;
        const floats = arcFloats(poses, layout, extraUnits, stagger);
        const ghostRows = columnLeftovers(layout, list.rows.length, poses.length, extraUnits);
        return { floats, ghostRows };
    });
    return floating ? plan : null;
};
