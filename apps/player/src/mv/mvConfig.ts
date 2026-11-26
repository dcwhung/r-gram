/*
 * MV 音訊嘅常數（Technical Spec「CR-010 → MV 音訊」：ramp 常數放 mv 嘅 config，唔係動畫 token）。
 */

/** 開電視時嘅音量（0–1，gain）：同系統音量一樣大，同唱片一致（spec 冇講；🅰️ 預設） */
export const DEFAULT_MV_VOLUME = 1;

/**
 * gain 轉去新音量嘅時間常數（秒，`setTargetAtTime`）：短到感覺即時，又唔會有「咔」聲。
 * 約 3 個時間常數之後到位（≈ 50 ms）
 */
export const MV_GAIN_RAMP_S = 0.015;
