/*
 * 同步寫 tracks（全部 parameterised；欄位名只嚟自常數）：一首已有嘅歌嘅歌名、連結，同（`.txt` 有新版本先有）
 * credit + 歌詞 + text_source_etag，一個 batch。`WHERE updated_at = 讀狀態時嘅值`：同時另一個同步先改咗 → 冇改到（null）
 */
import { CREDIT_FIELDS, type TrackCredits } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import type { StoredLyrics } from '../tracks/songText';
import { lyricsWrite } from '../tracks/store';

export interface TrackLinks {
    title: string;
    audioKey: string | null;
    mvKey: string | null;
    textKey: string | null;
}

/** `.txt` 嘅新內容（有效、ETag 同上次匯入唔同） */
export interface TextContent {
    credits: TrackCredits | null;
    lyrics: StoredLyrics | null;
    etag: string;
}

const LINKS_SQL = `title = ?1, audio_key = ?2, mv_key = ?3, text_key = ?4, updated_at = ?5`;
const CONTENT_SQL = `composer = ?8, lyricist = ?9, arranger = ?10, producer = ?11, text_source_etag = ?12`;

const linkValues = ({ title, audioKey, mvKey, textKey }: TrackLinks) => [
    title,
    audioKey,
    mvKey,
    textKey,
];

const contentValues = ({ credits, etag }: TextContent) => [
    ...CREDIT_FIELDS.map((field) => credits?.[field] ?? null),
    etag,
];

/** 寫入後嘅 updated_at；冇改到 → null */
export const updateSyncedTrack = async (
    db: D1Database,
    current: { id: string; updatedAt: string },
    links: TrackLinks,
    content: TextContent | null,
): Promise<string | null> => {
    const updatedAt = nextUpdatedAt(current.updatedAt);
    const set = content ? `${LINKS_SQL}, ${CONTENT_SQL}` : LINKS_SQL;
    const update = db
        .prepare(`UPDATE tracks SET ${set} WHERE id = ?6 AND updated_at = ?7 RETURNING updated_at`)
        .bind(
            ...linkValues(links),
            updatedAt,
            current.id,
            current.updatedAt,
            ...(content ? contentValues(content) : []),
        );
    const statements = content
        ? [update, lyricsWrite(db, current.id, content.lyrics, updatedAt)]
        : [update];
    const [result] = await db.batch<{ updated_at: string }>(statements);
    return result?.results[0]?.updated_at ?? null;
};
