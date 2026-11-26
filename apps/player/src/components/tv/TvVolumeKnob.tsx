import { type KeyboardEvent, useRef } from 'react';
import type { TvView } from '../../app/tvView';
import { t } from '../../i18n/t';
import type { StageLayout } from '../../stage/layouts';
import { volumeAfterTurn, volumeTurn } from './knobAngle';
import { isMuteKey, volumeForKey } from './knobKeys';
import { TvGlyph } from './TvGlyph';
import type { TvHandlers } from './TvButtons';
import { TvKnob } from './TvKnob';
import { useKnobDrag } from './useKnobDrag';

const PERCENT = 100;

interface TvVolumeKnobProps {
    layout: StageLayout;
    view: TvView;
    handlers: Pick<TvHandlers, 'onVolume' | 'onToggleMute'>;
    locked: boolean;
}

/**
 * 音量旋鈕（T-061；Functional Spec US-007、D104）：順時針扭 = 大聲（把手由左下到右下 sweepDeg）、
 * 㩒一下或者 Enter／空白鍵 = 靜音／開返聲（gain 0，記住音量）；方向鍵、Home／End。
 * 冇 Web Audio = 停用（aria-disabled），MV 用系統音量
 */
export const TvVolumeKnob = ({ layout, view, handlers, locked }: TvVolumeKnobProps) => {
    const { knobs } = layout.tv;
    const disabled = locked || !view.volumeSupported;
    const start = useRef(view.volume);
    const drag = useKnobDrag({
        thresholdPx: knobs.dragThresholdPx,
        disabled,
        onStart: () => {
            start.current = view.volume;
        },
        onTurn: (turned) =>
            handlers.onVolume(volumeAfterTurn(start.current, turned, knobs.sweepDeg)),
        onTap: handlers.onToggleMute,
    });
    const onKeyDown = (event: KeyboardEvent) => {
        const level = volumeForKey(event.key, view.volume);
        const mute = isMuteKey(event.key);
        if (level === null && !mute) return;
        event.preventDefault();
        if (disabled) return;
        if (mute) handlers.onToggleMute();
        else if (level !== null) handlers.onVolume(level);
    };
    const percent = Math.round(view.volume * PERCENT);
    const text = view.muted ? t('mv.muted') : t('mv.volumeValue', { percent });
    return (
        <TvKnob
            layout={layout}
            part="tv-volume"
            y={knobs.volumeY}
            turn={volumeTurn(view.volume, knobs.sweepDeg)}
            label={t('mv.volume')}
            value={{ now: percent, min: 0, max: PERCENT, text }}
            disabled={disabled}
            onKeyDown={onKeyDown}
            drag={drag}
        >
            <TvGlyph tv={layout.tv} y={knobs.volumeY} kind={view.muted ? 'muted' : 'volume'} />
        </TvKnob>
    );
};
