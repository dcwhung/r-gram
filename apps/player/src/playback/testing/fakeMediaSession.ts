/*
 * 測試用嘅假 `navigator.mediaSession` 同 `MediaMetadata`：記低 handler、metadata、狀態同位置；
 * `trigger()` = 鎖屏㩒掣。
 */
export class FakeMetadata {
    readonly title: string;
    readonly artist: string;
    readonly album: string;
    readonly artwork: readonly MediaImage[];

    constructor(init: MediaMetadataInit = {}) {
        this.title = init.title ?? '';
        this.artist = init.artist ?? '';
        this.album = init.album ?? '';
        this.artwork = init.artwork ?? [];
    }
}

export interface PositionCall {
    duration?: number;
    position?: number;
    playbackRate?: number;
}

export class FakeMediaSession {
    metadata: FakeMetadata | null = null;
    playbackState: MediaSessionPlaybackState = 'none';
    readonly handlers = new Map<string, MediaSessionActionHandler | null>();
    readonly positions: PositionCall[] = [];
    /** 呢啲 action 註冊時 throw（舊 Safari 唔識） */
    unsupported = new Set<string>();

    setActionHandler(action: string, handler: MediaSessionActionHandler | null): void {
        if (this.unsupported.has(action)) throw new TypeError(`${action} not supported`);
        this.handlers.set(action, handler);
    }

    setPositionState(state: PositionCall = {}): void {
        this.positions.push(state);
    }

    trigger(action: string, details: Partial<MediaSessionActionDetails> = {}): void {
        this.handlers.get(action)?.({ action, ...details } as MediaSessionActionDetails);
    }

    get lastPosition(): PositionCall | undefined {
        return this.positions.at(-1);
    }
}

export const asSession = (fake: FakeMediaSession): MediaSession => fake as unknown as MediaSession;

export const asMetadata = (fake: typeof FakeMetadata): typeof MediaMetadata =>
    fake as unknown as typeof MediaMetadata;
