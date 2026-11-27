import { formatFlicker, formatNumber, formatReport, formatSnapshot } from './format';
import type { Snapshot } from './snapshot';

const box = (height: number, top: number) => ({ height, top, bottom: top + height });

const SNAPSHOT: Snapshot = {
    t: 120.4,
    displayMode: 'standalone',
    navStandalone: 'true',
    dpr: 3,
    orientation: 'portrait-primary',
    windowOrientation: '0',
    screen: [393, 852],
    inner: [393, 852],
    client: [393, 852],
    vv: { width: 393, height: 852, offsetTop: 0, pageTop: 0, scale: 1 },
    units: { vh: 852, svh: 793, lvh: 852, dvh: 852, fill: null },
    boxes: {
        html: box(852, 0),
        body: box(852, 0),
        '#root': box(852, 0),
        '.stage-frame': box(852, 0),
        '.stage': box(732.456, 59),
    },
    safe: { top: 59, right: 0, bottom: 34, left: 0 },
    fit: {
        u: '0.3639px',
        heightUnits: '2011.4',
        offsetY: '59px',
        bleedTop: '162.1',
        bleedBottom: '93.4',
    },
    fitKey: '393 852 59 34',
};

const BEFORE_REACT: Snapshot = {
    ...SNAPSHOT,
    vv: null,
    boxes: { ...SNAPSHOT.boxes, '.stage-frame': null, '.stage': null },
    fit: null,
};

describe('formatNumber', () => {
    it.each([
        [3, '3'],
        [732.456, '732.46'],
        [0.1, '0.1'],
        [null, '-'],
        [undefined, '-'],
        [Number.NaN, '-'],
    ])('should show %s as %j', (value, text) => {
        expect(formatNumber(value)).toBe(text);
    });
});

describe('formatSnapshot', () => {
    it('should show every measurement on its own short line', () => {
        expect(formatSnapshot(SNAPSHOT)).toEqual([
            'mode standalone | nav.standalone true | dpr 3',
            'orientation portrait-primary | window.orientation 0',
            'screen 393x852 | inner 393x852 | client 393x852',
            'vv 393x852 top 0 pageTop 0 scale 1',
            'units vh 852 | svh 793 | lvh 852 | dvh 852 | fill -',
            'html 852 [0, 852] | body 852 [0, 852] | #root 852 [0, 852]',
            '.stage-frame 852 [0, 852] | .stage 732.46 [59, 791.46]',
            'safe env t 59 | r 0 | b 34 | l 0',
            'fit u 0.3639px | heightUnits 2011.4 | offsetY 59px | bleedTop 162.1 | bleedBottom 93.4',
            'key 393 852 59 34',
        ]);
    });

    it('should show a dash for what is not there yet', () => {
        const lines = formatSnapshot(BEFORE_REACT);
        expect(lines[3]).toBe('vv -');
        expect(lines[6]).toBe('.stage-frame - | .stage -');
        expect(lines[8]).toBe('fit -');
    });
});

describe('formatFlicker', () => {
    it('should show the changes in the last second and the most seen', () => {
        expect(formatFlicker({ keyNow: 0, keyMax: 3, fitNow: 1, fitMax: 2 })).toBe(
            'fit key changes/s 0 (max 3) | fit applied/s 1 (max 2)',
        );
    });
});

describe('formatReport', () => {
    it('should put the live values, the load snapshots and the log in one text', () => {
        const text = formatReport({
            version: '0.1.0',
            userAgent: 'UA-TEST',
            live: { ...SNAPSHOT, t: 5000 },
            load: [{ label: 'DOMContentLoaded', snapshot: BEFORE_REACT }],
            flicker: { keyNow: 0, keyMax: 0, fitNow: 0, fitMax: 0 },
            log: [{ t: 10, type: 'pageshow', detail: 'persisted false' }],
        });
        const lines = text.split('\n');
        expect(lines.slice(0, 3)).toEqual([
            'R Gram viewport diag v0.1.0',
            'UA UA-TEST',
            '[live @ +5000ms]',
        ]);
        expect(lines).toContain('fit key changes/s 0 (max 0) | fit applied/s 0 (max 0)');
        expect(lines).toContain('[DOMContentLoaded @ +120ms]');
        expect(lines.slice(-2)).toEqual(['[log 1]', '+10ms pageshow persisted false']);
        expect(lines.filter((line) => line.startsWith('mode '))).toHaveLength(2);
    });
});
