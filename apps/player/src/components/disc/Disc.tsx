import { useId } from 'react';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { px, ratio } from '../svgNumber';
import './disc.css';
import { DISC_ART, DISC_ART_RADIUS as ART } from './discArt';
import { ringPath } from './ringPath';

interface DiscArtProps {
    hub: StageLayout['hub'];
    /** 封面圖；null = 未有封面，用專輯色 */
    coverUrl: string | null;
    accent: string;
    /** 碟轉緊（播緊） */
    spinning: boolean;
}

interface DiscProps extends DiscArtProps {
    r: number;
}

const Cover = ({ coverUrl, accent, spinning }: Omit<DiscArtProps, 'hub'>) => (
    <g data-part="cover" className="disc-cover" data-spinning={spinning}>
        {coverUrl ? (
            <image
                href={coverUrl}
                x={-ART}
                y={-ART}
                width={ART * 2}
                height={ART * 2}
                preserveAspectRatio="xMidYMid slice"
            />
        ) : (
            <circle data-part="cover-fill" r={ART} fill={accent} />
        )}
    </g>
);

/** 膠圈同碟孔嘅線（設計稿 discArt()：v16 finishDisc） */
const HubRings = ({ hub }: Pick<DiscArtProps, 'hub'>) => {
    const clear = ART * hub.clear;
    const hole = ART * hub.clamp;
    const { clearEdge, clearInner, holeWidth } = DISC_ART;
    const line = { fill: 'none', stroke: '#000' } as const;
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
                data-part="clear-edge"
                r={px(clear - clearEdge.inset)}
                fill="none"
                stroke="#fff"
                strokeOpacity=".75"
                strokeWidth={clearEdge.width}
            />
            <circle
                data-part="clear-inner"
                {...line}
                r={px(ART * (hub.clear - clearInner.inset))}
                strokeOpacity=".3"
                strokeWidth={clearInner.width}
            />
            <circle
                data-part="hole"
                {...line}
                r={px(hole)}
                strokeOpacity=".4"
                strokeWidth={holeWidth}
            />
        </>
    );
};

/** 碟面（設計稿 discArt()），以原點為中心、半徑 ART */
const DiscArt = ({ hub, coverUrl, accent, spinning }: DiscArtProps) => {
    // useId() 可以有冒號等符號；clip-path 嘅 url(#…) 用返淨係英數嘅 id
    const clipId = `disc-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const rim = ART * hub.rim;
    return (
        <>
            <path
                data-part="shadow"
                fillRule="evenodd"
                d={ringPath(ART, ART * hub.clamp)}
                fill="#000"
                opacity=".3"
                filter={ref(DEF.shadowLarge)}
                transform={`translate(0 ${DISC_ART.shadowDrop})`}
            />
            <clipPath id={clipId}>
                <path clipRule="evenodd" d={ringPath(rim, ART * hub.clear)} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
                <Cover coverUrl={coverUrl} accent={accent} spinning={spinning} />
                <circle r={px(rim)} fill={ref(DEF.sheen)} />
            </g>
            <circle
                r={px((ART + rim) / 2)}
                fill="none"
                stroke={ref(DEF.bevel)}
                strokeWidth={px(ART - rim)}
            />
            <circle
                data-part="edge"
                r={ART}
                fill="none"
                stroke="#777"
                strokeOpacity=".6"
                strokeWidth={DISC_ART.edgeWidth}
            />
            <HubRings hub={hub} />
        </>
    );
};

/**
 * 一隻碟，以原點為中心（位置由外層 transform 決定）。碟係空心：封面由銀邊去到透明膠圈，
 * 膠圈入面係穿嘅碟孔，見到下面；唱片夾唔屬於隻碟（Functional Spec CR-002「唱片夾同碟」）。
 * 同設計稿一樣以半徑 ART 畫，再 scale 去 r：線粗、落影下移同模糊都跟住碟嘅大細縮放。
 */
export const Disc = ({ r, ...art }: DiscProps) => (
    <g data-part="disc-art" transform={`scale(${ratio(r / ART)})`}>
        <DiscArt {...art} />
    </g>
);
