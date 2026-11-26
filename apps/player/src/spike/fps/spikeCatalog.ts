/*
 * ⑤ 模糊背景用真嘅主頁（HomeScene）：由測試碟砌一份最細嘅 catalog（只喺記憶體；唔經 validator，網址直接指去 bucket）。
 */
import { CATALOG_VERSION, type CatalogAlbum, type CatalogDocument } from '@r-gram/catalog';
import { ALBUM_FOLDER } from '../config';
import type { SpikeMedia } from '../media/useMedia';

const ALBUM_ID = 'komorebi';
/** 隨便一個專輯色：spike 只量 fps，唔比較顏色 */
const SPIKE_ACCENT = '#c8442b';
const CATEGORY_NO = 11;
const WHEEL_KEY = 'K';

const albumOf = (media: SpikeMedia): CatalogAlbum => ({
    id: ALBUM_ID,
    title: media.albumTitle,
    wheelKey: WHEEL_KEY,
    year: null,
    category: 'album',
    categoryNo: CATEGORY_NO,
    accent: SPIKE_ACCENT,
    cover: media.coverName,
    thumb: media.coverName,
    tracks: media.tracks.map((track, index) => ({
        id: `${ALBUM_ID}-${index + 1}`,
        no: index + 1,
        title: track.title,
        credits: null,
        audio: track.name,
        mv: null,
        lyrics: null,
    })),
});

export const spikeCatalog = (media: SpikeMedia): CatalogDocument => {
    const folder = `${media.base}${ALBUM_FOLDER}/`;
    return {
        version: CATALOG_VERSION,
        generatedAt: new Date(0).toISOString(),
        mediaBase: folder,
        imageBase: folder,
        lyricsBase: folder,
        albums: [albumOf(media)],
    };
};
