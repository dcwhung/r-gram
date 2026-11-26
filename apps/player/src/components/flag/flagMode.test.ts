import { initialFlagMode, nextFlagMode } from './flagMode';

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」：WebGL → 2D 靜止一格；唔 throw */
describe('flag mode', () => {
    it('should try the waving WebGL flag unless reduced motion is requested', () => {
        expect(initialFlagMode(false)).toBe('live');
        expect(initialFlagMode(true)).toBe('still');
    });

    it('should fall back to one still frame when WebGL fails or its context is lost', () => {
        expect(nextFlagMode('live', 'gl-failed')).toBe('still');
        expect(nextFlagMode('live', 'context-lost')).toBe('still');
    });

    it('should stay still once still, even when the context comes back (Preload is short)', () => {
        expect(nextFlagMode('still', 'context-restored')).toBe('still');
        expect(nextFlagMode('still', 'context-lost')).toBe('still');
        expect(nextFlagMode('live', 'context-restored')).toBe('live');
    });
});
