/*
 * 測試用嘅播放 controller：真 controller + 真引擎 + 假 `<audio>`（冇聲、冇網絡、冇本機儲存）。
 * `element.plays` 記低每次 play()：喺手勢 handler 返嚟之前已經有 = 同一個 call stack（T-011 §2.5「手勢路徑」）。
 */
import { createAudioEngine } from '../audioEngine';
import { createPlaybackController, type PlaybackController } from '../playbackController';
import { asAudio, FakeAudioElement } from './fakeAudioElement';

export interface TestPlayback {
    element: FakeAudioElement;
    controller: PlaybackController;
}

/** `reduceMotion` 冇畀 = 跟瀏覽器設定（測試 stub 嘅 matchMedia），同畫面一致 */
export const createTestPlayback = ({
    reduceMotion,
}: { reduceMotion?: boolean } = {}): TestPlayback => {
    const element = new FakeAudioElement();
    const engine = createAudioEngine(asAudio(element), {
        isHidden: () => false,
        onVisible: () => {},
    });
    const controller = createPlaybackController({
        engine,
        random: () => 0,
        ...(reduceMotion === undefined ? {} : { reduceMotion: () => reduceMotion }),
        isHidden: () => false,
        storage: null,
    });
    return { element, controller };
};

/** 只要 controller（唔理聲音嘅測試） */
export const testPlayback = (): PlaybackController => createTestPlayback().controller;
