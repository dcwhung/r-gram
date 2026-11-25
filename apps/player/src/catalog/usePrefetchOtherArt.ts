import { type CatalogDocument, mediaUrl } from '@r-gram/catalog';
import { useEffect, useRef } from 'react';
import { onIdle } from '../utils/idle';
import { fetchImage } from './fetchImage';
import { coverVariantOf, type CoverVariants } from './coverVariants';
import { findAlbum, otherArt } from './selectors';

export interface PrefetchDeps {
    /** 攞一張圖入 cache；resolve 攞唔攞到（永遠唔 reject） */
    prefetch: (url: string) => Promise<boolean>;
    /** 瀏覽器有空先做；回傳取消函數 */
    onIdle: (callback: () => void) => () => void;
}

const DEFAULT_DEPS: PrefetchDeps = { prefetch: (url) => fetchImage(url), onIdle };

/** 呢隻碟冇顯示嗰張封面（大封面同縮圖）嘅網址；得一張封面就冇 */
const otherArtUrls = (
    catalog: CatalogDocument,
    albumId: string,
    covers: CoverVariants,
): string[] => {
    const album = findAlbum(catalog, albumId);
    const art = album ? otherArt(album, coverVariantOf(covers, albumId)) : null;
    return [art?.cover, art?.thumb]
        .filter((name): name is string => Boolean(name))
        .map((name) => mediaUrl(catalog.imageBase, name));
};

/** 今次開 app 攞過嘅圖：`done` = 攞到；`pending` = 攞緊（唔好再發多次） */
interface Fetched {
    done: Set<string>;
    pending: Set<string>;
}

/** 攞到先記做已攞；失敗（離線、網絡差）唔記，下次睇呢隻碟再試（backlog B-072 ③） */
const fetchOnce = (url: string, fetched: Fetched, prefetch: PrefetchDeps['prefetch']): void => {
    fetched.pending.add(url);
    void prefetch(url).then((ok) => {
        fetched.pending.delete(url);
        if (ok) fetched.done.add(url);
    });
};

/**
 * 兩張封面都入離線 cache（Functional Spec FR-042；Technical Spec「播放端隨機封面」）：畫面上嘅碟換咗之後，
 * 瀏覽器有空先順手攞另一張。只限睇過嘅專輯；每張圖今次開 app 攞到一次就夠。
 */
export const usePrefetchOtherArt = (
    catalog: CatalogDocument | null,
    albumId: string | null,
    covers: CoverVariants,
    deps: PrefetchDeps = DEFAULT_DEPS,
): void => {
    const fetched = useRef<Fetched>({ done: new Set(), pending: new Set() });
    const { prefetch, onIdle: whenIdle } = deps;
    useEffect(() => {
        if (!catalog || !albumId) return undefined;
        const { done, pending } = fetched.current;
        const urls = otherArtUrls(catalog, albumId, covers).filter(
            (url) => !done.has(url) && !pending.has(url),
        );
        if (urls.length === 0) return undefined;
        return whenIdle(() => urls.forEach((url) => fetchOnce(url, fetched.current, prefetch)));
    }, [catalog, albumId, covers, prefetch, whenIdle]);
};
