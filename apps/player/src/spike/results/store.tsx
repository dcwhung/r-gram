import { createContext, type ReactNode, useContext, useMemo, useReducer } from 'react';
import { clockTime, type Outcome, type ResultEntry, upsertResult } from './summary';

interface State {
    entries: ResultEntry[];
    logs: Record<string, string[]>;
}

type Action = { type: 'record'; entry: ResultEntry } | { type: 'log'; item: string; line: string };

/** 每項記錄最多留幾多行（複製出嚟唔好太長） */
const MAX_LOG_LINES = 80;

const reducer = (state: State, action: Action): State => {
    if (action.type === 'record') {
        return { ...state, entries: upsertResult(state.entries, action.entry) };
    }
    const lines = [...(state.logs[action.item] ?? []), action.line].slice(-MAX_LOG_LINES);
    return { ...state, logs: { ...state.logs, [action.item]: lines } };
};

export interface SpikeStore extends State {
    record: (id: string, label: string, outcome: Outcome, detail?: string) => void;
    /** 項目記錄：自動加時間 */
    log: (item: string, text: string) => void;
}

const SpikeContext = createContext<SpikeStore | null>(null);

export const SpikeProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, { entries: [], logs: {} });
    const actions = useMemo(
        () => ({
            record: (id: string, label: string, outcome: Outcome, detail = '') =>
                dispatch({ type: 'record', entry: { id, label, outcome, detail, at: Date.now() } }),
            log: (item: string, text: string) =>
                dispatch({ type: 'log', item, line: `${clockTime(Date.now())} ${text}` }),
        }),
        [],
    );
    const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
    return <SpikeContext.Provider value={value}>{children}</SpikeContext.Provider>;
};

export const useSpike = (): SpikeStore => {
    const store = useContext(SpikeContext);
    if (!store) throw new Error('useSpike needs SpikeProvider');
    return store;
};
