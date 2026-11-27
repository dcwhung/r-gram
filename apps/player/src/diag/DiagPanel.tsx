import { useEffect, useState } from 'react';
import { t } from '../i18n/t';
import { formatFlicker, formatLoadLine, formatSnapshot } from './format';
import { formatEntry } from './log';
import type { DiagRecorder } from './recorder';
import './diag.css';

/** 而家嘅數幾耐刷新一次（事件、fit key 變就即刻刷新） */
export const LIVE_REFRESH_MS = 250;
/** 面板淨係顯示最新幾行記錄（全部 40 行喺「複製」） */
export const PANEL_LOG_LINES = 8;

type CopyStatus = 'idle' | 'copied' | 'manual';

/** 跟住 recorder 同定時刷新 */
const useLiveRefresh = (recorder: DiagRecorder) => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const bump = () => setTick((tick) => tick + 1);
        const unsubscribe = recorder.subscribe(bump);
        const timer = window.setInterval(bump, LIVE_REFRESH_MS);
        return () => {
            unsubscribe();
            window.clearInterval(timer);
        };
    }, [recorder]);
};

/** 複製全文；冇 clipboard（或者唔准）就出一個揀晒字嘅文字框畀人手複製 */
const useCopy = (recorder: DiagRecorder) => {
    const [status, setStatus] = useState<CopyStatus>('idle');
    const [manualText, setManualText] = useState<string | null>(null);
    const copy = async () => {
        const text = recorder.report();
        try {
            await navigator.clipboard.writeText(text);
            setManualText(null);
            setStatus('copied');
        } catch {
            setManualText(text);
            setStatus('manual');
        }
    };
    return { status, manualText, copy };
};

const panelText = (recorder: DiagRecorder) =>
    [
        ...formatSnapshot(recorder.snapshot()),
        formatFlicker(recorder.flicker()),
        ...recorder.load.map(formatLoadLine),
        `[log ${recorder.log.length}]`,
        ...recorder.log.slice(0, PANEL_LOG_LINES).map(formatEntry),
    ].join('\n');

const STATUS_TEXT = { copied: 'diag.copied', manual: 'diag.manual' } as const;

interface DiagPanelProps {
    recorder: DiagRecorder;
    onClose: () => void;
}

/** 臨時診斷面板（src/diag/install.ts 開）：而家嘅數、閃嘅次數、開 app 三個時間點、最新記錄 */
export const DiagPanel = ({ recorder, onClose }: DiagPanelProps) => {
    useLiveRefresh(recorder);
    const { status, manualText, copy } = useCopy(recorder);
    return (
        <section className="diag-panel" aria-label={t('diag.panel')}>
            <pre className="diag-text" data-testid="diag-text">
                {panelText(recorder)}
            </pre>
            <div className="diag-actions">
                <button type="button" onClick={() => void copy()}>
                    {t('diag.copy')}
                </button>
                <button type="button" onClick={recorder.clear}>
                    {t('diag.clear')}
                </button>
                <button type="button" onClick={onClose}>
                    {t('diag.close')}
                </button>
                <span role="status">{status === 'idle' ? '' : t(STATUS_TEXT[status])}</span>
            </div>
            {manualText === null ? null : (
                <textarea
                    className="diag-manual"
                    readOnly
                    value={manualText}
                    aria-label={t('diag.copy')}
                    ref={(element) => element?.select()}
                />
            )}
        </section>
    );
};
