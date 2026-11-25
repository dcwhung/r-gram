import { armLook, leadInAfter, leadInStart } from './armPose';

describe('armLook', () => {
    it.each([
        ['parked', null, { onDisc: false, lifted: false, lit: false }],
        ['playing', null, { onDisc: true, lifted: false, lit: true }],
        ['lifted', null, { onDisc: true, lifted: true, lit: false }],
        ['playing', 'swing', { onDisc: true, lifted: true, lit: false }],
        ['playing', 'drop', { onDisc: true, lifted: false, lit: false }],
    ] as const)('should show pose %s during lead-in phase %s as %o', (pose, leadIn, expected) => {
        expect(armLook(pose, leadIn)).toEqual(expected);
    });
});

describe('lead-in', () => {
    // 由泊位開始播先有兩段；暫停之後繼續只係放低唱針（CSS 過場），冇轉入
    it('should start with the swing only when play starts from the parked pose', () => {
        expect(leadInStart('parked', 'playing')).toBe('swing');
        expect(leadInStart('lifted', 'playing')).toBeNull();
        expect(leadInStart('playing', 'lifted')).toBeNull();
        expect(leadInStart('playing', 'parked')).toBeNull();
        expect(leadInStart('lifted', 'parked')).toBeNull();
    });

    it('should go from the swing to the drop and then finish', () => {
        expect(leadInAfter('swing')).toBe('drop');
        expect(leadInAfter('drop')).toBeNull();
    });
});
