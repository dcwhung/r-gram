import { planAlbumSeed, type ExistingAlbum } from './planAlbumSeed';
import type { SeedAlbum } from './types';

const album = (id: string, categoryNo: number, extra: Partial<SeedAlbum> = {}): SeedAlbum => ({
    order: categoryNo - 1,
    id,
    category: 'album',
    categoryNo,
    wheelKey: 'A',
    title: `Album ${id}`,
    year: 2008,
    label: '',
    tracks: [],
    ...extra,
});

const existing = (id: string, categoryNo: number, category = 'album'): ExistingAlbum =>
    ({ id, category, categoryNo }) as ExistingAlbum;

describe('planAlbumSeed', () => {
    it('should insert every album when the database is empty', () => {
        const plan = planAlbumSeed([album('apollo-18', 1), album('beaming', 2)], []);
        expect(plan.insert.map(({ id }) => id)).toEqual(['apollo-18', 'beaming']);
        expect(plan.existing).toEqual([]);
        expect(plan.ordinalTaken).toEqual([]);
    });

    it('should leave albums whose id already exists untouched', () => {
        const plan = planAlbumSeed(
            [album('apollo-18', 1), album('beaming', 2)],
            [existing('apollo-18', 1)],
        );
        expect(plan.insert.map(({ id }) => id)).toEqual(['beaming']);
        expect(plan.existing).toEqual(['apollo-18']);
    });

    it('should skip and report an album whose ordinal another album already uses', () => {
        const plan = planAlbumSeed([album('beaming', 2)], [existing('my-album', 2)]);
        expect(plan.insert).toEqual([]);
        expect(plan.ordinalTaken).toEqual([
            { id: 'beaming', category: 'album', categoryNo: 2, takenBy: 'my-album' },
        ]);
    });

    it('should compare ordinals within the same category only', () => {
        const plan = planAlbumSeed(
            [album('frank-ep', 1, { category: 'ep' })],
            [existing('apollo-18', 1)],
        );
        expect(plan.insert.map(({ id }) => id)).toEqual(['frank-ep']);
    });

    it('should keep the existing id rule ahead of the ordinal rule', () => {
        // 管理端改過序號嘅專輯：id 一樣就當已有，唔報撞號
        const plan = planAlbumSeed([album('apollo-18', 1)], [existing('apollo-18', 5)]);
        expect(plan.existing).toEqual(['apollo-18']);
        expect(plan.ordinalTaken).toEqual([]);
    });

    it('should let the first of two clashing seed albums win', () => {
        const plan = planAlbumSeed([album('first', 3), album('second', 3)], []);
        expect(plan.insert.map(({ id }) => id)).toEqual(['first']);
        expect(plan.ordinalTaken).toEqual([
            { id: 'second', category: 'album', categoryNo: 3, takenBy: 'first' },
        ]);
    });
});
