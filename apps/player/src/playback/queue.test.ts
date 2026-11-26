import { createQueue, firstTrack, nextTrack, previousTrack, refreshQueue, withMode } from './queue';

const IDS = ['a', 'b', 'c', 'd'] as const;

/** 固定嘅隨機數：每次攞下一個，用完由頭再嚟 */
const sequence = (...values: number[]) => {
    let index = 0;
    return () => {
        const value = values[index % values.length] ?? 0;
        index += 1;
        return value;
    };
};

const ZERO = () => 0;

describe('queue: order (順序播放)', () => {
    const queue = createQueue(IDS, 'order', 'a', ZERO);

    it('should play the next playable track in disc order', () => {
        expect(nextTrack(queue, 'a', 'auto', ZERO).trackId).toBe('b');
        expect(nextTrack(queue, 'c', 'skip', ZERO).trackId).toBe('d');
    });

    it('should stop after the last track (D10, D99)', () => {
        expect(nextTrack(queue, 'd', 'auto', ZERO).trackId).toBeNull();
        expect(nextTrack(queue, 'd', 'skip', ZERO).trackId).toBeNull();
    });

    it('should go back one track and do nothing before the first', () => {
        expect(previousTrack(queue, 'c')).toBe('b');
        expect(previousTrack(queue, 'a')).toBeNull();
    });

    it('should start from the first track when the current one is not in the queue', () => {
        expect(nextTrack(queue, 'gone', 'auto', ZERO).trackId).toBe('a');
    });
});

describe('queue: repeat all (全部重複)', () => {
    const queue = createQueue(IDS, 'all', 'a', ZERO);

    it('should go back to the first track after the last', () => {
        expect(nextTrack(queue, 'd', 'auto', ZERO).trackId).toBe('a');
    });

    it('should wrap to the last track before the first', () => {
        expect(previousTrack(queue, 'a')).toBe('d');
    });
});

describe('queue: repeat one (單曲重複)', () => {
    const queue = createQueue(IDS, 'one', 'b', ZERO);

    it('should play the same track again when it ends', () => {
        expect(nextTrack(queue, 'b', 'auto', ZERO).trackId).toBe('b');
    });

    // US-014：鎖屏㩒下一首／上一首照樣轉歌（同全部重複一樣兜圈）
    it('should still change track on next and previous', () => {
        expect(nextTrack(queue, 'b', 'skip', ZERO).trackId).toBe('c');
        expect(nextTrack(queue, 'd', 'skip', ZERO).trackId).toBe('a');
        expect(previousTrack(queue, 'a')).toBe('d');
    });
});

describe('queue: shuffle (隨機播放)', () => {
    it('should start with the chosen track and play every other track once in the round', () => {
        const queue = createQueue(IDS, 'shuffle', 'c', sequence(0.9, 0.1, 0.5));
        expect(queue.order[0]).toBe('c');
        expect([...queue.order].sort()).toEqual([...IDS]);
        const played = [queue.order[0]];
        let current = queue.order[0] ?? '';
        for (let step = 1; step < IDS.length; step += 1) {
            current = nextTrack(queue, current, 'auto', ZERO).trackId ?? '';
            played.push(current);
        }
        expect(new Set(played).size).toBe(IDS.length);
    });

    it('should reshuffle after a round and keep playing, never the same track twice in a row', () => {
        const queue = createQueue(IDS, 'shuffle', 'a', ZERO);
        const last = queue.order[IDS.length - 1] ?? '';
        const move = nextTrack(queue, last, 'auto', ZERO);
        expect(move.trackId).not.toBeNull();
        expect(move.trackId).not.toBe(last);
        expect([...move.queue.order].sort()).toEqual([...IDS]);
        expect(move.queue.order[0]).toBe(move.trackId);
    });

    it('should keep replaying the only track of a one-track disc', () => {
        const queue = createQueue(['solo'], 'shuffle', 'solo', ZERO);
        expect(nextTrack(queue, 'solo', 'auto', ZERO).trackId).toBe('solo');
    });

    it('should do nothing on previous at the start of a round', () => {
        const queue = createQueue(IDS, 'shuffle', 'b', ZERO);
        expect(previousTrack(queue, 'b')).toBeNull();
        expect(previousTrack(queue, queue.order[1] ?? '')).toBe('b');
    });

    it('should shuffle the rest of the disc when no track is chosen yet', () => {
        const queue = createQueue(IDS, 'shuffle', null, sequence(0.3, 0.7));
        expect([...queue.order].sort()).toEqual([...IDS]);
    });
});

describe('queue: changing the mode', () => {
    it('should start a new shuffle round from the current track', () => {
        const queue = withMode(createQueue(IDS, 'order', 'b', ZERO), 'shuffle', 'b', ZERO);
        expect(queue.mode).toBe('shuffle');
        expect(queue.order[0]).toBe('b');
    });

    it('should go back to disc order when shuffle is switched off', () => {
        const shuffled = createQueue(IDS, 'shuffle', 'c', sequence(0.9, 0.1));
        const queue = withMode(shuffled, 'order', 'c', ZERO);
        expect(queue.order).toEqual(IDS);
        expect(nextTrack(queue, 'c', 'auto', ZERO).trackId).toBe('d');
    });
});

describe('queue: first track (D85、D99)', () => {
    it('should be the first playable track of the disc in every mode', () => {
        expect(firstTrack(createQueue(IDS, 'shuffle', null, sequence(0.5)))).toBe('a');
        expect(firstTrack(createQueue(IDS, 'order', 'c', ZERO))).toBe('a');
    });

    it('should be null for a disc without playable tracks', () => {
        const queue = createQueue([], 'order', null, ZERO);
        expect(firstTrack(queue)).toBeNull();
        expect(nextTrack(queue, 'x', 'auto', ZERO).trackId).toBeNull();
        expect(previousTrack(queue, 'x')).toBeNull();
    });
});

/* T-070：Favourites 碟播緊時收藏有變（加歌、播完嘅歌拎走）：隊列跟新嘅歌單，唔重新開始 */
describe('queue: refreshing the tracks of the loaded disc', () => {
    it('should follow the new list in order modes', () => {
        const queue = refreshQueue(
            createQueue(['a', 'b', 'c'], 'all', 'a', ZERO),
            ['b', 'c', 'e'],
            ZERO,
        );
        expect(queue).toMatchObject({
            mode: 'all',
            trackIds: ['b', 'c', 'e'],
            order: ['b', 'c', 'e'],
        });
    });

    it('should keep this shuffle round, drop the removed tracks and add new ones after it', () => {
        const shuffled = createQueue(['a', 'b', 'c', 'd'], 'shuffle', 'c', ZERO);
        const queue = refreshQueue(shuffled, ['a', 'c', 'd', 'e', 'f'], ZERO);
        const kept = shuffled.order.filter((id) => id !== 'b');
        expect(queue.order.slice(0, kept.length)).toEqual(kept);
        expect([...queue.order.slice(kept.length)].sort()).toEqual(['e', 'f']);
        expect(queue.trackIds).toEqual(['a', 'c', 'd', 'e', 'f']);
    });

    it('should go on from the playing track to the next one of the new list', () => {
        const queue = refreshQueue(
            createQueue(['a', 'b'], 'order', 'a', ZERO),
            ['a', 'b', 'c'],
            ZERO,
        );
        expect(nextTrack(queue, 'b', 'auto', ZERO).trackId).toBe('c');
    });
});
