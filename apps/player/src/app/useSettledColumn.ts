import { useEffect, useState } from 'react';
import { MOTION } from '../config/motion';
import type { TrackColumnView } from './heldTracksView';

/**
 * 快擰途中唔顯示歌單欄（設計稿第 19 版 ACTIONS.turn、PANEL_FLOAT.settle；backlog B-086 ④）：
 * 字母盤開住而旋鈕轉到另一隻碟，要停喺嗰隻碟 `columnSettleMs` 先出（之後逐行飄落）。字母盤收埋時
 * 記住顯示緊嘅碟（冇歌單欄都記），所以打開字母盤嗰下即刻出；未停定就鬆手亦即刻出。
 * 係輸入規則，唔係動畫：減少動態效果都一樣
 */
export const useSettledColumn = (
    column: TrackColumnView | null,
    viewAlbumId: string | null,
): TrackColumnView | null => {
    const turning = column?.dialOpen === true;
    const albumId = column?.albumId ?? viewAlbumId;
    const [settled, setSettled] = useState(albumId);
    // 「render 期間調整 state」：字母盤收埋就跟住顯示緊嘅碟，唔使等 effect 閃一格
    if (!turning && settled !== albumId) setSettled(albumId);
    const waiting = turning && settled !== albumId;
    useEffect(() => {
        if (!waiting) return undefined;
        const timer = setTimeout(() => setSettled(albumId), MOTION.input.columnSettleMs);
        return () => clearTimeout(timer);
    }, [waiting, albumId]);
    return waiting ? null : column;
};
