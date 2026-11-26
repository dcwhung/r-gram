import { clockTime, summaryText, upsertResult, type ResultEntry } from './summary';

// 2026-11-26 10:20:30.456 本地時間
const AT = new Date(2026, 10, 26, 10, 20, 30, 456).getTime();

const entry = (id: string, outcome: ResultEntry['outcome'], detail = ''): ResultEntry => ({
    id,
    label: `項目 ${id}`,
    outcome,
    detail,
    at: AT,
});

describe('clockTime', () => {
    it('should show local hours, minutes, seconds and milliseconds', () => {
        expect(clockTime(AT)).toBe('10:20:30.456');
    });
});

describe('upsertResult', () => {
    it('should replace the entry with the same id and keep the list sorted by id', () => {
        const list = upsertResult(upsertResult([], entry('2a', 'fail')), entry('1a', 'pass'));
        expect(list.map(({ id }) => id)).toEqual(['1a', '2a']);
        const updated = upsertResult(list, entry('2a', 'pass', '再試'));
        expect(updated).toHaveLength(2);
        expect(updated[1]).toMatchObject({ outcome: 'pass', detail: '再試' });
    });
});

describe('summaryText', () => {
    const context = {
        userAgent: 'Mozilla/5.0 (iPhone)',
        standalone: true,
        viewport: '393×852',
        mediaBase: 'https://media.test/',
        now: AT,
    };

    it('should start with the device and page facts', () => {
        const lines = summaryText([], {}, context).split('\n');
        expect(lines.slice(0, 5)).toEqual([
            'R Gram spike（T-010）',
            `時間：${new Date(AT).toISOString()}`,
            '模式：主畫面 App（standalone）',
            '畫面：393×852',
            '瀏覽器：Mozilla/5.0 (iPhone)',
        ]);
        expect(lines).toContain('媒體：https://media.test/');
    });

    it('should say "browser tab" when the page is not standalone', () => {
        expect(summaryText([], {}, { ...context, standalone: false })).toContain(
            '模式：瀏覽器分頁',
        );
    });

    it('should list every result with its outcome, detail and time', () => {
        const text = summaryText(
            [entry('1a', 'pass', '延遲 1503 ms'), entry('4b', 'fail')],
            {},
            context,
        );
        expect(text).toContain('[1a] 項目 1a：通過 — 延遲 1503 ms（10:20:30.456）');
        expect(text).toContain('[4b] 項目 4b：不通過（10:20:30.456）');
    });

    it('should show a value result without pass or fail', () => {
        expect(summaryText([entry('5a', 'value', '58.9 fps')], {}, context)).toContain(
            '[5a] 項目 5a：58.9 fps（10:20:30.456）',
        );
    });

    it('should append each item log under its own heading', () => {
        const text = summaryText([], { '2': ['10:00:00.000 ended'] }, context);
        expect(text).toContain('— 記錄 2 —\n10:00:00.000 ended');
    });

    it('should say when there are no results yet', () => {
        expect(summaryText([], {}, context)).toContain('（未有結果）');
    });
});
