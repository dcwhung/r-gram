import { useEffect } from 'react';
import type { Overlay, Scene } from '../app/stageReducer';

/*
 * 安全區外面（狀態列、底部指示條後面、闊畫面兩邊）嘅底色（backlog B-014）。
 * `#root` 同頁面用 `var(--stage-backdrop, var(--color-flag-bg))`（styles/global.css；未設之前係 Preload 嘅黑色，S-268）；
 * 場景喺 <html> 設呢個變數，等兩邊一致。
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

/** 歌書（T-072）嘅暗層同歌單一樣係黑色 80%；電視嘅淡白層照用場景嘅底色 */
export const backdropFor = (scene: Scene, overlay: Overlay = null): string =>
    overlay === 'booklet' ? SCENE_BACKDROP.list : SCENE_BACKDROP[scene];

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
