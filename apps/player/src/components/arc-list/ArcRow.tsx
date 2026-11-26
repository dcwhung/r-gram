import { memo } from 'react';
import type { TrackRow } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
import type { ArcListLayout } from '../../stage/layouts';
import type { ArcRowPose } from '../../stage/arcRows';
import { px, ratio } from '../svgNumber';

/** 離框半行之內 = 揀中嗰行嘅字重（設計稿 listLayer()：揀中 700、其他 500） */
const BOLD_FROM = 0.5;

interface ArcRowProps {
    /** DOM id（listbox 嘅 aria-activedescendant 指住佢） */
    domId: string;
    row: TrackRow;
    pose: ArcRowPose;
    /** 第幾行（由 1 起）同總數：讀屏讀「第幾項，共幾項」 */
    position: number;
    count: number;
    /** 顯示嘅歌名（已經截短，useArcTitles） */
    shown: string;
    accent: string;
    selected: boolean;
    list: ArcListLayout;
    /** 感應範圍右邊（碟芯膠圈邊，框嘅右端） */
    hitRight: number;
    onPlay: (trackId: string) => void;
}

/** 感應範圍：上下 = 前後半行（相鄰兩行剛好接住），左邊 = 框嘅圓頭，右邊 = 框嘅右端 */
const HitBand = ({ pose, list, hitRight }: Pick<ArcRowProps, 'pose' | 'list' | 'hitRight'>) => {
    const left = pose.x - list.frame.gap - list.frame.height / 2;
    return (
        <rect
            data-part="arc-hit"
            x={px(left)}
            y={px(pose.top)}
            width={px(hitRight - left)}
            height={px(pose.bottom - pose.top)}
            fill="transparent"
        />
    );
};

/**
 * 弧線歌單一行（設計稿第 18 版 listLayer()；role="option"）：歌號（專輯色 slab，track.no，D60）+ 歌名（CJK，白）。
 * 播得 = 㩒一下播；未有音檔 = 灰色、`aria-disabled`、㩒唔到（D11）。memo：props 冇變就唔 render
 */
export const ArcRow = memo(function ArcRow(props: ArcRowProps) {
    const { row, pose, list, accent, onPlay } = props;
    const numberSize = pose.size * list.number.scale;
    const titleX = pose.x + numberSize * list.number.gapEm + list.number.pad;
    const names = { no: row.no, title: row.title };
    return (
        <g
            id={props.domId}
            role="option"
            data-part="arc-row"
            className={row.playable ? 'arc-row' : 'arc-row arc-row--off'}
            aria-label={t(row.playable ? 'list.track' : 'list.unavailable', names)}
            aria-selected={props.selected}
            aria-disabled={!row.playable || undefined}
            aria-posinset={props.position}
            aria-setsize={props.count}
            opacity={ratio(pose.opacity)}
            onClick={row.playable ? () => onPlay(row.id) : undefined}
        >
            <HitBand pose={pose} list={list} hitRight={props.hitRight} />
            <g aria-hidden="true">
                <text
                    data-part="arc-number"
                    className="arc-number"
                    dominantBaseline="central"
                    x={px(pose.x)}
                    y={px(pose.y)}
                    fontSize={px(numberSize)}
                    fill={row.playable ? accent : undefined}
                >
                    {row.number}
                </text>
                <text
                    data-part="arc-title"
                    className={pose.near >= BOLD_FROM ? 'arc-title arc-title--focus' : 'arc-title'}
                    dominantBaseline="central"
                    x={px(titleX)}
                    y={px(pose.y)}
                    fontSize={px(pose.size)}
                >
                    {props.shown}
                </text>
            </g>
        </g>
    );
});
