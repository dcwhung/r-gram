import { useMemo } from 'react';
import type { ArcListView } from '../../app/listView';
import { arcRowPitch, arcRowSpec } from '../../stage/arcRows';
import type { StageLayout } from '../../stage/layouts';
import { useStageFitContext } from '../../stage/StageContext';
import type { TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import './arcList.css';
import { ArcEmpty, ArcFrame, ArcVeil } from './ArcParts';
import { ArcColumnGhosts } from './ArcColumnGhosts';
import { ArcListbox } from './ArcListbox';
import { useArcFloat } from './useArcFloat';
import { useArcScroll } from './useArcScroll';
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

/**
 * 弧線歌單（設計稿第 19 版「歌單（㩒碟面）」「歌單（專輯未有歌）」listLayer()；Functional Spec US-004、D23、D25、D39）：
 * 暗層（中間留唱片夾個窿）→ 白色框線 → 沿碟弧線排嘅歌名（由歌單欄開就由歌單欄飄落，useArcFloat）；
 * 第 20 版頭尾相接：最後一首之後一格接駁位，再落就係第一首（ArcListbox、arcRing）。框入面係揀中嗰首，㩒唱片夾（play）播佢；
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
                    <ArcListbox {...props} {...scroll} plan={plan} />
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
