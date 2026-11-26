/*
 * D1 資料 → catalog 文件（Technical Spec API-070；packages/catalog 嘅 CatalogDocument）。
 * - 全部專輯同歌（CR-003：冇上下架）；冇歌嘅專輯照出（D39）；冇音檔嘅歌照出，audio = null（D11）
 * - 空字串 / 空白轉 null（validator 唔收空字串，backlog B-005）
 * - CR-007（Technical Spec「內容檔」）：冇 label、subtitle；wheelKey = wheelKeyFor(碟名)；專輯次序 = albumOrder()；
 *   冇音檔嘅歌（灰色行）照出，佢嘅 mv、lyrics、credits 一律 null（D54：冇音檔唔匯入文字同 MV）
 * - CR-006（Functional Spec D63、D44）：專輯只有年份（直接輸入嘅值），冇發行日期、冇自由文字類型
 * - audio / mv 係媒體 bucket（rb-discography）嘅 key 原文，cover / thumb / lyrics 係檔名：播放端用 mediaUrl(base, key) 逐段 encode
 * - CR-005（D55）：第二張封面 cover2 / thumb2 一律出（冇 = null，同第一張一樣嘅寫法；validator 亦收冇呢兩個欄嘅舊 document）
 * 呢度唔驗證：rebuild.ts 寫入之前一定行 parseCatalogDocument()
 */
import {
    CATALOG_VERSION,
    CREDIT_FIELDS,
    wheelKeyFor,
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    type TrackCredits,
} from '@r-gram/catalog';
import { byAlbumOrder } from '../albums/rows';
import { IMAGE_PUBLIC_PATH, LYRICS_PUBLIC_PATH } from '../config';
import type { Env } from '../env';
import type { AlbumSnapshot, CatalogSnapshot, TrackSnapshot } from './snapshot';

/** 文件除咗 generatedAt 之外嘅內容：hash 只計呢部分（時間唔同唔算改咗） */
export type CatalogContent = Omit<CatalogDocument, 'generatedAt'>;

type Bases = Pick<CatalogDocument, 'mediaBase' | 'imageBase' | 'lyricsBase'>;

export const catalogBases = (env: Pick<Env, 'MEDIA_BASE' | 'WORKER_ORIGIN'>): Bases => ({
    mediaBase: env.MEDIA_BASE,
    imageBase: `${env.WORKER_ORIGIN}${IMAGE_PUBLIC_PATH}`,
    lyricsBase: `${env.WORKER_ORIGIN}${LYRICS_PUBLIC_PATH}`,
});

const orNull = (value: string | null): string | null =>
    value === null || value.trim() === '' ? null : value;

/** 四個欄都冇 → null */
const creditsOf = (track: TrackSnapshot): TrackCredits | null => {
    const credits = Object.fromEntries(
        CREDIT_FIELDS.map((field) => [field, orNull(track[field])]),
    ) as unknown as TrackCredits;
    return CREDIT_FIELDS.some((field) => credits[field] !== null) ? credits : null;
};

const GREY_ROW = { credits: null, mv: null, lyrics: null } as const;

const toTrack = (track: TrackSnapshot): CatalogTrack => {
    const audio = orNull(track.audio_key);
    const ids = { id: track.id, no: track.no, title: track.title };
    if (audio === null) return { ...ids, ...GREY_ROW, audio };
    const media = { mv: orNull(track.mv_key), lyrics: orNull(track.json_name) };
    return { ...ids, credits: creditsOf(track), audio, ...media };
};

const toAlbum = (album: AlbumSnapshot, tracks: readonly TrackSnapshot[]): CatalogAlbum => ({
    id: album.id,
    title: album.title,
    wheelKey: wheelKeyFor(album.title),
    year: album.year,
    category: album.category,
    categoryNo: album.category_no,
    accent: album.accent,
    cover: orNull(album.cover),
    thumb: orNull(album.thumb),
    cover2: orNull(album.cover2),
    thumb2: orNull(album.thumb2),
    tracks: tracks.map(toTrack),
});

/** 歌按專輯分組（snapshot 已按歌號排好） */
const tracksByAlbum = (tracks: readonly TrackSnapshot[]): Map<string, TrackSnapshot[]> => {
    const grouped = new Map<string, TrackSnapshot[]>();
    for (const track of tracks) {
        grouped.set(track.album_id, [...(grouped.get(track.album_id) ?? []), track]);
    }
    return grouped;
};

export const buildContent = (snapshot: CatalogSnapshot, bases: Bases): CatalogContent => {
    const grouped = tracksByAlbum(snapshot.tracks);
    return {
        version: CATALOG_VERSION,
        ...bases,
        albums: [...snapshot.albums]
            .sort(byAlbumOrder)
            .map((album) => toAlbum(album, grouped.get(album.id) ?? [])),
    };
};

/** 加生成時間；key 次序同 API-070 嘅例子一樣 */
export const buildDocument = (content: CatalogContent, generatedAt: string): CatalogDocument => {
    const { version, ...rest } = content;
    return { version, generatedAt, ...rest };
};
