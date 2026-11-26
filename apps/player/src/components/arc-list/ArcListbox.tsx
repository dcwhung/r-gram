import { type KeyboardEvent, useMemo } from 'react';
import type { ArcListView } from '../../app/listView';
import { t } from '../../i18n/t';
import { type ArcListRowPose, arcRing, arcRowSpec } from '../../stage/arcRows';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { useSvgId } from '../svgId';
import { frameEnds } from './ArcParts';
import { ArcRow } from './ArcRow';
import { ArcSeam } from './ArcSeam';
import type { ArcFloatPlan } from './useArcFloat';
import { useArcTitles } from './useArcTitles';

const PLAYABLE = '1';
const SILENT = '0';

interface ArcListboxProps {
    layout: StageLayout;
    list: ArcListView;
    /** 碟名（listbox 嘅無障礙名） */
    albumTitle: string;
    measure: TextMeasure;
    /** 捲動位置（圈上，行；拖動中途有小數） */
    offset: number;
    /** 框入面嗰首 */
    active: number;
    onKeyDown: (event: KeyboardEvent) => void;
    /** 由歌單欄開嘅過場；冇 = null */
    plan: ArcFloatPlan | null;
}

/** 捲動位置冇變就用返同一組位置（行唔使 re-render）：每次揀中另一首會重新砌一份行，用「邊行播得」串做 key */
const usePoses = ({
    layout,
    list,
    offset,
}: Pick<ArcListboxProps, 'layout' | 'list' | 'offset'>) => {
    const spec = useMemo(() => arcRowSpec(layout), [layout]);
    const offKey = list.rows.map((row) => (row.playable ? PLAYABLE : SILENT)).join('');
    return useMemo(
        () => arcRing(offKey.length, offset, spec, (index) => offKey[index] === SILENT),
        [offKey, offset, spec],
    );
};

type RowsProps = ArcListboxProps & { id: string; poses: readonly ArcListRowPose[] };

/** 見到嘅歌（每首最多一次，以歌 id 做 key） */
const Rows = ({ id, poses, layout, list, measure, active, plan }: RowsProps) => {
    const shown = useArcTitles(list.rows, layout, measure);
    const hitRight = frameEnds(layout).right;
    return poses.map((pose) => {
        const row = list.rows[pose.index];
        if (!row) return null;
        return (
            <ArcRow
                key={row.id}
                domId={`${id}-${pose.index}`}
                row={row}
                pose={pose}
                position={pose.index + 1}
                count={list.rows.length}
                shown={shown[pose.index] ?? row.title}
                accent={list.accent}
                selected={pose.index === active}
                list={layout.list}
                hitRight={hitRight}
                float={plan?.floats.get(pose.index)}
                appear={plan?.appear.has(pose.index) ?? false}
            />
        );
    });
};

/**
 * 弧線上嘅歌（role="listbox"，|k| ≤ visible）同接駁位（設計稿第 20 版頭尾相接：最後一首同第一首之間）。
 * 接駁位唔係選項：喺 listbox 外面、讀屏唔讀
 */
export const ArcListbox = (props: ArcListboxProps) => {
    const { layout, list, albumTitle, active, plan } = props;
    const id = useSvgId('arc-list');
    const { rows: poses, seam } = usePoses(props);
    return (
        <>
            {seam && (
                <ArcSeam
                    pose={seam}
                    accent={list.accent}
                    list={layout.list}
                    hitRight={frameEnds(layout).right}
                    appear={plan?.seam ?? false}
                />
            )}
            <g
                role="listbox"
                className="arc-listbox"
                aria-label={t('list.label', { album: albumTitle })}
                aria-activedescendant={`${id}-${active}`}
                tabIndex={0}
                onKeyDown={props.onKeyDown}
            >
                <Rows {...props} id={id} poses={poses} />
            </g>
        </>
    );
};
