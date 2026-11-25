import { armLook, leadInAfter, leadInOnPose, leadInStart } from './armPose';

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

    // S-072：轉入途中暫停 / 再播，唱臂仲轉緊；返泊位就停
    it('should keep the swing through a pause during the swing and drop it when parked', () => {
        expect(leadInOnPose('swing', 'playing', 'lifted')).toBe('swing');
        expect(leadInOnPose('swing', 'lifted', 'playing')).toBe('swing');
        expect(leadInOnPose('swing', 'lifted', 'parked')).toBeNull();
        expect(leadInOnPose('drop', 'playing', 'lifted')).toBeNull();
        expect(leadInOnPose(null, 'parked', 'playing')).toBe('swing');
    });

    it('should not drop the needle when the swing ends while paused', () => {
        expect(leadInAfter('swing', 'lifted')).toBeNull();
        expect(leadInAfter('swing', 'playing')).toBe('drop');
    });
});
