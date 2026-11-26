import { useMemo } from 'react';
import type { TrackRow } from '../../app/heldTracksView';
import type { StageLayout } from '../../stage/layouts';
import type { TextFont, TextMeasure } from '../../utils/textMeasure';
import { truncateLine } from '../../utils/truncateLine';

/** 設計稿 listLayer()：揀中嗰行 CJK 700（截短以佢做準，其他行用同一段字） */
const TITLE_WEIGHT = 700;
/** 每行歌名之間嘅分隔：歌名入面唔會有換行 */
const KEY_SEPARATOR = '\n';

/**
 * 每行顯示嘅歌名（設計稿表格「歌名最多約 8 個中文字，再長用『…』收尾」；Functional Spec D23）：
 * 以揀中嗰行嘅字級量，放唔落 `titleChars` 個全形字就截短。捲動時字級會變，但截短嘅字唔變（唔使重新量）。
 * 每次揀中另一首，畫面會由 catalog 重新砌一份行（新 array），所以用歌名串做 key：歌名冇變就唔再量
 */
export const useArcTitles = (
    rows: readonly TrackRow[],
    layout: StageLayout,
    measure: TextMeasure,
): readonly string[] => {
    const key = rows.map(({ title }) => title).join(KEY_SEPARATOR);
    return useMemo(() => {
        const { list } = layout;
        const font: TextFont = {
            family: 'cjk',
            size: list.focusSize,
            weight: TITLE_WEIGHT,
            spacing: 0,
        };
        const width = list.titleChars * list.focusSize;
        const titles = key === '' ? [] : key.split(KEY_SEPARATOR);
        return titles.map((title) => truncateLine(title, width, (text) => measure(text, font)));
    }, [key, layout, measure]);
};
