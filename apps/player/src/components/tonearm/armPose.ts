/*
 * 唱臂姿勢（純函數）。Functional Spec FR-040、CR-003 決定 11、D36；設計稿第 17 版 armOnDisc()、armLifted()、ARM_IN。
 * - parked：泊位（未揀歌、熄咗 MV 之後、重開 app、播完、載入失敗、睇緊另一隻碟）
 * - playing：落針，小燈著
 * - lifted：暫停：唱臂留喺碟上面原位，唱針略為升起，小燈熄
 * 由泊位開始播有兩段開場（lead-in）：swing = 升高住轉到碟上面；drop = 放低唱針。小燈同碟等放低之後先郁。
 * 暫停之後繼續冇 lead-in：只係放低唱針（CSS 過場）。
 */
export type ArmPose = 'parked' | 'playing' | 'lifted';

/** 開場進行緊邊段；null = 冇開場（停喺姿勢本身） */
export type ArmLeadIn = 'swing' | 'drop' | null;

/** 畫面上嘅樣：喺唔喺碟上面、唱針升起、小燈著 */
export interface ArmLook {
    onDisc: boolean;
    lifted: boolean;
    lit: boolean;
}

const POSE_LOOK: Readonly<Record<ArmPose, ArmLook>> = {
    parked: { onDisc: false, lifted: false, lit: false },
    playing: { onDisc: true, lifted: false, lit: true },
    lifted: { onDisc: true, lifted: true, lit: false },
};

const LEAD_IN_LOOK: Readonly<Record<Exclude<ArmLeadIn, null>, ArmLook>> = {
    swing: { onDisc: true, lifted: true, lit: false },
    drop: { onDisc: true, lifted: false, lit: false },
};

export const armLook = (pose: ArmPose, leadIn: ArmLeadIn = null): ArmLook =>
    leadIn ? LEAD_IN_LOOK[leadIn] : POSE_LOOK[pose];

/** 姿勢由 from 變 to 時開唔開始開場：淨係由泊位開始播先有 */
export const leadInStart = (from: ArmPose, to: ArmPose): ArmLeadIn =>
    from === 'parked' && to === 'playing' ? 'swing' : null;

/** 一段做完之後嘅下一段 */
export const leadInAfter = (leadIn: Exclude<ArmLeadIn, null>): ArmLeadIn =>
    leadIn === 'swing' ? 'drop' : null;
