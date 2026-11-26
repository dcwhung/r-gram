/*
 * 測試用嘅假 `<video>`：同假 `<audio>` 一樣（play() 回 promise、事件由測試話幾時發；`plays` 記低每次
 * play() 嗰陣嘅 muted），加 `<video>` 先有嘅屬性。`volume` 記低有冇人改過（MV 唔可以用，D104）。
 */
import { FakeAudioElement } from '../../playback/testing/fakeAudioElement';

export class FakeVideoElement extends FakeAudioElement {
    playsInline = false;
    readonly volumeWrites: number[] = [];
    private level = 1;

    get volume(): number {
        return this.level;
    }

    set volume(value: number) {
        this.volumeWrites.push(value);
        this.level = value;
    }
}

export const asVideo = (fake: FakeVideoElement): HTMLVideoElement =>
    fake as unknown as HTMLVideoElement;
