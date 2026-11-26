import { memo } from 'react';
import type { TrackRow } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
import type { ArcListLayout } from '../../stage/layouts';
import type { ArcRowPose } from '../../stage/arcRows';
import { px, ratio } from '../svgNumber';
import { type ArcFloat, arcFloatStyle } from './arcFloat';

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
    /** 由歌單欄飄落（設計稿第 19 版 LIST_FLOAT）：起點同遲幾耐；冇 = 唔飄 */
    float?: ArcFloat | undefined;
}

/**
 * 行嘅範圍：上下 = 前後半行（相鄰兩行剛好接住），左邊 = 框嘅圓頭，右邊 = 框嘅右端。
 * 唔係掣（W-051）：㩒落冇反應，只係擋住下面嘅暗層（㩒行唔會收返歌單）；喺度拖照捲
 */
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

/** 行嘅 class：未有音檔變灰；由歌單欄飄落就加過場 */
const rowClass = (playable: boolean, floating: boolean) =>
    ['arc-row', playable ? '' : 'arc-row--off', floating ? 'arc-row-float' : '']
        .filter(Boolean)
        .join(' ');

/**
 * 弧線歌單一行（設計稿第 18 版 listLayer()；role="option"）：歌號（專輯色 slab，track.no，D60）+ 歌名（CJK，白）。
 * 行唔㩒得（W-051，用戶決定）：播歌經唱片夾或者 Enter（listbox 嘅 aria-activedescendant 指住框入面嗰行）。
 * 未有音檔 = 灰色、`aria-disabled`（D11）。memo：props 冇變就唔 render
 */
export const ArcRow = memo(function ArcRow(props: ArcRowProps) {
    const { row, pose, list, accent } = props;
    const numberSize = pose.size * list.number.scale;
    const titleX = pose.x + numberSize * list.number.gapEm + list.number.pad;
    const names = { no: row.no, title: row.title };
    return (
        <g
            id={props.domId}
            role="option"
            data-part="arc-row"
            className={rowClass(row.playable, props.float !== undefined)}
            style={props.float && arcFloatStyle(props.float, pose.opacity)}
            aria-label={t(row.playable ? 'list.track' : 'list.unavailable', names)}
            aria-selected={props.selected}
            aria-disabled={!row.playable || undefined}
            aria-posinset={props.position}
            aria-setsize={props.count}
            opacity={ratio(pose.opacity)}
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
