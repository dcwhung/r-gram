import type { HeldTrackRow as Row } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
import { heldRowHitRight } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { truncateLine } from '../../utils/truncateLine';
import { pressable } from '../pressable';
import { px } from '../svgNumber';

/** 設計稿 trackPanel()：歌名 MIXED、font-weight 500 */
const TITLE_WEIGHT = 500;

interface HeldTrackRowProps {
    layout: StageLayout;
    row: Row;
    /** 第幾行（由 0 起）：鍵盤移 focus 用（rowFocus.ts） */
    index: number;
    /** 呢行中線嘅 y（已經減咗捲動） */
    y: number;
    accent: string;
    measure: TextMeasure;
    /** 鬆手之後先㩒得（旋鈕開住 = 停用、唔入 Tab 次序） */
    canPress: boolean;
    onPlay: (trackId: string) => void;
    /** 攞到 focus（鍵盤）：叫欄捲到見到呢行 */
    onFocus: () => void;
}

type BodyProps = Pick<HeldTrackRowProps, 'layout' | 'row' | 'y' | 'accent' | 'measure'>;

/** 透明感應範圍（由畫面左邊到 right + rowReach，成行都㩒得，D57）、歌號（專輯色）、歌名（放唔落用「…」） */
const RowBody = ({ layout, row, y, accent, measure }: BodyProps) => {
    const column = layout.heldTracks;
    const textX = column.x + column.number.width;
    const shown = truncateLine(row.title, column.right - textX, (text) =>
        measure(text, { family: 'mixed', size: column.size, weight: TITLE_WEIGHT, spacing: 0 }),
    );
    return (
        <>
            <rect
                data-part="held-hit"
                x={0}
                y={px(y - column.pitch / 2)}
                width={heldRowHitRight(layout)}
                height={column.pitch}
                fill="transparent"
            />
            <text
                data-part="held-number"
                className="held-number"
                dominantBaseline="central"
                x={column.x}
                y={px(y)}
                fontSize={px(column.size * column.number.scale)}
                fill={row.playable ? accent : undefined}
            >
                {row.number}
            </text>
            <text
                data-part="held-title"
                className="held-title"
                dominantBaseline="central"
                x={textX}
                y={px(y)}
                fontSize={column.size}
            >
                {shown}
            </text>
        </>
    );
};

/**
 * 歌單欄一行（設計稿第 18 版 trackPanel()；Functional Spec FR-044、D11、D57）。播得 = 一粒掣（名 = 歌號同歌名）；
 * 未有音檔 = 灰色、唔係掣，讀屏讀「未有音檔」。
 */
export const HeldTrackRow = ({ index, canPress, onPlay, onFocus, ...body }: HeldTrackRowProps) => {
    const { row } = body;
    const names = { no: row.no, title: row.title };
    if (!row.playable) {
        return (
            <g
                role="listitem"
                className="held-row held-row--off"
                data-playable="false"
                aria-label={t('heldTracks.unavailable', names)}
            >
                <g aria-hidden="true">
                    <RowBody {...body} />
                </g>
            </g>
        );
    }
    return (
        <g role="listitem" className="held-row" data-playable="true">
            <g
                className="held-button"
                data-part="held-button"
                data-index={index}
                aria-label={t('heldTracks.play', names)}
                aria-disabled={!canPress || undefined}
                onFocus={onFocus}
                {...pressable(() => onPlay(row.id), !canPress, canPress)}
            >
                <RowBody {...body} />
            </g>
        </g>
    );
};
