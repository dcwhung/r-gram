/*
 * API-040 GET、API-041 PUT /api/tracks/:id/text（T-106；Technical Spec「寫返媒體 bucket」；Functional Spec D72、D75、FR-129）：
 * 歌曲文字框讀寫媒體 bucket 嘅 `NN ….txt`（揀邊個檔：packages/catalog songTextTarget()，同同步一樣）。
 * - 讀：`{ trackId, key, etag, text, problem }`；冇檔 = `{ key: null, etag: null, text: 歌名 }`；幾個檔而冇 D1 嗰個 = 409 TEXT_CONFLICT
 * - 寫：body `{ text, etag }`（400）→ parseSongText()（逐行 400；太大 413）→ 歌（404）→ 資料夾過 resolveAlbumFolder()
 *  （同 API-034；id 唔係呢張碟 = 409 FOLDER_MISMATCH）→ 冇音檔 409 NO_AUDIO → 衝突 409 TEXT_CONFLICT →
 *   已有嘅檔大過上限 409 FILE_TOO_LARGE（S-181）→ 會清走現有歌詞而冇 ?force=1 → 409 LYRICS_REMOVED（D30）
 *   → putMediaText()（已有 = 嗰個檔；冇 = `NN 歌名.txt`；版本唔啱 = 409 STALE）→ 同步呢個資料夾（runFolderSync，
 *   由呢首歌起；credit、歌詞、歌詞 JSON 由同步照 `.txt` 寫）→ `{ trackId, key, etag, text, track, checks, hints, sync }`。
 *   任何一步擋住都乜都唔寫；寫咗檔而同步出錯 = 500，下次同步會補返
 */
import {
    formatSongText,
    parseAlbumFolder,
    SONG_TEXT_MAX_BYTES,
    songTextTarget,
    type ScanFile,
    type SongTextTarget,
} from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { FORCE_CONFIRMED } from '../config';
import { listFolder, type FolderListing } from '../media/listing';
import { readMediaText } from '../media/readText';
import { readTextRequest } from '../media/textBody';
import { normalizeText, putMediaText } from '../media/writeText';
import { syncError } from '../sync/errors';
import { resolveAlbumFolder, type FolderTarget } from '../sync/folderTarget';
import { runFolderSync } from '../sync/syncFolder';
import { trackError, trackValidationError } from './errors';
import { trackOf } from './rows';
import { parseText, type ReadSong } from './songText';
import { findTrackText, type TrackTextRow } from './store';

const isConfirmed = (c: Context) => c.req.query('force') === FORCE_CONFIRMED;

const targetOf = (row: TrackTextRow, files: readonly ScanFile[]): SongTextTarget =>
    songTextTarget({
        folder: row.folder,
        no: row.no,
        title: row.title,
        files,
        stored: { audioKey: row.audio_key, textKey: row.text_key },
    });

const templateOf = (row: TrackTextRow) => ({
    trackId: row.id,
    key: null,
    etag: null,
    text: formatSongText({ title: row.title, credits: null, lyrics: null }),
    problem: null,
});

export const getTrackText = async (c: Context<AppEnv>) => {
    const row = await findTrackText(c.env.DB, c.req.param('id') ?? '');
    if (!row) return trackError(c, 'notFound');
    if (!parseAlbumFolder(row.folder)) return syncError(c, 'invalidFolder');
    const listing = await listFolder(c.env.MEDIA, row.folder);
    if (listing.files.length === 0) return syncError(c, 'folderEmpty');
    const target = targetOf(row, listing.files);
    if (target.conflict) return trackError(c, 'textConflict');
    const key = target.file?.key;
    const read = key ? await readMediaText(c.env.MEDIA, key, SONG_TEXT_MAX_BYTES) : null;
    return c.json(key && read ? { trackId: row.id, key, ...read } : templateOf(row));
};

interface SongBody {
    text: string;
    etag: string | null;
    read: ReadSong;
}

/** body → 文字、版本、解析結果；唔得 = 錯誤回應（400 / 413） */
const songBodyOf = async (c: Context<AppEnv>): Promise<SongBody | Response> => {
    const body = await readTextRequest(c, SONG_TEXT_MAX_BYTES);
    if (body === 'tooLarge') return trackError(c, 'tooLarge');
    if (!body.ok) return trackValidationError(c, body.issues);
    const text = normalizeText(body.text);
    const read = parseText(text);
    if (read === 'tooLarge') return trackError(c, 'tooLarge');
    if (Array.isArray(read)) return trackValidationError(c, read);
    return { text, etag: body.etag, read };
};

/** 寫之前嘅檢查；冇問題 = null */
const refusal = (
    c: Context<AppEnv>,
    row: TrackTextRow,
    located: { target: SongTextTarget; listing: FolderListing },
    body: SongBody,
): Response | null => {
    const { target, listing } = located;
    if (!target.audio) return trackError(c, 'noAudio');
    if (target.conflict) return trackError(c, 'textConflict');
    // S-181：已有嘅檔大過上限 = 文字框冇顯示過內容，唔覆蓋（要喺電腦改細再上載）
    if (target.file && target.file.bytes > SONG_TEXT_MAX_BYTES)
        return trackError(c, 'fileTooLarge');
    // list 唔齊又搵唔到檔：唔知會唔會開多一個 `.txt`
    if (!target.file && listing.truncated) return trackError(c, 'stale');
    if (row.json_name === null || body.read.song.lyrics || isConfirmed(c)) return null;
    const details = [{ type: 'lyrics', trackId: row.id, lineCount: row.line_count }];
    return trackError(c, 'lyricsRemoved', details);
};

const syncedResponse = async (
    c: Context<AppEnv>,
    row: TrackTextRow,
    folder: FolderTarget,
    written: { key: string; etag: string; body: SongBody },
) => {
    const result = await runFolderSync(c, folder, row.no);
    if (result === 'folderEmpty') return syncError(c, result);
    const { key, etag, body } = written;
    const track = await trackOf(c.env.DB, row.id);
    const checks = result.checks.filter(({ no }) => no === row.no);
    const reply = { trackId: row.id, key, etag, text: body.text, track, checks };
    return c.json({ ...reply, hints: body.read.hints, sync: result });
};

const writeAndSync = async (c: Context<AppEnv>, row: TrackTextRow, body: SongBody) => {
    const folder = await resolveAlbumFolder(c.env, row.folder, row.album_id);
    if (typeof folder === 'string') return syncError(c, folder);
    const listing = await listFolder(c.env.MEDIA, folder.folder);
    const target = targetOf(row, listing.files);
    const refused = refusal(c, row, { target, listing }, body);
    if (refused) return refused;
    const media = { kind: 'text' as const, folder: folder.folder, key: target.key, no: row.no };
    const etag = await putMediaText(c.env.MEDIA, media, body.text, body.etag);
    if (etag === null) return trackError(c, 'stale');
    return syncedResponse(c, row, folder, { key: target.key, etag, body });
};

export const putTrackText = async (c: Context<AppEnv>) => {
    const body = await songBodyOf(c);
    if (body instanceof Response) return body;
    const row = await findTrackText(c.env.DB, c.req.param('id') ?? '');
    if (!row) return trackError(c, 'notFound');
    return writeAndSync(c, row, body);
};
