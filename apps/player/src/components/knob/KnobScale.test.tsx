import { render } from '@testing-library/react';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { KnobScale } from './KnobScale';

const ticks = (positions: number, current: number) => [
    ...render(
        <svg>
            <KnobScale layout={LAYOUT} positions={positions} current={current} accent="#c8442b" />
        </svg>,
    ).container.querySelectorAll('[data-part="scale-tick"]'),
];

/* 設計稿 knobScale()：每格一條刻度線（連 ♥ 嗰格），每 4 格一條長線，而家嗰格用專輯色 */
describe('KnobScale', () => {
    it('should draw one tick per position, the ♥ position included', () => {
        expect(ticks(22, 10)).toHaveLength(22);
        expect(ticks(1, 0)).toHaveLength(1);
    });

    it('should colour and lengthen the tick of the current disc', () => {
        const all = ticks(22, 10);
        expect(all[10]).toHaveAttribute('stroke', '#c8442b');
        expect(all[10]).toHaveAttribute('data-on', 'true');
        expect(all[9]).not.toHaveAttribute('stroke', '#c8442b');
    });

    it('should make every fourth tick long', () => {
        const all = ticks(22, 10);
        expect(all[8]).toHaveAttribute('data-long', 'true');
        expect(all[9]).toHaveAttribute('data-long', 'false');
    });

    // 第一條喺 185°（左邊、少少向上），最尾一條（♥）喺 376.25°
    it('should start the scale at 185° and end it at 376.25°', () => {
        const all = ticks(22, 10);
        const first = all[0]?.getAttribute('d') ?? '';
        const [x1, y1] = first.slice(1).split(/[L ]/).map(Number);
        expect(x1).toBeCloseTo(LAYOUT.knob.x + 92 * Math.cos((185 * Math.PI) / 180), 0);
        expect(y1).toBeCloseTo(LAYOUT.knob.y + 92 * Math.sin((185 * Math.PI) / 180), 0);
    });
});
