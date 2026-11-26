import { useEffect, useState } from 'react';
import { listFloatTotalMs } from '../components/arc-list/arcFloat';
import type { StageLayout } from '../stage/layouts';
import { prefersReducedMotion } from '../utils/motion';
import type { ArcListView } from './listView';

/**
 * 弧線歌單啱啱由歌單欄打開，歌名飄緊落弧線（設計稿第 19 版 openListFloating()；backlog B-086 ②）：
 * 打開嗰下決定（由歌單欄開、而且冇要求減少動態效果），成個過場完就變返 false，之後重畫唔會再播
 */
export const useListFloating = (list: ArcListView | null, layout: StageLayout): boolean => {
    const open = list !== null;
    const [wasOpen, setWasOpen] = useState(open);
    const [floating, setFloating] = useState(false);
    // 「render 期間調整 state」：打開嗰次 render 就要有過場嘅 class，唔好閃一格
    if (wasOpen !== open) {
        setWasOpen(open);
        setFloating(Boolean(list?.fromColumn) && !prefersReducedMotion());
    }
    useEffect(() => {
        if (!floating) return undefined;
        const timer = setTimeout(() => setFloating(false), listFloatTotalMs(layout));
        return () => clearTimeout(timer);
    }, [floating, layout]);
    return floating;
};
