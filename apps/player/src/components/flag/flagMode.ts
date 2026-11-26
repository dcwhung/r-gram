/*
 * 旗幟用邊個 renderer（純函數，T-114；Technical Spec「CR-010 → Preload 旗幟用 WebGL」）：
 *   live  = WebGL 飄揚（開唔到 WebGL context 就喺同一塊 canvas 畫 2D 靜止一格）
 *   still = 2D renderer 畫一格靜止（減少動態效果、WebGL renderer 開唔到、context lost）
 * still 之後唔再返 live：Preload 只係幾秒，context 返嚟都唔換返（免得閃多一次、再失去一次）。
 */
export type FlagMode = 'live' | 'still';

export type FlagEvent = 'gl-failed' | 'context-lost';

export const initialFlagMode = (reducedMotion: boolean): FlagMode =>
    reducedMotion ? 'still' : 'live';

/** 兩個事件都係換做靜止一格（唔聽 context 返嚟：Preload 只係幾秒，S-256） */
export const nextFlagMode = (_mode: FlagMode, _event: FlagEvent): FlagMode => 'still';
