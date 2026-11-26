/*
 * 同步事件 → 記錄行（純文字，經語言檔）。一個資料夾一行（新增／更新／沒有改動），
 * 另外每首未能同步嘅歌、檢查結果、封面、問題（連錯誤碼同資料夾）各一行；總結喺另一區
 */
import { COVER_SIDE_PX, type PendingRemoval } from '@r-gram/catalog';
import type { CheckItem } from '../api/types';
import { t } from '../i18n/t';
import type { SyncEvent } from '../sync/events';

type Of<K extends SyncEvent['type']> = Extract<SyncEvent, { type: K }>;

const UNKNOWN_NO = '?';

/** NO_AUDIO × 2、TEXT_INVALID：同一個碼合埋 */
const checkCodes = (checks: readonly CheckItem[]): string => {
    const counts = new Map<string, number>();
    for (const { code } of checks) counts.set(code, (counts.get(code) ?? 0) + 1);
    const items = [...counts].map(([code, count]) => (count > 1 ? `${code} × ${count}` : code));
    return items.join(t('log.listSeparator'));
};

const folderLines = ({
    folder,
    created,
    added,
    updated,
    unchanged,
    failed,
    checks,
}: Of<'folderDone'>) => {
    const counts = { folder, added, updated, unchanged };
    const head = created ? t('log.folderCreated', counts) : t('log.folderDone', counts);
    const failures = failed.map(({ no, code }) => t('log.failedTrack', { folder, no, code }));
    const checkLine = checks.length
        ? [t('log.checks', { folder, count: checks.length, codes: checkCodes(checks) })]
        : [];
    return [head, ...failures, ...checkLine];
};

const coverLine = ({ folder, slot, upscaled, notSquare }: Of<'coverDone'>) => {
    const notes =
        (upscaled ? t('log.coverUpscaled', { side: COVER_SIDE_PX }) : '') +
        (notSquare ? t('log.coverNotSquare') : '');
    return t('log.coverDone', { folder, slot: t(`slots.${slot}`), notes });
};

const removalWhat = (removal: PendingRemoval & { title?: string }): string => {
    const title = removal.title ?? '';
    const key = removal.key ?? '';
    if (removal.kind === 'album') return t('removal.album', { title });
    if (removal.kind === 'track')
        return t('removal.track', { no: removal.no ?? UNKNOWN_NO, title });
    if (removal.kind === 'cover')
        return t('removal.cover', { slot: t(`slots.${removal.slot ?? 'cover'}`) });
    return t(`removal.${removal.kind}`, { key });
};

const LINES: { [K in SyncEvent['type']]: (event: Of<K>) => string[] } = {
    started: ({ folders }) => [t('log.started', { count: folders })],
    invalidFolder: ({ folder, code }) => [t('log.invalidFolder', { folder, code })],
    duplicateId: ({ id, folders }) => [
        t('log.duplicateId', { id, folders: folders.join(t('log.listSeparator')) }),
    ],
    truncated: () => [t('log.truncated')],
    retry: ({ folder, attempt, code }) => [
        t('log.retry', { place: folder ?? t('log.overviewPlace'), attempt, code }),
    ],
    folderDone: folderLines,
    folderProblem: ({ folder, code }) => [t('log.folderProblem', { folder, code })],
    coverDone: (event) => [coverLine(event)],
    coverProblem: ({ folder, slot, code }) => [
        t('log.coverProblem', { folder, slot: t(`slots.${slot}`), code }),
    ],
    removal: ({ folder, removal }) => [t('log.removal', { folder, what: removalWhat(removal) })],
    stopped: ({ code }) => [t('log.stopped', { code })],
    finished: () => [t('log.finished')],
};

export const logLines = (event: SyncEvent): string[] =>
    (LINES[event.type] as (event: SyncEvent) => string[])(event);
