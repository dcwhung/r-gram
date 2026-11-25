import { LATHE_WEDGES, latheWedges } from './lathe';

describe('latheWedges', () => {
    const wedges = latheWedges();

    it('should cover the full circle with the configured number of wedges', () => {
        expect(wedges).toHaveLength(LATHE_WEDGES);
        expect(LATHE_WEDGES).toBe(96);
    });

    it('should draw each wedge from the centre on the unit circle', () => {
        expect(
            wedges.every(({ d }) =>
                /^M0 0L-?[\d.]+ -?[\d.]+A1 1 0 0 1 -?[\d.]+ -?[\d.]+Z$/.test(d),
            ),
        ).toBe(true);
    });

    // 明暗公式同設計稿 buildLathe() 一樣：0.76 + 0.15cos(2a) + 0.045cos(6a + 40°) + 0.02cos(14a)
    it('should shade the wedges with the brushed-metal pattern of the mockup', () => {
        expect(wedges[0]?.fill).toBe('rgb(246,246,246)');
        expect(wedges[24]?.fill).toBe('rgb(146,146,146)');
        const levels = wedges.map(({ fill }) => Number(/rgb\((\d+)/.exec(fill)?.[1]));
        expect(Math.min(...levels)).toBeGreaterThan(130);
        expect(Math.max(...levels)).toBeLessThanOrEqual(255);
    });
});
