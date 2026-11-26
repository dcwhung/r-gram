/* updated_at 一定向前行（If-Match 用；CR-007 之後專輯冇寫入 API，剩低歌曲文字同同步用） */
import { nextUpdatedAt } from '../src/lib/updatedAt';
import { NOW } from './albumFixtures';

describe('nextUpdatedAt', () => {
    const now = new Date('2026-11-25T08:00:00.000Z');

    it('should use the current time when it is later than the previous value', () => {
        expect(nextUpdatedAt(NOW, now)).toBe('2026-11-25T08:00:00.000Z');
    });

    it('should move 1 ms past a previous value in the same or a later millisecond', () => {
        expect(nextUpdatedAt('2026-11-25T08:00:00.000Z', now)).toBe('2026-11-25T08:00:00.001Z');
        expect(nextUpdatedAt('2026-11-25T09:00:00.000Z', now)).toBe('2026-11-25T09:00:00.001Z');
    });

    it('should fall back to the current time without a readable previous value', () => {
        expect(nextUpdatedAt(undefined, now)).toBe(now.toISOString());
        expect(nextUpdatedAt('not a date', now)).toBe(now.toISOString());
    });
});
