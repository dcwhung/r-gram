import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { hitSizeUnits } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { TvDialFace } from './TvDial';

export interface SliderValue {
    now: number;
    min: number;
    max: number;
    text: string;
}

interface TvKnobProps {
    layout: StageLayout;
    /** `tv-volume`｜`tv-seek` */
    part: string;
    y: number;
    turn: number;
    label: string;
    value: SliderValue;
    /** 停用（冇 Web Audio、未知長度、熄機中）：照 focus 得，讀屏講「已停用」 */
    disabled: boolean;
    onKeyDown: (event: KeyboardEvent) => void;
    drag: {
        onPointerDown: (event: PointerEvent) => void;
        onPointerMove: (event: PointerEvent) => void;
        onPointerUp: (event: PointerEvent) => void;
        onPointerCancel: (event: PointerEvent) => void;
    };
    /** 旋鈕下面嘅 icon */
    children: ReactNode;
}

/**
 * 一粒可以扭嘅大旋鈕（role="slider"；Technical Spec 實現注意事項 14，同轉碟旋鈕一樣）：
 * 感應圓（最少 44pt，量中心用）+ 樣（TvDialFace）+ icon。鍵盤同拖動由外面嘅 knob 決定
 */
export const TvKnob = (props: TvKnobProps) => {
    const { layout, part, y, value, disabled } = props;
    const { knobs } = layout.tv;
    const hitR = Math.max(hitSizeUnits(layout) / 2, knobs.dialR + knobs.rim);
    return (
        <g
            className="tv-knob"
            data-part={part}
            role="slider"
            tabIndex={0}
            aria-label={props.label}
            aria-valuemin={value.min}
            aria-valuemax={value.max}
            aria-valuenow={value.now}
            aria-valuetext={value.text}
            aria-disabled={disabled}
            onKeyDown={props.onKeyDown}
            {...props.drag}
        >
            <circle
                data-part={`${part}-hit`}
                data-knob-hit=""
                cx={knobs.x}
                cy={y}
                r={hitR}
                fill="transparent"
            />
            <TvDialFace tv={layout.tv} y={y} turn={props.turn} />
            {props.children}
        </g>
    );
};
