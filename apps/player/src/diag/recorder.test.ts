import { DiagRecorder } from './recorder';

const setInnerWidth = (width: number) =>
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);

describe('DiagRecorder', () => {
    let clock = 0;
    let recorder: DiagRecorder;

    beforeEach(() => {
        clock = 1000;
        vi.stubGlobal('requestAnimationFrame', () => 1);
        vi.stubGlobal('cancelAnimationFrame', () => undefined);
        recorder = new DiagRecorder(() => clock);
    });

    afterEach(() => {
        recorder.stop();
        vi.restoreAllMocks();
        vi.useRealTimers();
        document.body.replaceChildren();
    });

    it('should log viewport events newest first', () => {
        recorder.start();
        window.dispatchEvent(new Event('resize'));
        clock = 1200;
        window.dispatchEvent(new Event('orientationchange'));
        window.dispatchEvent(new Event('pageshow'));
        document.dispatchEvent(new Event('visibilitychange'));
        expect(recorder.log.map(({ type }) => type)).toEqual([
            'visibilitychange',
            'pageshow',
            'orientationchange',
            'resize',
        ]);
        expect(recorder.log.at(-1)).toEqual({
            t: 1000,
            type: 'resize',
            detail: `inner ${window.innerWidth}x${window.innerHeight}`,
        });
    });

    it('should log visual viewport resize and scroll', () => {
        const vv = Object.assign(new EventTarget(), {
            width: 393,
            height: 735,
            offsetTop: 0,
            pageTop: 0,
            scale: 1,
        });
        vi.stubGlobal('visualViewport', vv);
        recorder.start();
        vv.dispatchEvent(new Event('resize'));
        vv.dispatchEvent(new Event('scroll'));
        expect(recorder.log.map(({ type, detail }) => `${type} ${detail}`)).toEqual([
            'vv.scroll vv 393x735 top 0 pageTop 0 scale 1',
            'vv.resize vv 393x735 top 0 pageTop 0 scale 1',
        ]);
    });

    it('should log every change of the fit key and count them per second', () => {
        setInnerWidth(393);
        recorder.start();
        setInnerWidth(400);
        clock = 1100;
        recorder.poll();
        setInnerWidth(393);
        clock = 1200;
        recorder.poll();
        const [latest] = recorder.log;
        expect(latest?.type).toBe('key');
        expect(latest?.detail).toMatch(/^400 \S+ 0 0 → 393 \S+ 0 0$/);
        expect(recorder.flicker()).toEqual({ keyNow: 2, keyMax: 2, fitNow: 0, fitMax: 0 });
        clock = 3000;
        expect(recorder.flicker().keyNow).toBe(0);
        expect(recorder.flicker().keyMax).toBe(2);
    });

    it('should log when the stage frame gets a new fit', () => {
        recorder.start();
        const frame = document.createElement('div');
        frame.className = 'stage-frame';
        frame.style.setProperty('--u', '0.36px');
        document.body.append(frame);
        recorder.poll();
        expect(recorder.log[0]).toMatchObject({ type: 'fit', detail: '- → 0.36px - - - -' });
        expect(recorder.flicker().fitNow).toBe(1);
    });

    it('should measure at once, +500 ms and +2000 ms when turned on after load', () => {
        vi.useFakeTimers();
        recorder.start();
        vi.advanceTimersByTime(2000);
        expect(recorder.load.map(({ label }) => label)).toEqual([
            'enabled',
            'enabled +500ms',
            'enabled +2000ms',
        ]);
    });

    it('should measure at DOMContentLoaded when it starts during load', () => {
        vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
        recorder.start();
        expect(recorder.load).toEqual([]);
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(recorder.load[0]?.label).toBe('DOMContentLoaded');
    });

    // module script 係 deferred：行嗰陣 readyState 已經係 interactive，DOMContentLoaded 仲未 fire
    it.each([
        [0, []],
        [120, ['enabled']],
    ])(
        'should wait for DOMContentLoaded while interactive only if it has not fired (start %d)',
        (domContentLoadedEventStart, labels) => {
            vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
            vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
                { domContentLoadedEventStart } as unknown as PerformanceEntry,
            ]);
            recorder.start();
            expect(recorder.load.map(({ label }) => label)).toEqual(labels);
        },
    );

    it('should clear the log and the counts and notify', () => {
        const listener = vi.fn();
        recorder.subscribe(listener);
        recorder.start();
        window.dispatchEvent(new Event('resize'));
        recorder.clear();
        expect(recorder.log).toEqual([]);
        expect(recorder.flicker()).toEqual({ keyNow: 0, keyMax: 0, fitNow: 0, fitMax: 0 });
        expect(listener).toHaveBeenCalled();
    });

    it('should put everything in the report', () => {
        recorder.start();
        expect(recorder.report()).toMatch(/^R Gram viewport diag v.+\nUA .+\n\[live @ \+1000ms\]/);
    });

    it('should remove its listeners and probes when stopped', () => {
        recorder.start();
        recorder.stop();
        window.dispatchEvent(new Event('resize'));
        expect(recorder.log).toEqual([]);
        expect(document.querySelector('[data-diag="probes"]')).toBeNull();
    });
});
