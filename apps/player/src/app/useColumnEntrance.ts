import { useState } from 'react';

/**
 * 歌單欄第幾次出現（設計稿第 19 版 ACTIONS.wheel；review W-055）：打開字母盤而唔係拎住另一隻碟，就算一次新嘅
 * 出現（`panelFresh`），歌單欄以此重新 mount = 捲返頂、逐行重新飄落；拎住另一隻碟（`away`）唔重播。
 * 減少動態效果時照樣重新 mount（設計稿 `listScroll: 0`），飄落由 CSS 關掉
 */
export const useColumnEntrance = (dialOpen: boolean, holding: boolean): number => {
    const [entrance, setEntrance] = useState(0);
    const [wasOpen, setWasOpen] = useState(dialOpen);
    // 「render 期間調整 state」：打開字母盤嗰次 render 就換，唔使等 effect 閃一格
    if (wasOpen !== dialOpen) {
        setWasOpen(dialOpen);
        if (dialOpen && !holding) setEntrance(entrance + 1);
    }
    return entrance;
};
