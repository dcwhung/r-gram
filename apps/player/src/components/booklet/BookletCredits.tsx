import type { TrackCredits } from '@r-gram/catalog';
import { type CSSProperties, useMemo } from 'react';
import { t } from '../../i18n/t';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { type CreditRow, creditRows } from './creditRows';

/** 名嘅字重（設計稿 booklet()：CJK 冇設字重 = 400） */
const VALUE_WEIGHT = 400;

interface CreditsProps {
    layout: StageLayout;
    credits: TrackCredits | null;
    /** 專輯著燈色（「曲／詞／編／監」） */
    glow: string;
    measure: TextMeasure;
}

/** 一行：「曲」（著燈色）+ 名；讀屏讀「曲：完整嘅名」（畫面上可能截短咗） */
const CreditLine = ({
    row,
    index,
    name,
    layout,
    glow,
}: {
    row: CreditRow;
    index: number;
    name: string;
    layout: StageLayout;
    glow: string;
}) => {
    const column = layout.booklet.credits;
    const label = t(`booklet.${row.field}`);
    return (
        <g
            role="listitem"
            aria-label={t('booklet.credit', { label, name })}
            className="booklet-credit"
            style={{ '--i': index } as CSSProperties}
        >
            <text
                className="booklet-credit-label"
                x={column.x}
                y={row.y}
                fontSize={column.label}
                fill={glow}
                aria-hidden="true"
            >
                {label}
            </text>
            <text
                className="booklet-credit-value"
                x={column.x + column.valueDx}
                y={row.y}
                fontSize={row.size}
                aria-hidden="true"
            >
                {row.text}
            </text>
        </g>
    );
};

/**
 * 曲詞編監（設計稿 booklet()）：左上資訊下面一欄；過場時逐行由左滑入（`--i` = 第幾行）。
 * 淨係字（唔接 pointer：㩒落去 = 㩒暗位）
 */
export const BookletCredits = ({ layout, credits, glow, measure }: CreditsProps) => {
    const rows = useMemo(
        () =>
            creditRows(credits, layout, (text, size) =>
                measure(text, { family: 'cjk', size, weight: VALUE_WEIGHT, spacing: 0 }),
            ),
        [credits, layout, measure],
    );
    if (rows.length === 0) return null;
    return (
        <g
            data-part="booklet-credits"
            role="list"
            aria-label={t('booklet.credits')}
            pointerEvents="none"
        >
            {rows.map((row, index) => (
                <CreditLine
                    key={row.field}
                    row={row}
                    index={index}
                    name={credits?.[row.field] ?? row.text}
                    layout={layout}
                    glow={glow}
                />
            ))}
        </g>
    );
};
