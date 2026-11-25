/*
 * API-031：套用之前讀一次狀態（專輯、歌、資料夾 list），再驗 body 同呢張碟對唔對得上（400，乜都唔寫）：
 * key 一定係呢張碟資料夾第一層嘅檔（NOT_IN_FOLDER）、trackId 一定屬於呢張碟（NOT_IN_ALBUM）、
 * 檔案類別同歌號一定同項目一致（WRONG_FILE：例如 create 第 5 首嘅 audioKey 一定係 `05 … .m4a｜mp3`）
 */
import { classifyFile, type NumberedKind, type ScanFile } from '@r-gram/catalog';
import type { AlbumRow } from '../albums/rows';
import type { ApplyBody, ListName } from './applyShape';
import type { ScanDetail, ScanReason } from './errors';
import { isDirectChild, listFolder } from './listing';
import { readScanState, type ScanTrack } from './state';

export interface ApplyContext {
    albumId: string;
    folder: string;
    /** 資料夾第一層嘅檔（key → 檔） */
    files: Map<string, ScanFile>;
    /** 呢張碟嘅歌（id → 歌）；套用期間寫入之後更新 updatedAt */
    tracks: Map<string, ScanTrack>;
    /** 呢個歌號有冇音檔：資料夾有 `.m4a`／`.mp3`，或者有歌手動指定咗音檔（Functional Spec D54） */
    hasAudio: (no: number) => boolean;
}

const audioNumbers = (files: readonly ScanFile[], tracks: readonly ScanTrack[]): Set<number> => {
    const numbers = new Set(tracks.filter(({ audioManual }) => audioManual).map(({ no }) => no));
    for (const { key } of files) {
        const found = classifyFile(key);
        if (found.kind === 'audio') numbers.add(found.no);
    }
    return numbers;
};

export const loadApplyContext = async (
    db: D1Database,
    bucket: R2Bucket,
    album: AlbumRow,
): Promise<ApplyContext> => {
    const state = await readScanState(db, album);
    const files = await listFolder(bucket, state.folder);
    const numbers = audioNumbers(files, state.tracks);
    return {
        albumId: album.id,
        folder: state.folder,
        files: new Map(files.map((file) => [file.key, file])),
        tracks: new Map(state.tracks.map((track) => [track.id, track])),
        hasAudio: (no) => numbers.has(no),
    };
};

/** 一個 key 喺呢張碟資料夾、類別同歌號啱 */
const keyIssue = (
    context: ApplyContext,
    key: string,
    kind: NumberedKind,
    no: number | undefined,
): ScanReason | undefined => {
    if (!isDirectChild(key, context.folder)) return 'NOT_IN_FOLDER';
    const found = classifyFile(key);
    return found.kind === kind && 'no' in found && found.no === no ? undefined : 'WRONG_FILE';
};

type Issue = (path: string, reason: ScanReason | undefined) => void;

const checkTrackItems = (
    context: ApplyContext,
    body: ApplyBody,
    name: Exclude<ListName, 'create'>,
    issue: Issue,
) => {
    const seen = new Set<string>();
    body[name].forEach((item, index) => {
        const path = `${name}[${index}]`;
        const track = context.tracks.get(item.trackId);
        if (!track) return issue(`${path}.trackId`, 'NOT_IN_ALBUM');
        const kind = 'kind' in item ? item.kind : 'text';
        if ('key' in item) issue(`${path}.key`, keyIssue(context, item.key, kind, track.no));
        const id = `${item.trackId}:${kind}`;
        if (seen.has(id)) issue(`${path}.trackId`, 'DUPLICATE_ITEM');
        seen.add(id);
    });
};

const checkCreateItems = (context: ApplyContext, body: ApplyBody, issue: Issue) => {
    const seen = new Set<number>();
    body.create.forEach(({ no, audioKey, mvKey, text }, index) => {
        const path = `create[${index}]`;
        issue(`${path}.audioKey`, keyIssue(context, audioKey, 'audio', no));
        if (mvKey !== null) issue(`${path}.mvKey`, keyIssue(context, mvKey, 'mv', no));
        if (text !== null) issue(`${path}.text`, keyIssue(context, text.key, 'text', no));
        if (seen.has(no)) issue(`${path}.no`, 'DUPLICATE_ITEM');
        seen.add(no);
    });
};

/** 驗證次序同 body 嘅 list 次序一樣（media、songTexts、create、clearAudio） */
export const contextIssues = (context: ApplyContext, body: ApplyBody): ScanDetail[] => {
    const issues: ScanDetail[] = [];
    const issue: Issue = (path, reason) => {
        if (reason) issues.push({ path, reason });
    };
    checkTrackItems(context, body, 'media', issue);
    checkTrackItems(context, body, 'songTexts', issue);
    checkCreateItems(context, body, issue);
    checkTrackItems(context, body, 'clearAudio', issue);
    return issues;
};
