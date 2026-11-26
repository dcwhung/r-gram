/*
 * ② ③ 用同一個 `<audio>`（產品做法，Technical Spec 數據流）：`ended` → 同一個 element 換 `src` → `play()`。
 * 記低每一步（連畫面係咪隱藏 = 鎖咗機），畀鎖機測試用。Media Session（③）都係叫呢度。
 */
import { AUTO_NEXT_PLAYS, FIRST_JUMP_BEFORE_END_S, JUMP_BEFORE_END_S } from '../config';
import type { SpikeTrack } from '../media/useMedia';
import { errorText } from '../media/probe';
import { TEXT } from '../text';

const LOG = TEXT.playerLog;

export interface PlayerHooks {
    log: (text: string) => void;
    /** 第 `play` 次播（1 = 第一首）真係開始咗 */
    started: (play: number, track: SpikeTrack, hidden: boolean) => void;
    failed: (play: number, error: string) => void;
    trackChanged: (track: SpikeTrack) => void;
}

const isHidden = () => document.visibilityState === 'hidden';
const shown = () => (isHidden() ? LOG.hidden : LOG.shown);

export class SpikePlayer {
    private tracks: SpikeTrack[] = [];
    private index = 0;
    private plays = 0;
    private active = false;
    private jumped = false;
    private reported = new Set<number>();
    autoJump = true;

    private readonly audio: HTMLAudioElement;
    private readonly hooks: PlayerHooks;

    constructor(audio: HTMLAudioElement, hooks: PlayerHooks) {
        this.audio = audio;
        this.hooks = hooks;
        audio.addEventListener('ended', () => this.onEnded());
        audio.addEventListener('playing', () => this.onPlaying());
        audio.addEventListener('loadedmetadata', () => this.onMetadata());
        audio.addEventListener(
            'error',
            () => this.active && this.hooks.log(LOG.mediaError(String(audio.error?.code ?? '?'))),
        );
    }

    get current(): SpikeTrack | undefined {
        return this.tracks[this.index];
    }

    /** 要喺 click handler 入面叫（第一下 `play()` 喺手勢入面） */
    start(tracks: SpikeTrack[]): void {
        if (tracks.length === 0) return;
        this.tracks = tracks;
        this.plays = 1;
        this.reported.clear();
        this.active = true;
        this.load(0);
        this.play(LOG.start);
    }

    /** 第 1 項接手個 element：唔再自動下一首 */
    release(): void {
        this.active = false;
    }

    next(step = 1): void {
        if (this.tracks.length === 0) return;
        this.active = true;
        this.load((this.index + step + this.tracks.length) % this.tracks.length);
        this.play(step > 0 ? LOG.next : LOG.previous);
    }

    jumpNearEnd(lead = JUMP_BEFORE_END_S): void {
        const { duration } = this.audio;
        if (!Number.isFinite(duration)) return;
        this.audio.currentTime = Math.max(0, duration - lead);
        this.hooks.log(LOG.jumped(this.audio.currentTime.toFixed(1)));
    }

    play(label: string): void {
        const play = this.plays;
        this.audio.play().then(
            () => this.hooks.log(LOG.playOk(label, shown())),
            (error: unknown) => {
                this.hooks.log(LOG.playRejected(label, errorText(error), shown()));
                this.hooks.failed(play, errorText(error));
            },
        );
    }

    pause(): void {
        this.audio.pause();
    }

    private load(index: number): void {
        const track = this.tracks[index];
        if (!track) return;
        this.index = index;
        this.jumped = false;
        this.audio.src = track.url;
        this.hooks.trackChanged(track);
    }

    private onEnded(): void {
        if (!this.active) return;
        this.hooks.log(LOG.ended(this.plays, shown()));
        if (this.plays >= AUTO_NEXT_PLAYS) {
            this.active = false;
            return;
        }
        this.plays += 1;
        this.load((this.index + 1) % this.tracks.length);
        this.play(LOG.autoPlay(this.plays));
    }

    private onPlaying(): void {
        const track = this.current;
        if (!this.active || !track) return;
        this.hooks.log(LOG.playing(track.title, shown()));
        if (this.reported.has(this.plays)) return;
        this.reported.add(this.plays);
        this.hooks.started(this.plays, track, isHidden());
    }

    private onMetadata(): void {
        if (!this.active || !this.autoJump || this.jumped) return;
        this.jumped = true;
        // 第一首留多啲時間畀用戶鎖機
        this.jumpNearEnd(this.plays === 1 ? FIRST_JUMP_BEFORE_END_S : JUMP_BEFORE_END_S);
    }
}
