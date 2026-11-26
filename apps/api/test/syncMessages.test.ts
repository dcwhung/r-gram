/* 同步檢查結果嘅訊息（T-105；Functional Spec D77）：每個碼都有書面語訊息，參數填得晒 */
import { CHECK_LEVELS, checkOf, type CheckCode } from '@r-gram/catalog';
import { zhHant } from '../src/i18n/zh-Hant';
import { checkMessage } from '../src/sync/checkMessages';

const PARAMS = {
    no: 5,
    title: '太平門',
    other: '太平門 (Live)',
    reason: 'BAD_TIMESTAMP',
    slot: 'cover',
    max: 200,
    maxBytes: 16384,
    maxLines: 1000,
    id: 'x',
    folders: 'album-01-x、ep-01-x',
    folder: 'Album-01-X',
};

describe('sync check messages', () => {
    it('should have a message for every check code', () => {
        expect(Object.keys(zhHant.sync.checks).sort()).toEqual(Object.keys(CHECK_LEVELS).sort());
    });

    it.each(Object.keys(CHECK_LEVELS) as CheckCode[])(
        'should fill every placeholder of %s',
        (code) => {
            const message = checkMessage(checkOf(code, { key: 'a/x', no: 5, line: 3 }, PARAMS));
            expect(message).not.toMatch(/[{}]/);
            expect(message).toMatch(/\p{Script=Han}/u);
        },
    );

    it('should name the line and the reason of a bad song text line', () => {
        const message = checkMessage(
            checkOf('TEXT_INVALID', { no: 5, line: 4 }, { no: 5, reason: 'MIXED_TIMESTAMPS' }),
        );
        expect(message).toContain('4');
        expect(message).toContain(zhHant.tracks.reasons.MIXED_TIMESTAMPS);
    });

    it('should word a file-level song text error without a line', () => {
        const message = checkMessage(
            checkOf('TEXT_INVALID', { no: 5 }, { no: 5, reason: 'BAD_ENCODING' }),
        );
        expect(message).toContain(zhHant.sync.fileReasons.BAD_ENCODING);
    });
});
