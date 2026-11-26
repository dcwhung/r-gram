/* 登入狀態：開頁讀 /api/me；登出 = POST /auth/logout（Worker 刪 session 同 cookie） */
import { useCallback, useEffect, useState } from 'react';
import type { AdminApi } from '../api/adminApi';
import { problemCode } from '../sync/problem';

export type Session =
    | { kind: 'loading' }
    | { kind: 'signedOut' }
    | { kind: 'signedIn'; email: string; signOutProblem: string | null }
    | { kind: 'error'; code: string };

const readSession = async (api: Pick<AdminApi, 'me'>): Promise<Session> => {
    try {
        const email = await api.me();
        return email ? { kind: 'signedIn', email, signOutProblem: null } : { kind: 'signedOut' };
    } catch (error) {
        return { kind: 'error', code: problemCode(error) };
    }
};

export const useSession = (api: Pick<AdminApi, 'me' | 'logout'>) => {
    const [session, setSession] = useState<Session>({ kind: 'loading' });

    useEffect(() => {
        let live = true;
        readSession(api).then((next) => live && setSession(next));
        return () => {
            live = false;
        };
    }, [api]);

    const signOut = useCallback(async () => {
        try {
            await api.logout();
            setSession({ kind: 'signedOut' });
        } catch (error) {
            const signOutProblem = problemCode(error);
            setSession((current) =>
                current.kind === 'signedIn' ? { ...current, signOutProblem } : current,
            );
        }
    }, [api]);

    return { session, signOut };
};
