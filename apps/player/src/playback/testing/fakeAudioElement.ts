/*
 * 測試用嘅假 `<audio>`（冇聲、冇網絡）：記低引擎做過乜，事件由測試話幾時發。
 * 同真 element 一樣嘅地方：`play()` 回 promise；換 `src` 會重設位置同長度；播到尾先發 `pause` 再發 `ended`
 *（HTML spec「reaches the end」）；`pause()` 喺播緊時發 `pause`。
 */

/** `play()` 點樣回應：auto = 有數據即刻出聲；hold = 等測試 `resolvePlay()`；blocked = 瀏覽器唔准 */
export type FakePlayMode = 'auto' | 'hold' | 'blocked';

const MEDIA_ERR = { aborted: 1, network: 2, decode: 3, unsupported: 4 } as const;

export type FakeMediaError = keyof typeof MEDIA_ERR;

const domError = (name: string) => Object.assign(new Error(name), { name });

export class FakeAudioElement extends EventTarget {
    muted = false;
    paused = true;
    ended = false;
    duration = Number.NaN;
    preload = '';
    crossOrigin: string | null = null;
    error: { code: number } | null = null;
    playMode: FakePlayMode = 'auto';
    /** 每次 `play()` 嗰陣嘅 src 同 muted（驗「喺同一個 call stack 入面 play」） */
    readonly plays: { src: string; muted: boolean }[] = [];
    readonly seeks: number[] = [];
    loads = 0;
    private time = 0;
    private source = '';
    private pending: (() => void) | null = null;

    get src(): string {
        return this.source;
    }

    /** 真 element 設 src 會重新載入：重設位置、長度 */
    set src(url: string) {
        this.source = url;
        this.resetMedia();
    }

    get currentTime(): number {
        return this.time;
    }

    set currentTime(value: number) {
        this.time = value;
        this.seeks.push(value);
        this.ended = false;
    }

    play(): Promise<void> {
        this.plays.push({ src: this.src, muted: this.muted });
        if (this.playMode === 'blocked') return Promise.reject(domError('NotAllowedError'));
        this.paused = false;
        this.ended = false;
        if (this.playMode === 'hold') {
            return new Promise((resolve) => {
                this.pending = () => resolve();
            });
        }
        this.fire('playing');
        return Promise.resolve();
    }

    /** hold 模式：數據到咗，開始出聲 */
    resolvePlay(): void {
        const pending = this.pending;
        this.pending = null;
        if (this.paused) return;
        this.fire('playing');
        pending?.();
    }

    pause(): void {
        if (this.paused) return;
        this.paused = true;
        this.fire('pause');
    }

    removeAttribute(name: string): void {
        if (name === 'src') this.source = '';
    }

    load(): void {
        this.loads += 1;
        this.resetMedia();
    }

    /** 長度到咗（loadedmetadata） */
    loadMetadata(durationSec: number): void {
        this.duration = durationSec;
        this.fire('loadedmetadata');
    }

    /** 播咗幾秒（timeupdate） */
    advance(seconds: number): void {
        this.time += seconds;
        this.fire('timeupdate');
    }

    /** 播到尾 */
    finish(): void {
        this.time = Number.isFinite(this.duration) ? this.duration : this.time;
        this.ended = true;
        this.paused = true;
        this.fire('pause');
        this.fire('ended');
    }

    /** 系統（電話、Siri、鎖屏）停咗佢 */
    systemPause(): void {
        this.pause();
    }

    /** 系統自己恢復（冇經 page 嘅 play handler；T-011 報告 ③ H1） */
    systemResume(): void {
        this.paused = false;
        this.fire('playing');
    }

    fail(kind: FakeMediaError): void {
        this.error = { code: MEDIA_ERR[kind] };
        this.fire('error');
    }

    fire(type: string): void {
        this.dispatchEvent(new Event(type));
    }

    private resetMedia(): void {
        this.time = 0;
        this.duration = Number.NaN;
        this.paused = true;
        this.ended = false;
        this.error = null;
        this.pending = null;
    }
}

/** 當做 HTMLAudioElement 畀引擎（引擎只用到上面有嘅成員） */
export const asAudio = (fake: FakeAudioElement): HTMLAudioElement =>
    fake as unknown as HTMLAudioElement;
