import { useEffect, useState } from 'react';
import type { TrackColumnView } from '../../app/heldTracksView';
import { MOTION } from '../../config/motion';
import { heldColumnBottom } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import { prefersReducedMotion } from '../../utils/motion';
import { entranceDelays, releasedRows } from './columnLayout';

const ENTRANCE = {
    staggerMs: MOTION.scene.columnRowStaggerMs,
    spreadMs: MOTION.scene.columnRowSpreadMs,
};

export interface ColumnMotion {
    /** 每行出現時遲幾耐（字母盤開住時出現先有）；mount 嗰陣計一次，捲動唔會重播 */
    enterDelays: readonly (number | null)[] | null;
    /** 鬆手時讓出嚟、要淡出嘅行；冇 = null */
    ghosts: { rows: readonly number[]; scroll: number } | null;
}

/** 鬆手嗰下要淡出嘅行：減少動態效果時冇 */
const releaseGhosts = (layout: StageLayout, count: number, scroll: number, extraUnits: number) => {
    if (prefersReducedMotion()) return null;
    const { top, pitch, fade } = layout.heldTracks;
    const idleRoom = heldColumnBottom(layout, false, extraUnits) - top;
    const openRoom = heldColumnBottom(layout, true, extraUnits) - top;
    const rows = releasedRows(count, { pitch, scroll, idleRoom, openRoom, fade });
    return rows.length > 0 ? { rows, scroll } : null;
};

/**
 * 歌單欄嘅兩個過場（設計稿第 19 版 PANEL_FLOAT、panelShrink；backlog B-086 ④⑤）：
 * - 出現：字母盤開住時 mount（換碟、停定、打開字母盤）= 每行由右上逐行飄落（CSS，減少動態效果時即時）
 * - 鬆手：欄底縮短，讓出嚟嗰幾行原地淡出（同三粒細掣淡入一齊）
 */
export const useColumnMotion = (
    layout: StageLayout,
    held: TrackColumnView,
    room: number,
    scroll: number,
): ColumnMotion => {
    const { extraUnits } = useStageFitContext();
    const { pitch } = layout.heldTracks;
    const count = held.rows.length;
    const [enterDelays] = useState(() =>
        held.dialOpen ? entranceDelays(count, pitch, room, ENTRANCE) : null,
    );
    const [wasOpen, setWasOpen] = useState(held.dialOpen);
    const [ghosts, setGhosts] = useState<ColumnMotion['ghosts']>(null);
    // 「render 期間調整 state」：鬆手嗰次 render 就要有淡出嘅行，唔好閃一格
    if (wasOpen !== held.dialOpen) {
        setWasOpen(held.dialOpen);
        setGhosts(wasOpen ? releaseGhosts(layout, count, scroll, extraUnits) : null);
    }
    // 淡出完就拆走（同 CSS 嘅 chrome-fade 一樣長）
    useEffect(() => {
        if (!ghosts) return undefined;
        const timer = setTimeout(() => setGhosts(null), MOTION.scene.chromeFadeMs);
        return () => clearTimeout(timer);
    }, [ghosts]);
    return { enterDelays, ghosts };
};
