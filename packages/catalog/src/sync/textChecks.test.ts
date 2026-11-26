import { checkOf, CHECKS_MAX } from './checks';
import { carriedChecks, sortChecks, textChecks } from './textChecks';

const KEY = 'album-11-komorebi/05 太平門.txt';
const OTHER = 'album-11-komorebi/06 x.txt';

describe('textChecks', () => {
    it('should list nothing for valid text whose first line matches', () => {
        const read = { title: '太平門', errors: [], hints: [] };
        expect(textChecks({ no: 5, key: KEY, compareTitle: '太平門', read })).toEqual([]);
    });

    it('should report a first line that differs from the title', () => {
        const read = { title: '太平門 (Live)', errors: [], hints: [] };
        expect(textChecks({ no: 5, key: KEY, compareTitle: '太平門', read })).toEqual([
            checkOf(
                'TITLE_MISMATCH',
                { key: KEY, no: 5 },
                { no: 5, title: '太平門', other: '太平門 (Live)' },
            ),
        ]);
        expect(textChecks({ no: 5, key: KEY, compareTitle: null, read })).toEqual([]);
    });

    it('should list each error line and leave the line out for file-level errors', () => {
        const read = {
            title: null,
            errors: [
                { line: 0, reason: 'BAD_ENCODING' },
                { line: 4, reason: 'BAD_TIMESTAMP' },
            ],
            hints: [],
        };
        expect(textChecks({ no: 5, key: KEY, compareTitle: '太平門', read })).toEqual([
            checkOf('TEXT_INVALID', { key: KEY, no: 5 }, { no: 5, reason: 'BAD_ENCODING' }),
            checkOf(
                'TEXT_INVALID',
                { key: KEY, no: 5, line: 4 },
                { no: 5, reason: 'BAD_TIMESTAMP' },
            ),
        ]);
    });

    it('should pass on the subtitle hints', () => {
        const read = {
            title: '太平門',
            errors: [],
            hints: [{ line: 2, code: 'SUBTITLE_IGNORED' as const }],
        };
        expect(textChecks({ no: 5, key: KEY, compareTitle: '太平門', read })).toEqual([
            checkOf('SUBTITLE_IGNORED', { key: KEY, no: 5, line: 2 }, { no: 5 }),
        ]);
    });
});

describe('carriedChecks', () => {
    it('should keep only the content checks of the given files', () => {
        const stored = [
            checkOf(
                'TEXT_INVALID',
                { key: KEY, no: 5, line: 3 },
                { no: 5, reason: 'BAD_TIMESTAMP' },
            ),
            checkOf('TITLE_MISMATCH', { key: OTHER, no: 6 }, { no: 6 }),
            checkOf('AUDIO_CONFLICT', { key: KEY, no: 5 }, { no: 5 }),
            checkOf('NO_INFO'),
        ];
        expect(carriedChecks(stored, new Set([KEY]))).toEqual([stored[0]]);
    });
});

describe('sortChecks', () => {
    it('should put album-level checks first, then by number, file and line', () => {
        const checks = [
            checkOf('TEXT_INVALID', { key: KEY, no: 5, line: 9 }, {}),
            checkOf('TEXT_INVALID', { key: KEY, no: 5, line: 2 }, {}),
            checkOf('AUDIO_NOT_LISTED', { key: 'a/13 x.m4a', no: 13 }, {}),
            checkOf('INFO_NO_TITLE', { key: 'a/info.txt' }),
            checkOf('INFO_UNKNOWN_LINE', { key: 'a/info.txt', line: 3 }),
            checkOf('NO_INFO'),
        ];
        expect(sortChecks(checks).map(({ code, line }) => [code, line])).toEqual([
            ['NO_INFO', undefined],
            ['INFO_UNKNOWN_LINE', 3],
            ['INFO_NO_TITLE', undefined],
            ['TEXT_INVALID', 2],
            ['TEXT_INVALID', 9],
            ['AUDIO_NOT_LISTED', undefined],
        ]);
    });

    it('should keep at most the stored maximum', () => {
        const many = Array.from({ length: CHECKS_MAX + 5 }, (_, line) =>
            checkOf('INFO_UNKNOWN_LINE', { line }),
        );
        expect(sortChecks(many)).toHaveLength(CHECKS_MAX);
    });
});
