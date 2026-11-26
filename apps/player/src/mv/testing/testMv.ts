/*
 * 測試用嘅電視：真 controller + 真引擎 + 假 `<video>` + 假 Web Audio（冇聲、冇網絡）。
 * `element.plays` 記低每次 play()：喺手勢 handler 返嚟之前已經有 = 同一個 call stack。
 */
import type { SessionTargets } from '../../playback/sessionTargets';
import { createMvAudio } from '../mvAudio';
import { createMvController, type MvController } from '../mvController';
import { createVideoEngine } from '../videoEngine';
import { asContextClass, FakeAudioContext } from './fakeAudioContext';
import { asVideo, FakeVideoElement } from './fakeVideo';

export interface TestMv {
    element: FakeVideoElement;
    mv: MvController;
}

interface TestMvOptions {
    /** 冇畀 = 跟瀏覽器設定（測試 stub 嘅 matchMedia），同畫面一致 */
    reduceMotion?: boolean;
    /** false = 冇 AudioContext（音量旋鈕停用） */
    webAudio?: boolean;
    sessions?: SessionTargets | null;
}

export const createTestMv = ({
    reduceMotion,
    webAudio = true,
    sessions = null,
}: TestMvOptions = {}): TestMv => {
    FakeAudioContext.reset();
    const element = new FakeVideoElement();
    const audio = createMvAudio(webAudio ? { AudioContext: asContextClass(FakeAudioContext) } : {});
    const mv = createMvController({
        engine: createVideoEngine(asVideo(element), audio),
        sessions,
        ...(reduceMotion === undefined ? {} : { reduceMotion: () => reduceMotion }),
    });
    return { element, mv };
};
