/*
 * 播完最後一首（Functional Spec D99；Technical Spec「播完最後一首」；T-011 報告 §2.5「D99 同 D88」）：
 * 歌停、唱臂泊位、唱片夾 play；隔 `endedReleaseMs` 先「放低隻碟」（播放 store 返 idle = 未揀歌，
 * 歌名淡出、歌單欄飄返出嚟，全部係已有嘅衍生規則）。
 * 要睇畫面先知幾時計，所以放喺畫面層：只喺主頁、冇歌書／MV、冇拎住另一隻碟時先計（D99 ②、D88）；
 * 歌書收埋之後由頭計足 3 秒。提早結束（擰旋鈕、開歌單等）喺 useHome 嘅 handler（D99 ①）。
 */
import { useEffect } from 'react';
import { MOTION } from '../config/motion';
import type { PlaybackState } from '../playback/playbackState';
import type { StageState } from './stageReducer';

/** 3 秒計唔計：播完、喺主頁、冇蓋住、冇拎住另一隻碟 */
export const endedWaitRuns = (
    playback: PlaybackState,
    stage: StageState,
    holding: boolean,
): boolean =>
    playback.status === 'ended' && stage.scene === 'home' && stage.overlay === null && !holding;

/** 拎住時冇 timer；畫面一變到唔計就取消，返到可以計就由頭計 */
export const useEndedRelease = (runs: boolean, release: () => void): void => {
    useEffect(() => {
        if (!runs) return undefined;
        const timer = setTimeout(release, MOTION.input.endedReleaseMs);
        return () => clearTimeout(timer);
    }, [runs, release]);
};
