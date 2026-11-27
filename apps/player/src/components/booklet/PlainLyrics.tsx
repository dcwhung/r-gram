import type { PlainLyricLine } from '@r-gram/catalog';
import { useMemo } from 'react';
import { t } from '../../i18n/t';
import { type PlainColumn, plainColumn, plainRows } from '../../lyrics/plainColumn';
import type { WrappedRow } from '../../lyrics/wrapLine';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import type { TextMeasure } from '../../utils/textMeasure';
import { ColumnEdges, clipRef, fadeRef } from '../held-tracks/ColumnEdges';
import { useColumnScroll } from '../held-tracks/useColumnScroll';
import { useSvgId } from '../svgId';
import { px } from '../svgNumber';

/** 設計稿 plainLyrics()：全部列 500、白色 0.9（CSS） */
const TEXT_WEIGHT = 500;
/** 一列嘅垂直中線喺行距一半 */
const HALF_ROW = 0.5;

interface PlainLyricsProps {
    layout: StageLayout;
    lines: readonly PlainLyricLine[];
    measure: TextMeasure;
}

/** 排好嘅列同欄嘅捲動（同歌單欄共用 useColumnScroll：拖動、滾輪、方向鍵） */
const usePlainLyrics = ({ layout, lines, measure }: PlainLyricsProps) => {
    const { extraUnits, unit } = useStageFitContext();
    const column = plainColumn(layout, extraUnits);
    const rows = useMemo(
        () =>
            plainRows(lines, layout, (text, size) =>
                measure(text, { family: 'mixed', size, weight: TEXT_WEIGHT, spacing: 0 }),
            ),
        [lines, layout, measure],
    );
    const room = column.bottom - column.top;
    const scroll = useColumnScroll({
        count: rows.length,
        pitch: column.pitch,
        room,
        minThumb: 0,
        unit,
        thresholdPx: layout.list.dragThresholdPx,
    });
    return { column, rows, room, ...scroll };
};

/** 全部列（空白列 = 分段，唔畫字） */
const PlainRows = ({ column, rows }: { column: PlainColumn; rows: readonly WrappedRow[] }) =>
    rows.map((row, index) =>
        row.text ? (
            <text
                key={index}
                className="booklet-plain-text"
                x={column.x + row.indent}
                y={px(column.top + column.pitch * (index + HALF_ROW))}
                dominantBaseline="central"
                fontSize={column.size}
            >
                {row.text}
            </text>
        ) : null,
    );

/**
 * 冇時間標記嘅歌詞（設計稿第 17 版「歌書（歌詞冇時間標記）」plainLyrics()；Functional Spec D38）：
 * 成份歌詞一次過排好嘅直身一欄，冇框線、冇 highlight；唔跟歌行，播放／暫停唔影響位置。
 * 放唔晒：成欄上下捲（拖動、滾輪；focus 喺欄時方向鍵、Page Up／Down、Home／End），唔吸附；
 * 頂（捲咗先有）同底（下面仲有先有）淡出。換歌 = 新嘅欄（外面以歌做 key），由頂開始。
 * 全部列都喺 DOM（clipPath 剪走欄外；捲動只改一個 translateY）：讀屏讀得到成份歌詞。
 * 喺欄入面㩒（唔係拖）唔收返歌書：嗰度係歌詞，唔係暗位
 */
export const PlainLyrics = (props: PlainLyricsProps) => {
    const { column, rows, room, metrics, listRef, handlers } = usePlainLyrics(props);
    const id = useSvgId('plain-lyrics');
    const edges = { top: column.top, room, fade: props.layout.booklet.lyrics.plain.fade };
    return (
        <g
            ref={listRef}
            data-part="lyrics-plain"
            className="booklet-plain"
            role="document"
            aria-label={t('booklet.lyrics')}
            tabIndex={0}
            {...handlers}
        >
            <ColumnEdges id={id} {...edges} metrics={metrics} />
            <g className="booklet-plain-fade">
                <rect
                    className="booklet-plain-hit"
                    x={column.x}
                    y={column.top}
                    width={column.right - column.x}
                    height={px(room)}
                />
                <g clipPath={clipRef(id)} mask={fadeRef(id)} pointerEvents="none">
                    <g transform={`translate(0 ${px(-metrics.scroll)})`}>
                        <PlainRows column={column} rows={rows} />
                    </g>
                </g>
            </g>
        </g>
    );
};
