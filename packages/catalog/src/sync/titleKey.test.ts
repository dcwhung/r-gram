import { titleKey } from './titleKey';

describe('titleKey', () => {
    it.each([
        ['太平門', '太平門'],
        ['G’night', "g'night"],
        ['G‘night', "g'night"],
        ['“Live”', 'live'],
        ['„Live‟', 'live'],
        ['搲撈ＨＫ', '搲撈hk'],
        ['Ｇ’ｎｉｇｈｔ', "g'night"],
        ['  Simple Love  Song ', 'simplelovesong'],
        ['一　杯', '一杯'],
        ['ﾃﾞｨｽｸ', 'ディスク'],
    ])('should make %j into %j', (title, key) => {
        expect(titleKey(title)).toBe(key);
    });

    it('should match titles that differ only in width, case, spaces and quote style', () => {
        expect(titleKey('G’night')).toBe(titleKey("g'NIGHT"));
        expect(titleKey('搲撈 HK')).toBe(titleKey('搲撈ＨＫ'));
    });

    // S-157：檔名唔可以有 `/ \\ : * ? " < > |`（同佢哋嘅全形）；比較時略過，歌名同檔名先對得上
    it.each([
        ['Re: SimpleLoveSong', 'Re SimpleLoveSong'],
        ['¿醒未?', '¿醒未'],
        ['一早地下鐵 / 幾分鐘的約會', '一早地下鐵  幾分鐘的約會'],
        ['A\\B*C"D<E>F|G', 'ABCDEFG'],
        ['Ｒｅ：Ａ？／＊＜＞｜＼＂', 'Re A'],
        ['“Live”', 'Live'],
    ])('should match %j with the file-name form %j', (title, fileTitle) => {
        expect(titleKey(title)).toBe(titleKey(fileTitle));
    });

    it('should tell different titles apart', () => {
        expect(titleKey('太平門')).not.toBe(titleKey('太平門 (Live)'));
    });

    it('should match decomposed (NFD) and composed (NFC) forms', () => {
        expect(titleKey('Café')).toBe(titleKey('Café'));
    });
});
