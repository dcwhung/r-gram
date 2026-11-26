import { isLatin } from './isLatin';

describe('isLatin', () => {
    it.each(['A', 'KOMOREBI', 'Apollo 18', 'R'])('should treat %s as Latin', (text) => {
        expect(isLatin(text)).toBe(true);
    });

    it.each(['呢', '在', '終於好天氣', 'Frank 呢', ''])(
        'should not treat "%s" as Latin',
        (text) => {
            expect(isLatin(text)).toBe(false);
        },
    );
});
