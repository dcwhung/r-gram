import type { ReactNode } from 'react';
import { useSpike } from '../results/store';
import { clockTime } from '../results/summary';
import { TEXT } from '../text';

const OUTCOME_MARK = { pass: '✓', fail: '✗', value: '•' } as const;

/** 呢項（`item` = 項目號）嘅結果同記錄 */
const ItemResults = ({ item }: { item: string }) => {
    const { entries, logs } = useSpike();
    const mine = entries.filter(({ id }) => id.startsWith(item));
    const lines = logs[item] ?? [];
    return (
        <div className="spike-results" aria-live="polite">
            {mine.map(({ id, label, outcome, detail, at }) => (
                <p key={id} className={`spike-result spike-result--${outcome}`} data-result={id}>
                    {OUTCOME_MARK[outcome]} [{id}] {label}
                    {detail ? TEXT.labelled('', detail) : ''} <small>{clockTime(at)}</small>
                </p>
            ))}
            {lines.length > 0 ? <pre className="spike-log">{lines.join('\n')}</pre> : null}
        </div>
    );
};

interface SectionProps {
    item: string;
    title: string;
    how: string;
    children: ReactNode;
}

export const Section = ({ item, title, how, children }: SectionProps) => (
    <section className="spike-item" aria-labelledby={`spike-item-${item}`} data-item={item}>
        <h2 id={`spike-item-${item}`}>
            {item}. {title}
        </h2>
        <p className="spike-how">{how}</p>
        {children}
        <ItemResults item={item} />
    </section>
);

interface OwnerCheckProps {
    id: string;
    label: string;
    yes?: string;
    no?: string;
}

/** 用戶自己判斷嘅一項：兩粒掣寫入結果 */
export const OwnerCheck = ({ id, label, yes = TEXT.yes, no = TEXT.no }: OwnerCheckProps) => {
    const { record, entries } = useSpike();
    const chosen = entries.find((entry) => entry.id === id)?.outcome;
    return (
        <div className="spike-check" role="group" aria-label={label}>
            <span>
                [{id}] {label}
            </span>
            <button
                type="button"
                className="spike-button spike-button--yes"
                aria-pressed={chosen === 'pass'}
                onClick={() => record(id, label, 'pass')}
            >
                {yes}
            </button>
            <button
                type="button"
                className="spike-button spike-button--no"
                aria-pressed={chosen === 'fail'}
                onClick={() => record(id, label, 'fail')}
            >
                {no}
            </button>
        </div>
    );
};
