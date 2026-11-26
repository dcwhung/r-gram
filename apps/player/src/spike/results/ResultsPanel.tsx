import { useRef, useState } from 'react';
import { isStandalone, viewportText } from '../env';
import { TEXT } from '../text';
import { useSpike } from './store';
import { summaryText } from './summary';

/** `navigator.clipboard` 唔得（舊 Safari、非 https）就揀晒文字框再 execCommand */
const copyText = async (text: string, box: HTMLTextAreaElement | null): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        if (!box) return false;
        box.select();
        return document.execCommand('copy');
    }
};

/** 全部結果嘅純文字 + 「複製結果」 */
export const ResultsPanel = ({ mediaBase }: { mediaBase: string }) => {
    const { entries, logs } = useSpike();
    const box = useRef<HTMLTextAreaElement>(null);
    const [copyState, setCopyState] = useState('');
    const [openedAt] = useState(() => Date.now());
    // 「時間」= 最後一個結果嘅時間（render 入面唔可以讀時鐘）
    const now = Math.max(openedAt, ...entries.map(({ at }) => at));
    const text = summaryText(entries, logs, {
        userAgent: navigator.userAgent,
        standalone: isStandalone(),
        viewport: viewportText(),
        mediaBase,
        now,
    });
    const copy = () => {
        void copyText(text, box.current).then((ok) =>
            setCopyState(ok ? TEXT.results.copied : TEXT.results.copyFailed),
        );
    };
    return (
        <section className="spike-item" aria-labelledby="spike-results">
            <h2 id="spike-results">{TEXT.results.title}</h2>
            <button type="button" className="spike-button spike-button--main" onClick={copy}>
                {TEXT.results.copy}
            </button>
            {copyState ? <p role="status">{copyState}</p> : null}
            <textarea
                ref={box}
                className="spike-summary"
                readOnly
                value={text}
                aria-label={TEXT.results.title}
                data-testid="summary"
            />
        </section>
    );
};
