/* 結果清單同「複製結果」嘅純文字（用戶貼返畀我哋：每項結果、裝置、模式、時間、記錄） */
import { TEXT } from '../text';

const SUMMARY = TEXT.summary;

export type Outcome = 'pass' | 'fail' | 'value';

export interface ResultEntry {
    /** 例如 `1a`：項目號 + 細項 */
    id: string;
    label: string;
    outcome: Outcome;
    detail: string;
    /** epoch ms */
    at: number;
}

export interface SummaryContext {
    userAgent: string;
    standalone: boolean;
    viewport: string;
    mediaBase: string;
    now: number;
}

/** 每項嘅記錄（按項目號），每行已經有時間 */
export type ItemLogs = Readonly<Record<string, readonly string[]>>;

const OUTCOME_TEXT: Readonly<Record<Exclude<Outcome, 'value'>, string>> = {
    pass: SUMMARY.pass,
    fail: SUMMARY.fail,
};

const MS_DIGITS = 3;
const two = (value: number) => String(value).padStart(2, '0');

export const clockTime = (at: number): string => {
    const time = new Date(at);
    const ms = String(time.getMilliseconds()).padStart(MS_DIGITS, '0');
    return `${two(time.getHours())}:${two(time.getMinutes())}:${two(time.getSeconds())}.${ms}`;
};

export const upsertResult = (list: readonly ResultEntry[], entry: ResultEntry): ResultEntry[] =>
    [...list.filter(({ id }) => id !== entry.id), entry].sort((a, b) => a.id.localeCompare(b.id));

const resultLine = ({ id, label, outcome, detail, at }: ResultEntry): string => {
    const head = outcome === 'value' ? detail : OUTCOME_TEXT[outcome];
    const tail = outcome !== 'value' && detail ? ` — ${detail}` : '';
    return SUMMARY.line(id, label, `${head}${tail}`, clockTime(at));
};

const headLines = ({ userAgent, standalone, viewport, mediaBase, now }: SummaryContext) => [
    SUMMARY.heading,
    SUMMARY.time(new Date(now).toISOString()),
    SUMMARY.mode(standalone),
    SUMMARY.viewport(viewport),
    SUMMARY.browser(userAgent),
    SUMMARY.media(mediaBase),
];

const logLines = (logs: ItemLogs): string[] =>
    Object.entries(logs)
        .filter(([, lines]) => lines.length > 0)
        .flatMap(([item, lines]) => ['', SUMMARY.logHeading(item), ...lines]);

export const summaryText = (
    entries: readonly ResultEntry[],
    logs: ItemLogs,
    context: SummaryContext,
): string => {
    const results = entries.length > 0 ? entries.map(resultLine) : [SUMMARY.empty];
    return [...headLines(context), '', ...results, ...logLines(logs)].join('\n');
};
