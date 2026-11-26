import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import type { SpikeMedia } from '../media/useMedia';
import { type SpikeStore, useSpike } from '../results/store';
import { TEXT } from '../text';
import { setTrackMetadata } from './mediaSession';
import { type PlayerHooks, SpikePlayer } from './SpikePlayer';

/** ② 嘅記錄放喺項目 2 */
const ITEM = '2';

export interface PlayerAccess {
    /** 第一次叫先砌（`<audio>` 要 mount 咗）；未 mount = null */
    get: () => SpikePlayer | null;
    /** ③ 開咗 Media Session：之後每次換歌都更新鎖屏資料 */
    markSession: () => void;
}

/** 播放器嘅事件 → 結果同記錄；Media Session 開咗就跟住換鎖屏資料 */
const playerHooks = (
    { record, log }: Pick<SpikeStore, 'record' | 'log'>,
    sessionOn: RefObject<boolean>,
    latestMedia: RefObject<SpikeMedia>,
): PlayerHooks => ({
    log: (text) => log(ITEM, text),
    started: (play, track, hidden) => {
        if (play === 1) return;
        const where = hidden ? TEXT.autoNext.hidden : TEXT.autoNext.visible;
        record(
            `2${play}`,
            TEXT.autoNext.startedLabel(play),
            'pass',
            `${track.title}${TEXT.comma}${where}`,
        );
    },
    failed: (play, error) => record(`2${play}`, TEXT.autoNext.startedLabel(play), 'fail', error),
    trackChanged: (track) => {
        if (sessionOn.current) setTrackMetadata(track, latestMedia.current);
    },
});

/** ② ③ 共用嘅播放器（同一個 `<audio>`） */
export const usePlayer = (
    audioRef: RefObject<HTMLAudioElement | null>,
    media: SpikeMedia,
): PlayerAccess => {
    const { record, log } = useSpike();
    const player = useRef<SpikePlayer | null>(null);
    const latestMedia = useRef(media);
    const sessionOn = useRef(false);
    useEffect(() => {
        latestMedia.current = media;
    }, [media]);
    const get = useCallback((): SpikePlayer | null => {
        const audio = audioRef.current;
        if (!audio) return null;
        player.current ??= new SpikePlayer(
            audio,
            playerHooks({ record, log }, sessionOn, latestMedia),
        );
        return player.current;
    }, [audioRef, record, log]);
    const markSession = useCallback(() => {
        sessionOn.current = true;
    }, []);
    return useMemo(() => ({ get, markSession }), [get, markSession]);
};
