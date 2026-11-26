/*
 * 管理端（T-116）：未設計嘅暫用同步頁。未登入 → 「以 Google 登入」（Worker 嘅 /auth/google/start，登入完返 `/`）；
 * 已登入 → SyncPanel。設計好嘅管理端（T-051、T-052、T-055）會取代呢頁，重用 api/、sync/、covers/
 */
import type { AdminApi } from '../api/adminApi';
import { t } from '../i18n/t';
import type { SyncDeps } from '../sync/runSync';
import { SyncPanel } from './SyncPanel';
import { useSession } from './useSession';

/** 登入完返呢頁（Worker 嘅 safeNext 只收同站相對 path） */
export const SIGN_IN_HREF = `/auth/google/start?next=${encodeURIComponent('/')}`;

interface AppProps {
    api: Pick<AdminApi, 'me' | 'logout'>;
    syncDeps: SyncDeps;
}

const Body = ({ api, syncDeps }: AppProps) => {
    const { session, signOut } = useSession(api);
    if (session.kind === 'loading') return <p>{t('app.loading')}</p>;
    if (session.kind === 'error')
        return <p role="alert">{t('app.loadFailed', { code: session.code })}</p>;
    if (session.kind === 'signedOut')
        return (
            <p>
                <a href={SIGN_IN_HREF}>{t('login.signIn')}</a>
            </p>
        );
    return (
        <SyncPanel
            email={session.email}
            signOutProblem={session.signOutProblem}
            onSignOut={() => void signOut()}
            deps={syncDeps}
        />
    );
};

export const App = (props: AppProps) => (
    <main>
        <h1>{t('app.heading')}</h1>
        <Body {...props} />
    </main>
);
