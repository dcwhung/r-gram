import { COVER_VARIANT, coverVariantOf, pickCoverVariants } from './coverVariants';
import { makeAlbum, withSecondCover } from './testing/catalogFixtures';

/* Functional Spec D56、FR-042；Technical Spec「播放端隨機封面」 */
describe('pickCoverVariants', () => {
    const single = makeAlbum('room', []);
    const double = withSecondCover(makeAlbum('komorebi', []));

    it('should always pick the first cover for an album without a second cover', () => {
        const random = vi.fn(() => 0.9);
        const picks = pickCoverVariants([single], random);
        expect(picks.get('room')).toBe(COVER_VARIANT.FIRST);
        expect(random).not.toHaveBeenCalled();
    });

    it('should pick the first cover when the random number is below one half', () => {
        expect(pickCoverVariants([double], () => 0.49).get('komorebi')).toBe(COVER_VARIANT.FIRST);
    });

    it('should pick the second cover when the random number is one half or more', () => {
        expect(pickCoverVariants([double], () => 0.5).get('komorebi')).toBe(COVER_VARIANT.SECOND);
    });

    it('should keep earlier picks when the catalog is refreshed', () => {
        const before = pickCoverVariants([double], () => 0.9);
        const random = vi.fn(() => 0);
        const after = pickCoverVariants([double, single], random, before);
        expect(after.get('komorebi')).toBe(COVER_VARIANT.SECOND);
        expect(random).not.toHaveBeenCalled();
    });

    it('should pick for albums that are new in a refreshed catalog', () => {
        const before = pickCoverVariants([single], () => 0);
        const added = withSecondCover(makeAlbum('ni-dou', []));
        const after = pickCoverVariants([single, added], () => 0.7, before);
        expect(after.get('ni-dou')).toBe(COVER_VARIANT.SECOND);
    });

    // Technical Spec：舊專輯之後先加第二張封面 = 照用第一張，下次開 app 先揀
    it('should keep the first cover for a known album that gains a second cover later', () => {
        const before = pickCoverVariants([single], () => 0);
        const after = pickCoverVariants([withSecondCover(single)], () => 0.9, before);
        expect(after.get('room')).toBe(COVER_VARIANT.FIRST);
    });

    it('should drop picks of albums that are no longer in the catalog', () => {
        const before = pickCoverVariants([double], () => 0.9);
        expect(pickCoverVariants([single], () => 0, before).has('komorebi')).toBe(false);
    });
});

describe('coverVariantOf', () => {
    it('should fall back to the first cover for an album without a pick', () => {
        expect(coverVariantOf(new Map(), 'room')).toBe(COVER_VARIANT.FIRST);
    });

    it('should return the pick of the album', () => {
        expect(coverVariantOf(new Map([['room', COVER_VARIANT.SECOND]]), 'room')).toBe(
            COVER_VARIANT.SECOND,
        );
    });
});
