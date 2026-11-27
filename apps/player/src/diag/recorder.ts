import { APP_VERSION } from '../config/appVersion';
import { formatReport } from './format';
import { appendEntry, type LogEntry, recentTimes } from './log';
import { createProbes, type Probes, readFit, readFitKey, takeSnapshot } from './measure';
import type { FlickerStats, LoadSnapshot, Snapshot } from './snapshot';

/** 開 app（或者開診斷）之後幾耐再量多兩次 */
const LOAD_DELAYS_MS = [500, 2000] as const;
const WINDOW_EVENTS = ['resize', 'orientationchange'] as const;
const VIEWPORT_EVENTS = ['resize', 'scroll'] as const;

type Listener = () => void;

const viewportDetail = () => `inner ${window.innerWidth}x${window.innerHeight}`;

const visualDetail = (vv: VisualViewport) =>
    `vv ${vv.width}x${vv.height} top ${vv.offsetTop} pageTop ${vv.pageTop} scale ${vv.scale}`;

/**
 * DOMContentLoaded 未發生？module script（main.tsx）係 deferred：行嗰陣 readyState 已經係 'interactive'，
 * 但 DOMContentLoaded 未 fire；用 navigation timing 分辨
 */
const domContentLoadedPending = (): boolean => {
    if (document.readyState !== 'interactive') return document.readyState === 'loading';
    const [navigation] = performance.getEntriesByType?.('navigation') ?? [];
    return (
        (navigation as PerformanceNavigationTiming | undefined)?.domContentLoadedEventStart === 0
    );
};

const fitSignature = () => {
    const fit = readFit();
    return fit ? Object.values(fit).join(' ') : '-';
};

/** 一組會變嘅數（fit key 或者寫落外框嘅 fit）：記低每次變嘅時間，計過去一秒幾多次 */
class ChangeTracker {
    private last: string | null = null;
    private times: number[] = [];
    max = 0;

    /** 有變就回 `舊 → 新`，第一次讀或者冇變回 null */
    check(value: string, now: number): string | null {
        const previous = this.last;
        this.last = value;
        if (previous === null || previous === value) return null;
        this.times = [...recentTimes(this.times, now), now];
        this.max = Math.max(this.max, this.times.length);
        return `${previous} → ${value}`;
    }

    count(now: number): number {
        return recentTimes(this.times, now).length;
    }

    reset(): void {
        this.times = [];
        this.max = 0;
    }
}

/**
 * 診斷開住時先存在：聽 viewport 事件、每個 frame 讀 fit key，記低事件同開 app 三個時間點嘅量度。
 * stop() 拆走所有 listener、timer 同 probe。
 */
export class DiagRecorder {
    log: LogEntry[] = [];
    load: LoadSnapshot[] = [];
    private readonly key = new ChangeTracker();
    private readonly fit = new ChangeTracker();
    private readonly listeners = new Set<Listener>();
    private readonly cleanups: (() => void)[] = [];
    private readonly probes: Probes = createProbes();
    private frame = 0;

    constructor(private readonly now: () => number = () => performance.now()) {}

    start(): void {
        this.listenWindow();
        this.listenVisualViewport();
        this.listenLoad();
        this.poll();
    }

    stop(): void {
        cancelAnimationFrame(this.frame);
        this.cleanups.splice(0).forEach((cleanup) => cleanup());
        this.probes.host.remove();
        this.listeners.clear();
    }

    snapshot(): Snapshot {
        return takeSnapshot(this.probes, this.now());
    }

    flicker(): FlickerStats {
        const now = this.now();
        const { key, fit } = this;
        return { keyNow: key.count(now), keyMax: key.max, fitNow: fit.count(now), fitMax: fit.max };
    }

    report(): string {
        return formatReport({
            version: APP_VERSION,
            userAgent: navigator.userAgent,
            live: this.snapshot(),
            load: this.load,
            flicker: this.flicker(),
            log: this.log,
        });
    }

    /** 清記錄同閃嘅次數；開 app 三個時間點嘅量度留低 */
    clear = (): void => {
        this.log = [];
        this.key.reset();
        this.fit.reset();
        this.notify();
    };

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** 每個 frame 讀一次：resize 事件冇嚟、env() 自己變都捉到 */
    readonly poll = (): void => {
        const now = this.now();
        const keyChange = this.key.check(readFitKey(), now);
        if (keyChange) this.record('key', keyChange);
        const fitChange = this.fit.check(fitSignature(), now);
        if (fitChange) this.record('fit', fitChange);
        this.frame = requestAnimationFrame(this.poll);
    };

    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }

    private record(type: string, detail: string): void {
        this.log = appendEntry(this.log, { t: this.now(), type, detail });
        this.notify();
    }

    private on(target: EventTarget, type: string, handler: (event: Event) => void): void {
        target.addEventListener(type, handler);
        this.cleanups.push(() => target.removeEventListener(type, handler));
    }

    private listenWindow(): void {
        WINDOW_EVENTS.forEach((type) =>
            this.on(window, type, () => this.record(type, viewportDetail())),
        );
        this.on(window, 'pageshow', (event) =>
            this.record('pageshow', `persisted ${(event as PageTransitionEvent).persisted}`),
        );
        this.on(document, 'visibilitychange', () =>
            this.record('visibilitychange', document.visibilityState),
        );
    }

    private listenVisualViewport(): void {
        const vv = window.visualViewport;
        if (!vv) return;
        VIEWPORT_EVENTS.forEach((type) =>
            this.on(vv, type, () => this.record(`vv.${type}`, visualDetail(vv))),
        );
    }

    /** 開 app 時開住：DOMContentLoaded 量一次；之後先開（5 下）：即刻量，標做 enabled */
    private listenLoad(): void {
        if (domContentLoadedPending()) {
            this.on(document, 'DOMContentLoaded', () => this.measureLoad('DOMContentLoaded'));
        } else {
            this.measureLoad('enabled');
        }
    }

    private measureLoad(label: string): void {
        this.pushLoad(label);
        LOAD_DELAYS_MS.forEach((delay) => {
            const timer = window.setTimeout(() => this.pushLoad(`${label} +${delay}ms`), delay);
            this.cleanups.push(() => window.clearTimeout(timer));
        });
    }

    private pushLoad(label: string): void {
        this.load = [...this.load, { label, snapshot: this.snapshot() }];
        this.notify();
    }
}
