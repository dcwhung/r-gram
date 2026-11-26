import { useState } from 'react';
import type { ArcListView } from '../../app/listView';
import { MOTION } from '../../config/motion';
import { arcRing, arcRowSpec } from '../../stage/arcRows';
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
    /** 接駁位另一邊嘅行（設計稿第 20 版 wrapped）：唔飄，框線伸出時原地淡入 */
    appear: ReadonlySet<number>;
    /** 打開嗰陣見到接駁位：佢都原地淡入 */
    seam: boolean;
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
 * 第 20 版頭尾相接：淨係框嘅近邊（未過接駁位）嗰啲行由歌單欄飄落；另一邊嘅行同接駁位原地淡入。
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
        const ring = arcRing(list.rows.length, list.focusIndex, arcRowSpec(layout), isOff);
        const poses = ring.rows.filter(({ wrapped }) => !wrapped);
        const stagger = MOTION.scene.listRowStaggerMs;
        const floats = arcFloats(poses, layout, extraUnits, stagger);
        const ghostRows = columnLeftovers(layout, list.rows.length, poses.length, extraUnits);
        const appear = new Set(
            ring.rows.filter(({ wrapped }) => wrapped).map(({ index }) => index),
        );
        return { floats, ghostRows, appear, seam: ring.seam !== null };
    });
    return floating ? plan : null;
};
