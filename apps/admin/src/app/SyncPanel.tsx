/* 已登入：email、「同步媒體資料夾」、「登出」、記錄、總結。冇其他嘢（T-116 暫用頁，唔做設計） */
import { t } from '../i18n/t';
import type { SyncDeps } from '../sync/runSync';
import { SummaryList } from './SummaryList';
import { useSync } from './useSync';

interface SyncPanelProps {
    email: string;
    signOutProblem: string | null;
    onSignOut: () => void;
    deps: SyncDeps;
}

export const SyncPanel = ({ email, signOutProblem, onSignOut, deps }: SyncPanelProps) => {
    const { running, lines, summary, start } = useSync(deps);
    return (
        <>
            <p>{t('session.signedInAs', { email })}</p>
            <p>
                <button type="button" onClick={() => void start()} disabled={running}>
                    {running ? t('sync.running') : t('sync.start')}
                </button>
                <button type="button" onClick={onSignOut} disabled={running}>
                    {t('session.signOut')}
                </button>
            </p>
            {signOutProblem ? (
                <p role="alert">{t('session.signOutFailed', { code: signOutProblem })}</p>
            ) : null}
            <section aria-labelledby="log-heading">
                <h2 id="log-heading">{t('sync.logHeading')}</h2>
                <ol className="log" role="log" aria-live="polite">
                    {lines.map((line, index) => (
                        <li key={index}>{line}</li>
                    ))}
                </ol>
            </section>
            {summary ? <SummaryList summary={summary} /> : null}
        </>
    );
};
