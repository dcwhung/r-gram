/*
 * 歌曲文字嘅標籤行（D31、D37）：`標籤` + 全形或者半形冒號 + 值。
 * CR-007（D72）：`副題` 照認做標籤（舊檔唔會因為呢行變歌詞或者出錯），但係值唔用，`formatSongText()` 唔出
 */
import type { CreditField } from '../schema/types';

export type LabelField = 'subtitle' | CreditField;

/** credit 標籤；次序 = `formatSongText()` 回填次序（曲、詞、編、監） */
export const CREDIT_LABELS: readonly { label: string; field: CreditField }[] = [
    { label: '曲', field: 'composer' },
    { label: '詞', field: 'lyricist' },
    { label: '編', field: 'arranger' },
    { label: '監', field: 'producer' },
];

/** 回填用全形冒號 */
export const LABEL_COLON = '：';

/** 標籤同冒號之間可以有空格；「曲目：」「作曲：」唔算（標籤之後一定要係冒號） */
const LABELS: readonly { label: string; field: LabelField }[] = [
    { label: '副題', field: 'subtitle' },
    ...CREDIT_LABELS,
];

const LABEL_LINE = new RegExp(`^(${LABELS.map(({ label }) => label).join('|')})\\s*[：:](.*)$`);

const FIELD_BY_LABEL = new Map(LABELS.map(({ label, field }) => [label, field]));

/** 讀一行（已 trim）；唔係標籤行就 null。值 trim 之後係空 = 冇值（null） */
export const readLabel = (line: string): { field: LabelField; value: string | null } | null => {
    const match = LABEL_LINE.exec(line);
    const field = FIELD_BY_LABEL.get(match?.[1] ?? '');
    if (!field) return null;
    const value = (match?.[2] ?? '').trim();
    return { field, value: value === '' ? null : value };
};
