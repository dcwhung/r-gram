import { PLAY_MODE_STORAGE_KEY } from '../config/storageKeys';
import { nextPlayMode, PLAY_MODES, readPlayMode, writePlayMode } from './playModes';

const memoryStorage = () => {
    const items = new Map<string, string>();
    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
        items,
    };
};

describe('play modes', () => {
    // 設計稿第 20 版 MODES；Functional Spec「播放模式」：每㩒一下轉一個
    it('should cycle order → all → one → shuffle → order', () => {
        expect(PLAY_MODES).toEqual(['order', 'all', 'one', 'shuffle']);
        expect(PLAY_MODES.map(nextPlayMode)).toEqual(['all', 'one', 'shuffle', 'order']);
    });

    // Functional Spec「播放模式」儲存：本機，重開 app 保持；Technical Spec `rgram.playMode.v1`
    it('should keep the mode on this device in the documented shape', () => {
        const storage = memoryStorage();
        writePlayMode(storage, 'one');
        expect(JSON.parse(storage.items.get(PLAY_MODE_STORAGE_KEY) ?? '')).toEqual({
            shuffle: false,
            repeat: 'one',
        });
        expect(readPlayMode(storage)).toBe('one');
        writePlayMode(storage, 'shuffle');
        expect(readPlayMode(storage)).toBe('shuffle');
        writePlayMode(storage, 'all');
        expect(readPlayMode(storage)).toBe('all');
    });

    it('should fall back to order when nothing or something broken is stored', () => {
        const storage = memoryStorage();
        expect(readPlayMode(storage)).toBe('order');
        storage.items.set(PLAY_MODE_STORAGE_KEY, '{not json');
        expect(readPlayMode(storage)).toBe('order');
        storage.items.set(PLAY_MODE_STORAGE_KEY, JSON.stringify({ shuffle: 'yes', repeat: 2 }));
        expect(readPlayMode(storage)).toBe('order');
        expect(readPlayMode(null)).toBe('order');
    });

    it('should not throw when the storage is blocked', () => {
        const blocked = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
        };
        expect(readPlayMode(blocked)).toBe('order');
        expect(() => writePlayMode(blocked, 'all')).not.toThrow();
        expect(() => writePlayMode(null, 'all')).not.toThrow();
    });
});
