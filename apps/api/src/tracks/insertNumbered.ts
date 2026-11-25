/*
 * 用指定歌號新增一首歌（API-020、掃描建立歌曲 API-031 共用；Functional Spec D60、D61）：
 * id 先試 `<albumId>-<NN>`（trackIdFor），已經有人用（舊歌改過歌號）先用隨機 id，最多 RANDOM_ID_ATTEMPTS 次
 */
import { trackIdFor, type SongText } from '@r-gram/catalog';
import { newTrackId } from './ids';
import type { TrackRow } from './rows';
import type { StoredLyrics } from './songText';
import * as store from './store';

/** `<albumId>-<NN>` 撞咗之後，隨機 id（36^6 個可能）最多試幾次；試完都唔得當伺服器錯誤 */
const RANDOM_ID_ATTEMPTS = 3;

/** null = 冇呢張碟（檢查之後被刪咗） */
export type Inserted = TrackRow | null | 'numberTaken' | 'exhausted';

export interface NewTrack {
    db: D1Database;
    albumId: string;
    song: SongText;
    lyrics: StoredLyrics | null;
    files?: store.TrackFiles;
}

/** 先試 `<albumId>-<NN>`，撞 PK 再試隨機 id；撞歌號 → 'numberTaken' */
export const insertNumbered = async (track: NewTrack, no: number): Promise<Inserted> => {
    const { db, albumId, song, lyrics, files } = track;
    for (let attempt = 0; ; attempt += 1) {
        const id = attempt === 0 ? trackIdFor(albumId, no) : newTrackId(albumId);
        try {
            return await store.insertTrack(db, { id, albumId, no }, song, lyrics, files);
        } catch (error) {
            if (store.isNumberTaken(error)) return 'numberTaken';
            if (attempt >= RANDOM_ID_ATTEMPTS || !store.isIdTaken(error)) throw error;
        }
    }
};
