import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { isStandalone } from '../env';
import { OwnerCheck } from '../items/Section';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import { DragList } from './DragList';
import { stageInsets } from './insets';
import { Knob } from './Knob';
import { type QuarterTurn, stageBox, turnFor, type TurnChoice } from './rotation';
import { readingText, useViewport } from './useViewport';

const CHOICES: readonly { choice: TurnChoice; label: string }[] = [
    { choice: 'auto', label: TEXT.landscape.auto },
    { choice: -90, label: '−90°' },
    { choice: 90, label: '+90°' },
];

const CHECKS = [
    { id: '6b', label: TEXT.landscape.topLabel },
    { id: '6c', label: TEXT.landscape.dragLabel },
    { id: '6d', label: TEXT.landscape.knobLabel },
    { id: '6e', label: TEXT.landscape.flashLabel },
    { id: '6f', label: TEXT.landscape.barsLabel },
] as const;

const SAFE_SIDES = ['top', 'right', 'bottom', 'left'] as const;

interface StageBodyProps {
    summary: string;
    turn: QuarterTurn;
    force: TurnChoice;
    onForce: (choice: TurnChoice) => void;
    onClose: () => void;
}

/** 舞台入面嘅嘢（直向排）：頂部標記、讀數、方向掣、清單同旋鈕、五項判斷 */
const StageBody = ({ summary, turn, force, onForce, onClose }: StageBodyProps) => (
    <>
        {TEXT.landscape.corners.map((corner, index) => (
            <span key={corner} className={`spike-corner spike-corner--${index}`}>
                {corner}
            </span>
        ))}
        <header className="spike-landscape-head">
            <strong>{TEXT.landscape.top}</strong>
            <button type="button" className="spike-button" onClick={onClose}>
                {TEXT.close}
            </button>
        </header>
        <p className="spike-mono spike-readout">{summary}</p>
        <div className="spike-row" role="group" aria-label={TEXT.landscape.direction}>
            {CHOICES.map(({ choice, label }) => (
                <button
                    key={label}
                    type="button"
                    className="spike-button"
                    aria-pressed={force === choice}
                    onClick={() => onForce(choice)}
                >
                    {label}
                </button>
            ))}
        </div>
        <div className="spike-landscape-play">
            <DragList turn={turn} />
            <Knob />
        </div>
        {CHECKS.map(({ id, label }) => (
            <OwnerCheck key={id} id={id} label={label} />
        ))}
    </>
);

/** 讀 viewport、計轉向；打橫時嘅讀數（最後一次）寫入結果 */
const useLandscape = (force: TurnChoice) => {
    const { record, log } = useSpike();
    const onEvent = useCallback((text: string) => log('6', text), [log]);
    const reading = useViewport(onEvent);
    const turn = turnFor({ ...reading, force });
    const mode = isStandalone() ? TEXT.modeStandalone : TEXT.modeTab;
    const summary = [readingText(reading), TEXT.landscape.turned(turn), mode].join(' · ');
    useEffect(() => {
        if (turn !== 0) record('6a', TEXT.landscape.readingsLabel, 'value', summary);
    }, [turn, summary, record]);
    const box = stageBox(turn, reading.width, reading.height);
    const pad = stageInsets(turn, reading.insets);
    const style: CSSProperties = {
        width: box.width,
        height: box.height,
        transform: box.transform,
        padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
    };
    return { turn, summary, style };
};

/** ⑥ 全螢幕直向「舞台」：viewport 打橫時反方向轉 90°，睇落同直向一樣 */
export const LandscapeOverlay = ({ onClose }: { onClose: () => void }) => {
    const [force, setForce] = useState<TurnChoice>('auto');
    const { turn, summary, style } = useLandscape(force);
    return (
        <div className="spike-landscape" data-testid="landscape" data-turn={turn}>
            <div className="spike-landscape-stage" style={style}>
                <StageBody
                    summary={summary}
                    turn={turn}
                    force={force}
                    onForce={setForce}
                    onClose={onClose}
                />
            </div>
            {SAFE_SIDES.map((side) => (
                <div key={side} className={`spike-safe spike-safe--${side}`} />
            ))}
        </div>
    );
};
