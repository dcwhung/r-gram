import { useRef } from 'react';
import { enableMediaSession, mediaSessionSupported, setTrackMetadata } from '../audio/mediaSession';
import type { PlayerAccess } from '../audio/usePlayer';
import type { SpikeMedia } from '../media/useMedia';
import { useSpike } from '../results/store';
import { TEXT } from '../text';
import { OwnerCheck, Section } from './Section';

interface MediaSessionItemProps {
    player: PlayerAccess;
    audio: () => HTMLAudioElement | null;
    media: SpikeMedia;
}

const ITEM = '3';

/** ③ Media Session：資料、五個 handler；每次鎖屏掣都記低 */
export const MediaSessionItem = ({ player, audio, media }: MediaSessionItemProps) => {
    const { record, log } = useSpike();
    const calls = useRef<string[]>([]);
    const enable = () => {
        const current = player.get();
        const element = audio();
        if (!mediaSessionSupported() || !current || !element) {
            record('3a', TEXT.session.enabledLabel, 'fail', TEXT.session.unsupported);
            return;
        }
        player.markSession();
        const track = current.current ?? media.tracks[0];
        if (track) setTrackMetadata(track, media);
        enableMediaSession(current, element, (action, detail) => {
            log(ITEM, detail ? `${action}${TEXT.paren(detail)}` : action);
            calls.current = [...new Set([...calls.current, action])];
            record('3b', TEXT.session.callsLabel, 'value', calls.current.join(TEXT.listSeparator));
        });
        record('3a', TEXT.session.enabledLabel, 'pass', track?.title ?? '');
    };
    return (
        <Section item={ITEM} title={TEXT.session.title} how={TEXT.session.how}>
            <button type="button" className="spike-button spike-button--main" onClick={enable}>
                {TEXT.session.enable}
            </button>
            <OwnerCheck id="3c" label={TEXT.session.lockScreenLabel} />
            <OwnerCheck id="3d" label={TEXT.session.controlsLabel} />
            <OwnerCheck id="3e" label={TEXT.session.seekLabel} />
        </Section>
    );
};
