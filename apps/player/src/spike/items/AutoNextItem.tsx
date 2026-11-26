import { useState } from 'react';
import type { PlayerAccess } from '../audio/usePlayer';
import type { SpikeMedia } from '../media/useMedia';
import { TEXT } from '../text';
import { Section } from './Section';

interface AutoNextItemProps {
    player: PlayerAccess;
    media: SpikeMedia;
}

/** ② 鎖機後同一個 `<audio>` 自動下一首 */
export const AutoNextItem = ({ player, media }: AutoNextItemProps) => {
    const [autoJump, setAutoJump] = useState(true);
    const hasTracks = media.tracks.length > 0;
    const start = () => {
        const current = player.get();
        if (!current) return;
        current.autoJump = autoJump;
        current.start(media.tracks);
    };
    return (
        <Section item="2" title={TEXT.autoNext.title} how={TEXT.autoNext.how}>
            <label className="spike-toggle">
                <input
                    type="checkbox"
                    checked={autoJump}
                    onChange={(event) => setAutoJump(event.target.checked)}
                />
                {TEXT.autoNext.autoJump}
            </label>
            <div className="spike-row">
                <button
                    type="button"
                    className="spike-button spike-button--main"
                    onClick={start}
                    disabled={!hasTracks}
                    data-action="auto-next"
                >
                    {TEXT.autoNext.start}
                </button>
                <button
                    type="button"
                    className="spike-button"
                    onClick={() => player.get()?.jumpNearEnd()}
                >
                    {TEXT.autoNext.jump}
                </button>
                <button
                    type="button"
                    className="spike-button"
                    onClick={() => player.get()?.pause()}
                >
                    {TEXT.stop}
                </button>
            </div>
            <p className="spike-mono">{media.tracks.map((track) => track.name).join(' → ')}</p>
        </Section>
    );
};
