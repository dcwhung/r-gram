import { t, type MessageKey } from '../../i18n/t';
import { hitSizeUnits } from '../../stage/geometry';
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
const LABEL: Readonly<Record<SpindleMode, MessageKey & `${'list' | 'playback'}.${string}`>> = {
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
    onPress: () => void;
}

const Face = ({
    r,
    mode,
    progress,
    accent,
}: { r: number } & Omit<SpindleProps, 'layout' | 'onPress'>) => (
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
export const Spindle = ({ layout, mode, progress, accent, onPress }: SpindleProps) => {
    const { disc, hub } = layout;
    const r = disc.r * hub.clamp;
    return (
        <g className="spindle" aria-label={t(LABEL[mode])} {...pressable(onPress)}>
            <circle
                data-part="hit"
                cx={disc.x}
                cy={disc.y}
                r={px(Math.max(r, hitSizeUnits(layout) / 2))}
                fill="transparent"
            />
            <Shadow cx={disc.x} cy={disc.y} r={r} {...SPINDLE_SHAPE.shadow} />
            <g data-part="clamp" transform={`translate(${disc.x} ${disc.y})`}>
                <Face r={r} mode={mode} progress={progress} accent={accent} />
            </g>
        </g>
    );
};
