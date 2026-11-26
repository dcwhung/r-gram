/*
 * Media Session 嘅「目標」（Technical Spec「Media Session → MV 開住」；T-060）：鎖屏得一個，但有兩樣嘢想寫：
 * 唱片（playbackController）同電視（mvController）。兩邊各自攞一個 port；只有而家嘅目標寫得落真嘅 Media Session，
 * 另一邊嘅寫入記住。換目標 = 將新目標記住嘅 handler、metadata、狀態、位置寫返落去。
 * 電視開住時唱片停（pause 事件遲啲先到）都唔會蓋過 MV；收埋電視轉返唱片，鎖屏即刻變返唱片嗰首。
 */
import type { MediaSessionHandlers, MediaSessionPort, NowPlaying } from './mediaSession';

export type SessionTarget = 'record' | 'mv';

export interface SessionTargets {
    /** 冇 Media Session = null（兩個都係） */
    readonly record: MediaSessionPort | null;
    readonly mv: MediaSessionPort | null;
    use(target: SessionTarget): void;
}

/** 一個目標記住嘅嘢；active 先寫落真嘅 port */
class TargetPort implements MediaSessionPort {
    active = false;
    private handlers: MediaSessionHandlers | null = null;
    private nowPlaying: NowPlaying | null = null;
    private state: MediaSessionPlaybackState = 'none';
    private position: [number, number | null] | null = null;

    constructor(private readonly port: MediaSessionPort) {}

    bind(handlers: MediaSessionHandlers): void {
        this.handlers = handlers;
        if (this.active) this.port.bind(handlers);
    }

    setNowPlaying(nowPlaying: NowPlaying | null): void {
        this.nowPlaying = nowPlaying;
        if (this.active) this.port.setNowPlaying(nowPlaying);
    }

    setState(state: MediaSessionPlaybackState): void {
        this.state = state;
        if (this.active) this.port.setState(state);
    }

    setPosition(positionSec: number, durationSec: number | null): void {
        this.position = [positionSec, durationSec];
        if (this.active) this.port.setPosition(positionSec, durationSec);
    }

    /** 變做目標：記住嘅全部寫返落去 */
    takeOver(): void {
        this.active = true;
        if (this.handlers) this.port.bind(this.handlers);
        this.port.setNowPlaying(this.nowPlaying);
        this.port.setState(this.state);
        if (this.position) this.port.setPosition(...this.position);
    }
}

const NO_TARGETS: SessionTargets = { record: null, mv: null, use: () => {} };

/** 一開始目標係唱片 */
export const createSessionTargets = (port: MediaSessionPort | null): SessionTargets => {
    if (!port) return NO_TARGETS;
    const ports = { record: new TargetPort(port), mv: new TargetPort(port) };
    ports.record.active = true;
    return {
        record: ports.record,
        mv: ports.mv,
        use: (target) => {
            if (ports[target].active) return;
            ports.record.active = false;
            ports.mv.active = false;
            ports[target].takeOver();
        },
    };
};
