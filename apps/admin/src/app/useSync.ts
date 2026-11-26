/* 㩒「同步媒體資料夾」：行 runSync，事件逐條變記錄行；同步中掣停用（同一時間只得一次） */
import { useCallback, useRef, useState } from 'react';
import { runSync, type SyncDeps, type SyncSummary } from '../sync/runSync';
import { UNAUTHORIZED } from '../sync/stop';
import { logLines } from './logLine';

/** onExpired：同步因為 session 過期而停（S-231），頁面轉返登入 */
export const useSync = (deps: SyncDeps, onExpired: () => void) => {
    const [running, setRunning] = useState(false);
    const [lines, setLines] = useState<string[]>([]);
    const [summary, setSummary] = useState<SyncSummary | null>(null);
    const busy = useRef(false);

    const start = useCallback(async () => {
        if (busy.current) return;
        busy.current = true;
        setRunning(true);
        setLines([]);
        setSummary(null);
        try {
            const result = await runSync(deps, (event) =>
                setLines((current) => [...current, ...logLines(event)]),
            );
            setSummary(result);
            if (result.stopped === UNAUTHORIZED) onExpired();
        } finally {
            busy.current = false;
            setRunning(false);
        }
    }, [deps, onExpired]);

    return { running, lines, summary, start };
};
