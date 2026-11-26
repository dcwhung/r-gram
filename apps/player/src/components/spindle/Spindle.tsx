import type { Ref } from 'react';
import { t, type MessageKey } from '../../i18n/t';
import { spindleHitRadius } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { Shadow } from '../metal/Metal';
import { pressable } from '../pressable';
import { px } from '../svgNumber';
import { Clamp } from './Clamp';
import './spindle.css';
import { PauseGlyph, PlayGlyph, ProgressRing } from './SpindleGlyphs';
import { SPINDLE_SHAPE } from './spindleShape';

const { play, listRing } = SPINDLE_SHAPE;

/** 未揀歌｜歌單入面｜播緊｜暫停（包括熄電視之後） */
export type SpindleMode = 'idle' | 'list' | 'playing' | 'paused';

/** 㩒落去會做乜，亦即係畀讀屏嘅名 */
const LABEL: Readonly<Record<SpindleMode, MessageKey & ('list.open' | `playback.${string}`)>> = {
    idle: 'list.open',
    list: 'playback.play',
    playing: 'playback.pause',
    paused: 'playback.play',
};

interface SpindleProps {
    layout: StageLayout;
    mode: SpindleMode;
    /** 播放進度 0–1 */
    progress: number;
    accent: string;
    /** 停用：㩒唔到但 focus 得到（讀屏講「已停用」），例如電視開住時（唱片夾喺電視後面） */
    disabled?: boolean;
    /**
     * 唔係掣：照畫，但㩒唔到、唔入 Tab 次序、讀屏唔讀。拎住另一隻碟時（冇轉盤，T-048；
     * 設計稿照畫唱片夾，但 Functional Spec D52：唔開弧線歌單）
     */
    inert?: boolean;
    onPress: () => void;
    /** 收返歌單之後 focus 返呢度（S-074） */
    ref?: Ref<SVGGElement>;
}

const Face = ({
    r,
    mode,
    progress,
    accent,
}: { r: number } & Omit<SpindleProps, 'layout' | 'disabled' | 'inert' | 'onPress' | 'ref'>) => (
    <>
        <Clamp r={r} />
        {mode === 'list' && (
            <>
                <circle
                    data-part="list-ring"
                    r={px(r)}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={listRing.width}
                />
                <PlayGlyph size={r * play.listSize} />
            </>
        )}
        {(mode === 'playing' || mode === 'paused') && (
            <ProgressRing r={r} progress={progress} accent={accent} />
        )}
        {mode === 'playing' && <PauseGlyph r={r} />}
        {mode === 'paused' && <PlayGlyph size={r * play.pausedSize} />}
    </>
);

/**
 * 唱片機中軸嘅唱片夾：固定喺轉盤正中，唔跟碟郁；play / pause 喺佢上面
 *（Functional Spec CR-002「唱片夾同碟」；設計稿 spindle()）。
 */
export const Spindle = (props: SpindleProps) => {
    const { layout, mode, progress, accent, disabled = false, inert = false, onPress, ref } = props;
    const { disc, hub } = layout;
    const r = disc.r * hub.clamp;
    return (
        <g
            ref={ref}
            className="spindle"
            aria-label={t(LABEL[mode])}
            // 平時唔出呢個屬性（同設計稿移植嘅 markup 一致）
            aria-disabled={disabled || undefined}
            aria-hidden={inert || undefined}
            {...pressable(onPress, disabled || inert, !inert)}
        >
            <circle
                data-part="hit"
                cx={disc.x}
                cy={disc.y}
                r={px(spindleHitRadius(layout))}
                fill="transparent"
            />
            <Shadow cx={disc.x} cy={disc.y} r={r} {...SPINDLE_SHAPE.shadow} />
            <g data-part="clamp" transform={`translate(${disc.x} ${disc.y})`}>
                <Face r={r} mode={mode} progress={progress} accent={accent} />
            </g>
        </g>
    );
};
