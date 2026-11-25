import { useId } from 'react';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';
import './disc.css';
import { ringPath } from './ringPath';

const SHADOW_DROP = 8;
/** 透明膠圈內側嗰條暗線（以碟半徑做 1） */
const CLEAR_INNER_LINE = 0.014;

interface DiscProps {
    r: number;
    hub: StageLayout['hub'];
    /** 封面圖；null = 未有封面，用專輯色 */
    coverUrl: string | null;
    accent: string;
    /** 碟轉緊（播緊） */
    spinning: boolean;
}

const Cover = ({ r, coverUrl, accent, spinning }: Omit<DiscProps, 'hub'>) => (
    <g data-part="cover" className="disc-cover" data-spinning={spinning}>
        {coverUrl ? (
            <image
                href={coverUrl}
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                preserveAspectRatio="xMidYMid slice"
            />
        ) : (
            <circle data-part="cover-fill" r={r} fill={accent} />
        )}
    </g>
);

/** 膠圈同碟孔嘅線（設計稿 discArt()：v16 finishDisc） */
const HubRings = ({ r, hub }: Pick<DiscProps, 'r' | 'hub'>) => {
    const clear = r * hub.clear;
    const hole = r * hub.clamp;
    return (
        <>
            <circle
                r={px((clear + hole) / 2)}
                fill="none"
                stroke="rgb(150,154,162)"
                strokeOpacity=".32"
                strokeWidth={px(clear - hole)}
            />
            <circle
                r={px(clear - 1.5)}
                fill="none"
                stroke="#fff"
                strokeOpacity=".75"
                strokeWidth="2.5"
            />
            <circle
                r={px(r * (hub.clear - CLEAR_INNER_LINE))}
                fill="none"
                stroke="#000"
                strokeOpacity=".3"
                strokeWidth="2.5"
            />
            <circle r={px(hole)} fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="1.5" />
        </>
    );
};

/**
 * 一隻碟，以原點為中心（位置由外層 transform 決定）。碟係空心：封面由銀邊去到透明膠圈，
 * 膠圈入面係穿嘅碟孔，見到下面；唱片夾唔屬於隻碟（Functional Spec CR-002「唱片夾同碟」）。
 */
export const Disc = ({ r, hub, coverUrl, accent, spinning }: DiscProps) => {
    // useId() 可以有冒號等符號；clip-path 嘅 url(#…) 用返淨係英數嘅 id
    const clipId = `disc-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const rim = r * hub.rim;
    return (
        <>
            <path
                fillRule="evenodd"
                d={ringPath(r, r * hub.clamp)}
                fill="#000"
                opacity=".3"
                filter={ref(DEF.shadowLarge)}
                transform={`translate(0 ${SHADOW_DROP})`}
            />
            <clipPath id={clipId}>
                <path clipRule="evenodd" d={ringPath(rim, r * hub.clear)} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
                <Cover r={r} coverUrl={coverUrl} accent={accent} spinning={spinning} />
                <circle r={px(rim)} fill={ref(DEF.sheen)} />
            </g>
            <circle
                r={px((r + rim) / 2)}
                fill="none"
                stroke={ref(DEF.bevel)}
                strokeWidth={px(r - rim)}
            />
            <circle r={r} fill="none" stroke="#777" strokeOpacity=".6" strokeWidth="1.2" />
            <HubRings r={r} hub={hub} />
        </>
    );
};
