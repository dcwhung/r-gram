import { useEffect } from 'react';
import type { Scene } from '../app/stageReducer';

/*
 * 安全區外面（狀態列、底部指示條後面、闊畫面兩邊）嘅底色（backlog B-014）。
 * `#root` 用 `var(--stage-backdrop, var(--color-stage))`（styles/global.css）；場景喺 <html> 設呢個變數，等兩邊一致。
 */
const PROPERTY = '--stage-backdrop';

const SCENE_BACKDROP: Readonly<Record<Scene, string>> = {
    // Preload 旗幟畫面係黑底
    preload: 'var(--color-flag-bg)',
    home: 'var(--color-stage)',
    discChange: 'var(--color-stage)',
    // 歌單壓暗成部唱片機（T-037 定暗層之後跟返佢嘅色）
    list: 'var(--color-stage-dimmed)',
};

export const backdropFor = (scene: Scene): string => SCENE_BACKDROP[scene];

/** 掛住嘅時候設 `--stage-backdrop`，拆走時清返 */
export const useStageBackdrop = (value: string): void => {
    useEffect(() => {
        const { style } = document.documentElement;
        style.setProperty(PROPERTY, value);
        return () => {
            style.removeProperty(PROPERTY);
        };
    }, [value]);
};
