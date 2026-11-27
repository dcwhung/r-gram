import { createProbes, readFit, readFitKey, takeSnapshot } from './measure';

const addFrame = () => {
    const frame = document.createElement('div');
    frame.className = 'stage-frame';
    frame.style.setProperty('--u', '0.3639px');
    frame.style.setProperty('--stage-height-units', '2011.4');
    frame.style.setProperty('--stage-offset-y', '59px');
    frame.style.setProperty('--stage-bleed-top', '162.1');
    document.body.append(frame);
    return frame;
};

describe('diag measure', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    it('should add one hidden probe per supported unit plus the safe-area probe', () => {
        vi.stubGlobal('CSS', { supports: (_: string, value: string) => value !== '100svh' });
        const probes = createProbes();
        expect(probes.host.parentElement).toBe(document.body);
        expect(probes.host.getAttribute('aria-hidden')).toBe('true');
        expect(probes.units.svh).toBeNull();
        expect(probes.units.dvh?.style.height).toBe('100dvh');
        expect(probes.host.children).toHaveLength(5);
        expect(probes.safe.style.visibility).toBe('hidden');
    });

    it('should report null for an unsupported unit and the boxes that exist', () => {
        vi.stubGlobal('CSS', { supports: (_: string, value: string) => value !== '100lvh' });
        const snapshot = takeSnapshot(createProbes(), 42);
        expect(snapshot.t).toBe(42);
        expect(snapshot.units.lvh).toBeNull();
        expect(snapshot.units.vh).toBe(0);
        expect(snapshot.boxes.html).toEqual({ height: 0, top: 0, bottom: 0 });
        expect(snapshot.boxes['.stage']).toBeNull();
        expect(snapshot.fit).toBeNull();
        expect(snapshot.safe).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });

    it('should read the device facts', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('standalone') }));
        const snapshot = takeSnapshot(createProbes(), 0);
        expect(snapshot.displayMode).toBe('standalone');
        expect(snapshot.navStandalone).toBe('undefined');
        expect(snapshot.inner).toEqual([window.innerWidth, window.innerHeight]);
    });

    it('should show a dash when matchMedia is missing', () => {
        vi.stubGlobal('matchMedia', undefined);
        expect(takeSnapshot(createProbes(), 0).displayMode).toBe('-');
    });

    it('should read the visual viewport when there is one', () => {
        const vv = { width: 393, height: 735, offsetTop: 0, pageTop: 0, scale: 1 };
        vi.stubGlobal('visualViewport', vv);
        expect(takeSnapshot(createProbes(), 0).vv).toEqual(vv);
    });

    it('should read the fit the stage wrote on its frame', () => {
        addFrame();
        expect(readFit()).toEqual({
            u: '0.3639px',
            heightUnits: '2011.4',
            offsetY: '59px',
            bleedTop: '162.1',
            bleedBottom: '-',
        });
    });

    it('should build the same key as useStageFit', () => {
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            paddingTop: '59px',
            paddingBottom: '34px',
        } as CSSStyleDeclaration);
        expect(readFitKey()).toBe(`${window.innerWidth} ${window.innerHeight} 59 34`);
    });
});

describe('diag stage height', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    it('should report the height source the stage uses', () => {
        vi.stubGlobal('matchMedia', () => ({ matches: false }));
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(735);
        expect(takeSnapshot(createProbes(), 0).stageHeight).toEqual({
            source: 'inner',
            height: 735,
        });
    });
});
