/*
 * 播放模式（Functional Spec「播放模式」、US-014；設計稿第 20 版 MODES）：一粒掣，每㩒一下轉一個
 * 順序 → 重覆全部 → 重覆一首 → 隨機。儲存喺本機，重開 app 保持。
 * 本機嘅 shape 跟 Technical Spec `rgram.playMode.v1`：`{ shuffle, repeat }`；隨機 = `shuffle: true`
 *（「隨機但播完一輪就停」已經取消，所以隨機永遠播落去，唔睇 `repeat`）。
 */
import { PLAY_MODE_STORAGE_KEY } from '../config/storageKeys';

export const PLAY_MODES = ['order', 'all', 'one', 'shuffle'] as const;

export type PlayMode = (typeof PLAY_MODES)[number];

export const DEFAULT_PLAY_MODE: PlayMode = 'order';

export const nextPlayMode = (mode: PlayMode): PlayMode =>
    PLAY_MODES[(PLAY_MODES.indexOf(mode) + 1) % PLAY_MODES.length] ?? DEFAULT_PLAY_MODE;

type Repeat = 'off' | 'all' | 'one';

interface StoredPlayMode {
    shuffle: boolean;
    repeat: Repeat;
}

export type ModeStorage = Pick<Storage, 'getItem' | 'setItem'>;

const REPEAT_OF: Readonly<Record<PlayMode, Repeat>> = {
    order: 'off',
    all: 'all',
    one: 'one',
    shuffle: 'off',
};

const REPEATS: readonly unknown[] = ['off', 'all', 'one'];

const isStored = (value: unknown): value is StoredPlayMode => {
    if (typeof value !== 'object' || value === null) return false;
    const { shuffle, repeat } = value as Record<string, unknown>;
    return typeof shuffle === 'boolean' && REPEATS.includes(repeat);
};

const fromStored = ({ shuffle, repeat }: StoredPlayMode): PlayMode => {
    if (shuffle) return 'shuffle';
    return repeat === 'off' ? 'order' : repeat;
};

/** 冇記錄、壞咗、或者讀唔到（私密瀏覽、封鎖咗）= 順序播放 */
export const readPlayMode = (storage: ModeStorage | null): PlayMode => {
    try {
        const raw = storage?.getItem(PLAY_MODE_STORAGE_KEY);
        const value: unknown = raw ? JSON.parse(raw) : null;
        return isStored(value) ? fromStored(value) : DEFAULT_PLAY_MODE;
    } catch {
        return DEFAULT_PLAY_MODE;
    }
};

/** 寫唔到（滿咗、封鎖咗）就算：今次照用，只係下次開 app 唔記得 */
export const writePlayMode = (storage: ModeStorage | null, mode: PlayMode): void => {
    const stored: StoredPlayMode = { shuffle: mode === 'shuffle', repeat: REPEAT_OF[mode] };
    try {
        storage?.setItem(PLAY_MODE_STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // 私密瀏覽或者空間滿：唔影響播放
    }
};
