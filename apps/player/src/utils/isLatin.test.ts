import { isLatin } from './isLatin';

describe('isLatin', () => {
    it.each(['A', 'KOMOREBI', 'Apollo 18', 'R'])('should treat %s as Latin', (text) => {
        expect(isLatin(text)).toBe(true);
    });

    /* 用戶真機（2026-11-27）：info.txt 嘅「Dedicated To…」用咗省略號一個字元，成個碟名變咗中文粗體 */
    it.each(['Dedicated To…', 'Rock ’n’ Roll', '“Quoted”', 'Night – Day', 'Café', '9· Live'])(
        'should treat Latin typography "%s" as Latin',
        (text) => {
            expect(isLatin(text)).toBe(true);
        },
    );

    it.each(['呢', '在', '終於好天氣', 'Frank 呢', '', '　', 'A、B', 'Live！'])(
        'should not treat "%s" as Latin',
        (text) => {
            expect(isLatin(text)).toBe(false);
        },
    );
});
