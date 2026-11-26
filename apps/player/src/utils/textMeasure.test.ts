import { createTextMeasure, estimateTextWidth, type TextFont } from './textMeasure';

const font = (overrides: Partial<TextFont> = {}): TextFont => ({
    family: 'cjk',
    size: 44,
    weight: 700,
    spacing: 0,
    ...overrides,
});

describe('estimateTextWidth', () => {
    // 同設計稿 textWidth()：中文字 = 一個字級，其他 = 0.56 個字級，每個字加字距
    it('should count a CJK character as one em and anything else as 0.56 em', () => {
        expect(estimateTextWidth('我永遠記得', font())).toBe(220);
        expect(estimateTextWidth('ABCD', font({ size: 100 }))).toBeCloseTo(224);
        expect(estimateTextWidth('2026', font({ size: 29, spacing: 6 }))).toBeCloseTo(
            4 * (29 * 0.56 + 6),
        );
    });
});

describe('createTextMeasure', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('should fall back to the estimate where no canvas is available', () => {
        vi.stubGlobal('OffscreenCanvas', undefined);
        const measure = createTextMeasure();
        expect(measure('我永遠記得', font())).toBe(220);
    });

    it('should measure with a canvas in the font of the text and add the spacing per character', () => {
        const fonts: string[] = [];
        const context = {
            font: '',
            measureText(text: string) {
                fonts.push(this.font);
                return { width: text.length * 10 };
            },
        };
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext() {
                    return context;
                }
            },
        );
        document.documentElement.style.setProperty('--font-slab', "'Rokkitt', serif");
        const measure = createTextMeasure();
        expect(measure('KOMO', font({ family: 'slab', size: 88, weight: 400, spacing: 1 }))).toBe(
            44,
        );
        expect(fonts).toEqual(["400 88px 'Rokkitt', serif"]);
        document.documentElement.style.removeProperty('--font-slab');
    });

    // W-043：字體 stack 每款字讀一次 getComputedStyle（歌單欄一次過量幾十行）
    it('should read the font stack of each family only once', () => {
        const context = { font: '', measureText: (text: string) => ({ width: text.length }) };
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext() {
                    return context;
                }
            },
        );
        const computed = vi.spyOn(window, 'getComputedStyle');
        const measure = createTextMeasure();
        ['A', 'B', 'C'].forEach((text) => measure(text, font({ family: 'mixed' })));
        measure('D', font({ family: 'slab' }));
        expect(computed).toHaveBeenCalledTimes(2);
        computed.mockRestore();
    });

    it('should fall back to the estimate when the canvas has no 2D context', () => {
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext() {
                    return null;
                }
            },
        );
        expect(createTextMeasure()('ABCD', font({ size: 100 }))).toBeCloseTo(224);
    });
});
