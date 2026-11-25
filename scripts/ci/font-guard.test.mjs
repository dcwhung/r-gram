/*
 * 字體守衛（W-027）：repo 係公開嘅，入面只可以有兩個 Rokkitt 字體檔（SIL OFL）。
 * 用戶自己嘅商業字體（ITC Lubalin Graph）永遠唔可以 commit：放喺邊個資料夾都唔得。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALLOWED_FONTS, findStrayFonts, isFontFile } from './font-guard.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const trackedFiles = () =>
    execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\0')
        .filter(Boolean);
const sha256 = (path) =>
    createHash('sha256')
        .update(readFileSync(new URL(path, `file://${REPO_ROOT}`)))
        .digest('hex');

describe('font guard', () => {
    it('should recognise font files by extension, whatever the case', () => {
        for (const path of ['a.otf', 'x/b.TTF', 'c.woff', 'd.Woff2', 'e.eot', 'f.ttc']) {
            expect(isFontFile(path), path).toBe(true);
        }
        for (const path of ['fonts.css', 'OFL.txt', 'otf', 'a.otf.md', 'woff2/readme']) {
            expect(isFontFile(path), path).toBe(false);
        }
    });

    it('should report every font file that is not one of the two bundled Rokkitt files', () => {
        const allowed = Object.keys(ALLOWED_FONTS);
        expect(findStrayFonts([...allowed, 'README.md'])).toEqual([]);
        expect(
            findStrayFonts([
                ...allowed,
                'apps/player/public/fonts/lubalin.woff2',
                'apps/player/src/assets/lubalin.otf',
                '_design_/ITC_Lubalin_Graph_Std_Book.otf',
            ]),
        ).toEqual([
            'apps/player/public/fonts/lubalin.woff2',
            'apps/player/src/assets/lubalin.otf',
            '_design_/ITC_Lubalin_Graph_Std_Book.otf',
        ]);
    });

    it('should find no stray font file anywhere in the repository', () => {
        expect(findStrayFonts(trackedFiles())).toEqual([]);
    });

    it('should keep the two bundled fonts byte-identical to the verified Rokkitt files', () => {
        for (const [path, hash] of Object.entries(ALLOWED_FONTS)) {
            expect(sha256(path), path).toBe(hash);
        }
    });
});
