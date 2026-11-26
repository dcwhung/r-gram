/* 同步完嘅總結：全站統計（API-010）+ 今次處理咗嘅封面、檢查結果、待確認移除 */
import type { SiteStats } from '../api/types';
import { t } from '../i18n/t';
import type { zhHant } from '../i18n/zh-Hant';
import type { SyncSummary } from '../sync/events';

type CountKey = Exclude<keyof typeof zhHant.summary, 'statsUnavailable' | 'removalsNote'>;
type Row = [label: CountKey, value: number];

const statRows = (stats: SiteStats): Row[] => [
    ['albums', stats.albums],
    ['tracks', stats.tracks],
    ['audio', stats.tracksWithAudio],
    ['lyrics', stats.tracksWithLyrics],
    ['mv', stats.tracksWithMv],
];

const runRows = (summary: SyncSummary): Row[] => [
    ['covers', summary.coversDone],
    ['coverProblems', summary.coverProblems],
    ['checks', summary.checks],
    ['removals', summary.pendingRemovals],
    ['failedFolders', summary.failedFolders],
];

export const SummaryList = ({ summary }: { summary: SyncSummary }) => {
    const rows = [...(summary.stats ? statRows(summary.stats) : []), ...runRows(summary)];
    return (
        <section aria-labelledby="summary-heading">
            <h2 id="summary-heading">{t('sync.summaryHeading')}</h2>
            {summary.stats ? null : <p>{t('summary.statsUnavailable')}</p>}
            <dl className="summary">
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt>{t(`summary.${label}`)}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            <p className="muted">{t('summary.removalsNote')}</p>
        </section>
    );
};
