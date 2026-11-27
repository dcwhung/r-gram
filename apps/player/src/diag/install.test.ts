import { act, screen } from '@testing-library/react';
import { installDiag, isDiagOpen } from './install';
import { DIAG_STORAGE_KEY } from './storage';

const LABEL = { left: 300, top: 50, right: 340, bottom: 60, width: 40, height: 10, x: 300, y: 50 };

const addVersionLabel = () => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('data-part', 'version');
    label.getBoundingClientRect = () => ({ ...LABEL, toJSON: () => LABEL });
    document.body.append(label);
};

const tap = (x: number, y: number, times = 1) =>
    act(() => {
        for (let index = 0; index < times; index += 1) {
            document.dispatchEvent(
                new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }),
            );
        }
    });

describe('installDiag', () => {
    let uninstall: () => void = () => undefined;

    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', () => 1);
        vi.stubGlobal('cancelAnimationFrame', () => undefined);
    });

    afterEach(() => {
        act(() => uninstall());
        document.body.replaceChildren();
    });

    it('should add nothing to the page while off', () => {
        uninstall = installDiag();
        expect(document.querySelector('[data-diag]')).toBeNull();
        expect(isDiagOpen()).toBe(false);
    });

    it('should open on five taps on the version label and remember it', () => {
        addVersionLabel();
        uninstall = installDiag();
        tap(320, 55, 4);
        expect(isDiagOpen()).toBe(false);
        tap(320, 55);
        expect(isDiagOpen()).toBe(true);
        expect(screen.getByRole('region', { name: '畫面尺寸診斷' })).toBeInTheDocument();
        expect(localStorage.getItem(DIAG_STORAGE_KEY)).toBe('1');
    });

    it('should close on five more taps and forget it', () => {
        addVersionLabel();
        uninstall = installDiag();
        tap(320, 55, 10);
        expect(isDiagOpen()).toBe(false);
        expect(document.querySelector('[data-diag]')).toBeNull();
        expect(localStorage.getItem(DIAG_STORAGE_KEY)).toBeNull();
    });

    it('should ignore taps away from the label or without a label', () => {
        uninstall = installDiag();
        tap(320, 55, 5);
        addVersionLabel();
        tap(100, 55, 5);
        expect(isDiagOpen()).toBe(false);
    });

    it('should open at launch when it was on, and close from its own button', () => {
        localStorage.setItem(DIAG_STORAGE_KEY, '1');
        act(() => {
            uninstall = installDiag();
        });
        expect(isDiagOpen()).toBe(true);
        act(() => screen.getByRole('button', { name: '關閉' }).click());
        expect(isDiagOpen()).toBe(false);
        expect(localStorage.getItem(DIAG_STORAGE_KEY)).toBeNull();
    });
});
