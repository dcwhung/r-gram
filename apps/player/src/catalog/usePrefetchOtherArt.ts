import { type CatalogDocument, mediaUrl } from '@r-gram/catalog';
import { useEffect, useRef } from 'react';
import { onIdle } from '../utils/idle';
import { coverVariantOf, type CoverVariants } from './coverVariants';
import { findAlbum, otherArt } from './selectors';

export interface PrefetchDeps {
    /** 攞一張圖（結果唔使用：只係令佢經 Service Worker / HTTP cache 留低） */
    prefetch: (url: string) => void;
    /** 瀏覽器有空先做；回傳取消函數 */
    onIdle: (callback: () => void) => () => void;
}

/**
 * 封面喺另一個 origin（API），所以用 no-cors：拎到嘅係 opaque 回應，但一樣會經 Service Worker 嘅 runtime cache。
 * 攞唔到（離線、網絡差）就算，下次睇呢隻碟再試唔試都唔緊要。
 */
export const prefetchImage = (url: string): void => {
    void globalThis.fetch(url, { mode: 'no-cors' }).catch(() => undefined);
};

const DEFAULT_DEPS: PrefetchDeps = { prefetch: prefetchImage, onIdle };

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

/**
 * 兩張封面都入離線 cache（Functional Spec FR-042；Technical Spec「播放端隨機封面」）：畫面上嘅碟換咗之後，
 * 瀏覽器有空先順手攞另一張。只限睇過嘅專輯；每張圖今次開 app 只攞一次。
 */
export const usePrefetchOtherArt = (
    catalog: CatalogDocument | null,
    albumId: string | null,
    covers: CoverVariants,
    deps: PrefetchDeps = DEFAULT_DEPS,
): void => {
    const fetched = useRef(new Set<string>());
    const { prefetch, onIdle: whenIdle } = deps;
    useEffect(() => {
        if (!catalog || !albumId) return undefined;
        const urls = otherArtUrls(catalog, albumId, covers).filter(
            (url) => !fetched.current.has(url),
        );
        if (urls.length === 0) return undefined;
        return whenIdle(() => {
            urls.forEach((url) => {
                fetched.current.add(url);
                prefetch(url);
            });
        });
    }, [catalog, albumId, covers, prefetch, whenIdle]);
};
