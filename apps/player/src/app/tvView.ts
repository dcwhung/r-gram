/*
 * 電視畫面要嘅衍生值（純函數；設計稿 tvSet()）：由電視 controller 嘅狀態計，唔另外存。
 */
import type { MvSnapshot } from '../mv/mvController';
import { formatTime } from '../utils/formatTime';

export type TvButton = 'play' | 'pause' | 'stop';

export interface TvView {
    /** open：升起／開住；closing：熄機 + 收埋緊（掣鎖住） */
    phase: 'open' | 'closing';
    title: string;
    /** 進度線（專輯色）、著燈（指示燈、生效嗰粒掣） */
    accent: string;
    glow: string;
    /** 著燈嗰粒（設計稿 active：熄機中 ■、暫停 ❚❚、其餘 ▶）；載入失敗 = 冇 */
    active: TvButton | null;
    /** 0–1 */
    progress: number;
    /** 已播時間 `m:ss`（真實長度，US-007） */
    timeText: string;
    failed: boolean;
    /** 成個 app 嗰個 `<video>`：電視 mount 時搬入螢幕 */
    video: HTMLVideoElement;
    /** 音量旋鈕（T-061）：0–1、靜音、有冇 Web Audio（冇 = 停用） */
    volume: number;
    muted: boolean;
    volumeSupported: boolean;
    /** 快轉／倒轉旋鈕（T-061）：而家位置同長度（未知 = null，旋鈕停用） */
    positionSec: number;
    durationSec: number | null;
}

const activeButton = ({ phase, status }: MvSnapshot): TvButton | null => {
    if (phase === 'closing') return 'stop';
    if (status === 'error') return null;
    return status === 'paused' ? 'pause' : 'play';
};

export const tvView = (
    snapshot: MvSnapshot,
    colours: { accent: string; glow: string },
    video: HTMLVideoElement,
): TvView | null => {
    const { phase, track, positionSec, durationSec } = snapshot;
    if (phase === 'closed' || !track) return null;
    return {
        phase,
        title: track.title,
        ...colours,
        active: activeButton(snapshot),
        progress: durationSec ? Math.min(1, positionSec / durationSec) : 0,
        timeText: formatTime(positionSec),
        failed: snapshot.failed,
        video,
        volume: snapshot.volume,
        muted: snapshot.muted,
        volumeSupported: snapshot.volumeSupported,
        positionSec,
        durationSec,
    };
};
