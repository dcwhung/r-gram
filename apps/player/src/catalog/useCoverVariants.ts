import type { CatalogDocument } from '@r-gram/catalog';
import { useState } from 'react';
import { type CoverVariants, NO_COVER_PICKS, pickCoverVariants } from './coverVariants';

interface Picked {
    catalog: CatalogDocument | null;
    covers: CoverVariants;
}

const pickFor = (
    catalog: CatalogDocument | null,
    random: () => number,
    previous: CoverVariants,
): Picked => ({
    catalog,
    covers: catalog ? pickCoverVariants(catalog.albums, random, previous) : previous,
});

const samePicks = (a: CoverVariants, b: CoverVariants): boolean =>
    a.size === b.size && [...a].every(([albumId, variant]) => b.get(albumId) === variant);

/**
 * 今次開 app 每張專輯用邊張封面（Functional Spec D56）：第一次有 catalog 時揀，之後 catalog 更新只幫新專輯揀，
 * 已揀嘅唔變。只放記憶體（React state），唔寫本機儲存：下次開 app 重新揀。
 */
export const useCoverVariants = (
    catalog: CatalogDocument | null,
    random: () => number = Math.random,
): CoverVariants => {
    const [picked, setPicked] = useState(() => pickFor(catalog, random, NO_COVER_PICKS));
    // catalog 換咗就喺同一次 render 補揀（React「render 期間調整 state」嘅做法），唔使等 effect 先畫舊封面
    if (picked.catalog === catalog) return picked.covers;
    const next = pickFor(catalog, random, picked.covers);
    // 內容一樣（例如每次 render 都畀一份新嘅同一個 catalog）就唔 set：唔會無限 re-render，亦保留同一個 Map
    if (samePicks(next.covers, picked.covers)) return picked.covers;
    setPicked(next);
    return next.covers;
};
