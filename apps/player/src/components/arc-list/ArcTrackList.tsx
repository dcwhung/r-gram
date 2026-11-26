import { useMemo } from 'react';
import type { ArcListView } from '../../app/listView';
import { t } from '../../i18n/t';
import { arcRowPitch, arcRows, arcRowSpec } from '../../stage/arcRows';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import type { TextMeasure } from '../../utils/textMeasure';
import { useSvgId } from '../svgId';
import { px } from '../svgNumber';
import './arcList.css';
import { ArcEmpty, ArcFrame, ArcVeil, frameEnds } from './ArcParts';
import { ArcColumnGhosts } from './ArcColumnGhosts';
import { ArcRow } from './ArcRow';
import { type ArcFloatPlan, useArcFloat } from './useArcFloat';
import { type ArcScroll, useArcScroll } from './useArcScroll';
import { useArcTitles } from './useArcTitles';
import { useListFocus } from './useListFocus';
import { useStable } from './useStable';

interface ArcTrackListProps {
    layout: StageLayout;
    list: ArcListView;
    /** 碟名（listbox 嘅無障礙名） */
    albumTitle: string;
    measure: TextMeasure;
    /** 㩒暗位、Esc：收返 */
    onClose: () => void;
    /** 捲到停低：框入面換咗另一首 */
    onFocusTrack: (trackId: string) => void;
    /** Enter／空白鍵：播框入面嗰首（行唔㩒得，W-051） */
    onPlay: (trackId: string) => void;
    /** 由歌單欄開、飄緊落弧線（app/useListFloating；減少動態效果時 false） */
    floating: boolean;
}

const PLAYABLE = '1';
const SILENT = '0';

type ListboxProps = Pick<ArcTrackListProps, 'layout' | 'list' | 'albumTitle' | 'measure'> &
    Pick<ArcScroll, 'offset' | 'active' | 'onKeyDown'> & { plan: ArcFloatPlan | null };

/** 見到嘅行（|k| ≤ visible）；捲動位置冇變就用返同一組位置（行唔使 re-render） */
const Listbox = (props: ListboxProps) => {
    const { layout, list, albumTitle, measure, offset, active } = props;
    const id = useSvgId('arc-list');
    const shown = useArcTitles(list.rows, layout, measure);
    const spec = useMemo(() => arcRowSpec(layout), [layout]);
    const { rows } = list;
    // 每次揀中另一首，畫面會重新砌一份行（新 array）：用「邊行播得」串做 key，位置冇變就唔重新計
    const offKey = rows.map((row) => (row.playable ? PLAYABLE : SILENT)).join('');
    const poses = useMemo(
        () => arcRows(offKey.length, offset, spec, (index) => offKey[index] === SILENT),
        [offKey, offset, spec],
    );
    const hitRight = frameEnds(layout).right;
    return (
        <g
            role="listbox"
            className="arc-listbox"
            aria-label={t('list.label', { album: albumTitle })}
            aria-activedescendant={`${id}-${active}`}
            tabIndex={0}
            onKeyDown={props.onKeyDown}
        >
            {poses.map((pose) => {
                const row = rows[pose.index];
                if (!row) return null;
                return (
                    <ArcRow
                        key={row.id}
                        domId={`${id}-${pose.index}`}
                        row={row}
                        pose={pose}
                        position={pose.index + 1}
                        count={rows.length}
                        shown={shown[pose.index] ?? row.title}
                        accent={list.accent}
                        selected={pose.index === active}
                        list={layout.list}
                        hitRight={hitRight}
                        float={props.plan?.floats.get(pose.index)}
                    />
                );
            })}
        </g>
    );
};

/**
 * 弧線歌單（設計稿第 19 版「歌單（㩒碟面）」「歌單（專輯未有歌）」listLayer()；Functional Spec US-004、D23、D25、D39）：
 * 暗層（中間留唱片夾個窿）→ 白色框線 → 沿碟弧線排嘅歌名（由歌單欄開就由歌單欄飄落，useArcFloat）。框入面係揀中嗰首，㩒唱片夾（play）播佢；
 * 行唔㩒得（W-051）：㩒行冇反應；㩒行以外嘅暗位或者 Esc 收返。拖動、滾輪、鍵盤沿弧線捲（useArcScroll）。
 * 喺貼頂組（螺絲上面、左上資訊下面），內容用碟嘅座標（貼底，加返多出嚟嘅高度）。
 */
export const ArcTrackList = (props: ArcTrackListProps) => {
    const { layout, list } = props;
    const { unit, extraUnits, heightUnits } = useStageFitContext();
    const onFocus = useStable(props.onFocusTrack);
    const onPlay = useStable(props.onPlay);
    const spec = useMemo(() => arcRowSpec(layout), [layout]);
    const { rootRef, dragHandlers, offset, active, onKeyDown } = useArcScroll({
        rows: list.rows,
        initial: list.focusIndex,
        pitch: arcRowPitch(spec),
        perPage: Math.floor(layout.list.visible),
        unit,
        thresholdPx: layout.list.dragThresholdPx,
        onFocus,
        onPlay,
    });
    useListFocus(rootRef, props.onClose);
    const plan = useArcFloat(list, layout, props.floating);
    const scroll = { offset, active, onKeyDown };
    return (
        <g ref={rootRef} data-part="arc-list" className="arc-list" {...dragHandlers}>
            <g transform={`translate(0 ${px(extraUnits)})`}>
                <ArcVeil
                    layout={layout}
                    top={-extraUnits}
                    height={heightUnits}
                    onClose={props.onClose}
                    entering={props.floating}
                />
                <ArcFrame layout={layout} entering={props.floating} />
                {list.rows.length === 0 ? (
                    <ArcEmpty layout={layout} text={list.emptyText} />
                ) : (
                    <Listbox {...props} {...scroll} plan={plan} />
                )}
            </g>
            {plan && (
                <ArcColumnGhosts
                    layout={layout}
                    rows={list.rows}
                    indexes={plan.ghostRows}
                    accent={list.accent}
                    measure={props.measure}
                />
            )}
        </g>
    );
};
