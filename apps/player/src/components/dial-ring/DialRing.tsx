import type { CSSProperties } from 'react';
import { polar, scaleAngle } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { isLatin } from '../../utils/isLatin';
import { ringPath } from '../disc/ringPath';
import { px, ratio } from '../svgNumber';
import { dialShowsLetter } from './dialLetters';
import { DIAL_SHAPE } from './dialShape';
import { dialKeyDelayMs } from './dialTiming';
import './dialRing.css';

interface DialRingProps {
    layout: StageLayout;
    /** 每格嘅標記（最尾係 ♥，唔畫：♥ 掣自己會滑出嚟） */
    keys: readonly string[];
    current: number;
    open: boolean;
    accent: string;
}

const ORIGIN = { x: 0, y: 0 };

interface PlateProps {
    layout: StageLayout;
    current: number;
    positions: number;
    open: boolean;
    accent: string;
}
const { mark, rim } = DIAL_SHAPE;

/** 揀中嗰格嘅專輯色弧（♥ 嗰格冇） */
const Mark = ({ layout, deg, accent }: { layout: StageLayout; deg: number; accent: string }) => {
    const radius = layout.dial.outer - mark.inset;
    const from = polar(ORIGIN, radius, deg - mark.halfDeg);
    const to = polar(ORIGIN, radius, deg + mark.halfDeg);
    const d = `M${px(from.x)} ${px(from.y)}A${radius} ${radius} 0 0 1 ${px(to.x)} ${px(to.y)}`;
    return (
        <path
            data-part="dial-mark"
            d={d}
            fill="none"
            stroke={accent}
            strokeWidth={mark.width}
            strokeLinecap="round"
        />
    );
};

/** 一格嘅位置同過場：打開時由旋鈕邊彈出去字母圈，順時針逐個遲少少；收返倒轉 */
const keyStyle = (
    layout: StageLayout,
    pos: number,
    positions: number,
    open: boolean,
): CSSProperties => {
    const { dial } = layout;
    const k = open ? 1 : dial.keyFrom;
    const at = polar(ORIGIN, dial.letters * k, scaleAngle(layout, pos, positions));
    return {
        transform: `translate(${px(at.x)}px, ${px(at.y)}px) scale(${ratio(k)})`,
        opacity: open ? 1 : 0,
        transitionDelay: `${Math.round(dialKeyDelayMs(pos, positions, open))}ms`,
    };
};

const Letter = ({ text, on, layout }: { text: string; on: boolean; layout: StageLayout }) => {
    const latin = isLatin(text);
    const size = (on ? layout.dial.current : layout.dial.other) * (latin ? 1 : DIAL_SHAPE.cjkScale);
    const face = latin ? 'latin' : 'cjk';
    return (
        <text
            data-part="dial-letter"
            className={`dial-letter dial-letter--${face}${on ? ' dial-letter--current' : ''}`}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={px(size)}
        >
            {text}
        </text>
    );
};

/** 半透明底盤（見到下面嘅轉盤同碟）+ 揀中格嘅專輯色弧 */
const DialPlate = ({ layout, current, positions, open, accent }: PlateProps) => {
    const { dial } = layout;
    const style = { transform: `scale(${open ? 1 : dial.plateFrom})`, opacity: open ? 1 : 0 };
    return (
        <g data-part="dial-plate" className="dial-plate" data-open={open} style={style}>
            <path
                className="dial-plate-face"
                fillRule="evenodd"
                d={ringPath(dial.outer, dial.inner)}
                strokeWidth={DIAL_SHAPE.plateEdge}
            />
            {[dial.outer + rim.gap, dial.inner - rim.gap].map((r) => (
                <circle
                    key={r}
                    className="dial-plate-rim"
                    r={r}
                    fill="none"
                    strokeWidth={rim.width}
                />
            ))}
            {current !== positions - 1 && (
                <Mark
                    layout={layout}
                    deg={scaleAngle(layout, current, positions)}
                    accent={accent}
                />
            )}
        </g>
    );
};

/**
 * 轉碟時環繞旋鈕嘅字母盤（設計稿 dialRing()；Functional Spec D28）：半透明底盤、揀中格嘅專輯色弧、
 * 每格一個字母或者細點（dialShowsLetter）。打開：底盤由旋鈕邊向外擴（回彈），字母順時針逐個彈出；收返倒轉。
 * 純裝飾（讀屏由旋鈕嘅 slider 讀），唔接受 pointer。
 */
export const DialRing = ({ layout, keys, current, open, accent }: DialRingProps) => {
    const { dial, knob } = layout;
    const positions = keys.length;
    return (
        <g
            data-part="dial-ring"
            aria-hidden="true"
            pointerEvents="none"
            transform={`translate(${knob.x} ${knob.y})`}
        >
            <DialPlate {...{ layout, current, positions, open, accent }} />
            {keys.slice(0, -1).map((text, pos) => (
                <g
                    key={pos}
                    data-part="dial-key"
                    data-current={pos === current}
                    className="dial-key"
                    style={keyStyle(layout, pos, positions, open)}
                >
                    {dialShowsLetter(layout, pos, current, positions) ? (
                        <Letter text={text} on={pos === current} layout={layout} />
                    ) : (
                        <circle data-part="dial-dot" className="dial-dot" r={dial.dotR} />
                    )}
                </g>
            ))}
        </g>
    );
};
