import { useState } from 'react';
import { primeThenDrop, playLater } from '../audio/unlock';
import type { PlayerAccess } from '../audio/usePlayer';
import type { SpikeMedia } from '../media/useMedia';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import { OwnerCheck, Section } from './Section';

interface UnlockItemProps {
    audio: () => HTMLAudioElement | null;
    player: PlayerAccess;
    media: SpikeMedia;
}

const ITEM = '1';

/** 兩粒掣嘅動作：都要喺 click handler 入面同步行 */
const useUnlockActions = ({ audio, player, media }: UnlockItemProps) => {
    const { record, log } = useSpike();
    const [status, setStatus] = useState('');
    const first = media.tracks[0];
    const start = () => {
        const element = audio();
        if (!element || !first) return;
        // 同一個 element：第 2 項嘅自動下一首唔好接手
        player.get()?.release();
        setStatus(TEXT.unlock.waiting);
        primeThenDrop(
            element,
            first.url,
            (text) => log(ITEM, text),
            ({ ok, detail }) => {
                setStatus('');
                record('1a', TEXT.unlock.resultLabel, ok ? 'pass' : 'fail', detail);
            },
        );
    };
    const control = () => {
        if (!first) return;
        playLater(
            first.url,
            (text) => log(ITEM, text),
            ({ ok, detail }) =>
                record('1b', TEXT.unlock.controlLabel, 'value', `${ok ? '✓' : '✗'} ${detail}`),
        );
    };
    return { start, control, status, ready: first !== undefined };
};

/** ① 一按即播：靜音解鎖 + 1.5 秒後出聲；對照：唔解鎖 */
export const UnlockItem = (props: UnlockItemProps) => {
    const { start, control, status, ready } = useUnlockActions(props);
    return (
        <Section item={ITEM} title={TEXT.unlock.title} how={TEXT.unlock.how}>
            <div className="spike-row">
                <button type="button" className="spike-button" onClick={control} disabled={!ready}>
                    {TEXT.unlock.control}
                </button>
                <button
                    type="button"
                    className="spike-button spike-button--main"
                    onClick={start}
                    disabled={!ready}
                >
                    {TEXT.unlock.start}
                </button>
                <button
                    type="button"
                    className="spike-button"
                    onClick={() => props.audio()?.pause()}
                >
                    {TEXT.stop}
                </button>
            </div>
            {status ? <p role="status">{status}</p> : null}
            <OwnerCheck
                id="1c"
                label={TEXT.unlock.heardLabel}
                yes={TEXT.heard}
                no={TEXT.notHeard}
            />
        </Section>
    );
};
