import { type KeyboardEvent, useRef, useState } from 'react';
import type { TvView } from '../../app/tvView';
import { t } from '../../i18n/t';
import { SEEK_STEP_S } from '../../mv/mvConfig';
import type { StageLayout } from '../../stage/layouts';
import { formatTime } from '../../utils/formatTime';
import { seekStepsFor } from './knobAngle';
import { seekForKey } from './knobKeys';
import type { TvHandlers } from './TvButtons';
import { TvGlyph } from './TvGlyph';
import { TvKnob } from './TvKnob';
import { useKnobDrag } from './useKnobDrag';

interface TvSeekKnobProps {
    layout: StageLayout;
    view: TvView;
    handlers: Pick<TvHandlers, 'onSeekBy' | 'onSeekTo'>;
    locked: boolean;
}

/** 把手跟住扭（冇終點：一路扭一路跳）；方向鍵每下轉一格 */
const useGripTurn = (layout: StageLayout) => {
    const { seekRestDeg } = layout.tv.knobs;
    const [base, setBase] = useState(seekRestDeg);
    const [live, setLive] = useState(0);
    return {
        turn: base + live,
        follow: setLive,
        settle: () => {
            setBase((value) => value + live);
            setLive(0);
        },
        step: (steps: number) => setBase((value) => value + steps * layout.tv.knobs.seekStepDeg),
    };
};

/** 扭：每夠一格（seekStepDeg）跳一次；方向鍵每下一格，Home／End = 由頭／尾 */
const useSeekControls = (
    { layout, view, handlers }: Omit<TvSeekKnobProps, 'locked'>,
    disabled: boolean,
) => {
    const { knobs } = layout.tv;
    const grip = useGripTurn(layout);
    const sent = useRef(0);
    const drag = useKnobDrag({
        thresholdPx: knobs.dragThresholdPx,
        disabled,
        onStart: () => {
            sent.current = 0;
        },
        onTurn: (turned) => {
            grip.follow(turned);
            const steps = seekStepsFor(turned, knobs.seekStepDeg);
            if (steps !== sent.current) handlers.onSeekBy((steps - sent.current) * SEEK_STEP_S);
            sent.current = steps;
        },
        onEnd: grip.settle,
    });
    const onKeyDown = (event: KeyboardEvent) => {
        const move = seekForKey(event.key, view.durationSec ?? 0);
        if (!move) return;
        event.preventDefault();
        if (disabled) return;
        if ('to' in move) handlers.onSeekTo(move.to);
        else {
            handlers.onSeekBy(move.by);
            grip.step(Math.sign(move.by));
        }
    };
    return { turn: grip.turn, drag, onKeyDown };
};

/**
 * 快轉／倒轉旋鈕（T-061；§CR-002「MV 電視」：向右扭快轉、向左扭倒轉，下面 icon ◀◀ ▶▶）：
 * 每扭 seekStepDeg 跳 SEEK_STEP_S 秒；方向鍵同樣，Home／End = 由頭／尾。未知長度 = 停用
 */
export const TvSeekKnob = ({ locked, ...props }: TvSeekKnobProps) => {
    const { layout, view } = props;
    const duration = view.durationSec ?? 0;
    const disabled = locked || view.durationSec === null;
    const { turn, drag, onKeyDown } = useSeekControls(props, disabled);
    const text = t('mv.seekValue', {
        time: formatTime(view.positionSec),
        duration: formatTime(duration),
    });
    const value = { now: Math.round(view.positionSec), min: 0, max: Math.round(duration), text };
    return (
        <TvKnob
            layout={layout}
            part="tv-seek"
            y={layout.tv.knobs.seekY}
            turn={turn}
            label={t('mv.seek')}
            value={value}
            disabled={disabled}
            onKeyDown={onKeyDown}
            drag={drag}
        >
            <TvGlyph tv={layout.tv} y={layout.tv.knobs.seekY} kind="seek" />
        </TvKnob>
    );
};
