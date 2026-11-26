/*
 * 測試用嘅假 Web Audio（冇聲）：記低 context 建立咗幾多次、resume／suspend、每個 element 接過幾多次
 *（真瀏覽器第二次 `createMediaElementSource` 同一個 element 會 throw）同 gain 嘅值。
 */

/** 假 AudioParam：`setTargetAtTime` 當即刻到（測試唔使等 ramp）；`calls` 記低用咗邊個方法（S-259：靜音唔可以 ramp） */
export class FakeParam {
    value = 1;
    readonly targets: number[] = [];
    readonly calls: ['setValueAtTime' | 'setTargetAtTime', number][] = [];

    setValueAtTime(value: number): void {
        this.calls.push(['setValueAtTime', value]);
        this.value = value;
    }

    setTargetAtTime(value: number): void {
        this.calls.push(['setTargetAtTime', value]);
        this.targets.push(value);
        this.value = value;
    }

    cancelScheduledValues(): void {}
}

class FakeNode {
    readonly connections: unknown[] = [];

    connect<T>(target: T): T {
        this.connections.push(target);
        return target;
    }
}

export class FakeGain extends FakeNode {
    readonly gain = new FakeParam();
}

export class FakeAudioContext {
    static created: FakeAudioContext[] = [];
    state: 'running' | 'suspended' | 'closed' = 'suspended';
    currentTime = 0;
    resumes = 0;
    suspends = 0;
    readonly destination = new FakeNode();
    readonly gains: FakeGain[] = [];
    readonly sources: unknown[] = [];
    private static connected = new WeakSet<object>();

    constructor() {
        FakeAudioContext.created.push(this);
    }

    /** 每個 element 只可以一次（同真瀏覽器一樣，第二次 throw） */
    createMediaElementSource(element: object): FakeNode {
        if (FakeAudioContext.connected.has(element)) throw new Error('InvalidStateError');
        FakeAudioContext.connected.add(element);
        this.sources.push(element);
        return new FakeNode();
    }

    createGain(): FakeGain {
        const gain = new FakeGain();
        this.gains.push(gain);
        return gain;
    }

    resume(): Promise<void> {
        this.resumes += 1;
        this.state = 'running';
        return Promise.resolve();
    }

    suspend(): Promise<void> {
        this.suspends += 1;
        this.state = 'suspended';
        return Promise.resolve();
    }

    /** 每個測試開頭清走記錄 */
    static reset(): void {
        FakeAudioContext.created = [];
        FakeAudioContext.connected = new WeakSet();
    }

    /** 最近建立嗰個 context 嘅 gain（冇 = 未接） */
    static lastGain(): FakeParam | undefined {
        return FakeAudioContext.created.at(-1)?.gains.at(-1)?.gain;
    }
}

export const asContextClass = (fake: typeof FakeAudioContext): typeof AudioContext =>
    fake as unknown as typeof AudioContext;
