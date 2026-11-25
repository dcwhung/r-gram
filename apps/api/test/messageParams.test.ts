/*
 * backlog B-045 ②：語言檔句子嘅 `{max}` 呢類佔位，漏咗參數就會原樣出現喺用戶見到嘅訊息。
 * 行勻每個 reason / 情況嘅 message builder，確認冇 `{` / `}` 剩低
 */
import { reasonMessage } from '../src/albums/errors';
import {
    assetErrorMessage,
    assetReasonMessage,
    type AssetReason,
    type AssetSituation,
} from '../src/assets/errors';
import type { Reason } from '../src/albums/fieldRules';
import { zhHant } from '../src/i18n/zh-Hant';
import { trackErrorMessage, trackReasonMessage } from '../src/tracks/errors';
import type { TrackReason, TrackSituation } from '../src/tracks/errors';

const BRACE = /[{}]/;

describe('locale messages after filling parameters', () => {
    it('should leave no placeholder in any album reason message', () => {
        const reasons = Object.keys(zhHant.albums.reasons) as Reason[];
        expect(reasons.length).toBeGreaterThan(0);
        for (const reason of reasons) expect(reasonMessage(reason), reason).not.toMatch(BRACE);
    });

    it('should leave no placeholder in any track reason or error message', () => {
        const reasons = Object.keys(zhHant.tracks.reasons) as TrackReason[];
        for (const reason of reasons) expect(trackReasonMessage(reason), reason).not.toMatch(BRACE);
        const situations = Object.keys(zhHant.tracks.errors) as TrackSituation[];
        for (const situation of situations) {
            expect(trackErrorMessage(situation), situation).not.toMatch(BRACE);
        }
        for (const hint of Object.values(zhHant.tracks.hints)) expect(hint).not.toMatch(BRACE);
    });

    it('should have no placeholder in messages that are used without parameters', () => {
        const plain = [...Object.values(zhHant.errors), ...Object.values(zhHant.albums.errors)];
        for (const message of plain) expect(message, message).not.toMatch(BRACE);
    });

    it('should leave no placeholder in any asset error or reason message', () => {
        const situations = Object.keys(zhHant.assets.errors) as AssetSituation[];
        for (const situation of situations) {
            expect(assetErrorMessage(situation), situation).not.toMatch(BRACE);
        }
        const reasons = Object.keys(zhHant.assets.reasons) as AssetReason[];
        for (const reason of reasons) expect(assetReasonMessage(reason), reason).not.toMatch(BRACE);
    });
});
