import { DIAG_STORAGE_KEY, readDiagFlag, writeDiagFlag } from './storage';

describe('diag flag storage', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be off when nothing is stored', () => {
        expect(readDiagFlag()).toBe(false);
    });

    it('should remember on and off under rgram.diag.v1', () => {
        writeDiagFlag(true);
        expect(DIAG_STORAGE_KEY).toBe('rgram.diag.v1');
        expect(localStorage.getItem(DIAG_STORAGE_KEY)).toBe('1');
        expect(readDiagFlag()).toBe(true);
        writeDiagFlag(false);
        expect(localStorage.getItem(DIAG_STORAGE_KEY)).toBeNull();
        expect(readDiagFlag()).toBe(false);
    });

    it('should treat a storage that throws as off and not throw on write', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readDiagFlag()).toBe(false);
        expect(() => writeDiagFlag(true)).not.toThrow();
    });
});
