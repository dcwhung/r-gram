/*
 * 本機收藏（Functional Spec US-010、US-013、D19；Technical Spec「播放端本機資料」`rgram.favourites.v1`）：
 * `[{ trackId, addedAt }]`，按收藏先後排（最早排最先）。外部 store：`subscribe`／`getSnapshot` 畀 `useSyncExternalStore`。
 * 讀取時逐項驗 shape：壞咗嘅項目、重覆嘅歌唔要，成份壞咗 = 冇收藏。Storage 唔畀用或者拋錯（私隱模式、
 * 爆 quota）照喺記憶體運作，只係下次開 app 唔記得。catalog 搵唔到嘅歌照留喺度（被刪嘅歌唔顯示，由 favouritesAlbum 處理）。
 */
import { FAVOURITES_STORAGE_KEY } from '../config/storageKeys';

export interface FavouriteEntry {
    readonly trackId: string;
    /** 收藏嘅時間（毫秒）：決定 Favourites 碟嘅次序 */
    readonly addedAt: number;
}

export type FavouritesStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface FavouritesStoreDeps {
    storage: FavouritesStorage | null;
    now?: () => number;
    /** 其他分頁改咗（`storage` 事件）就重新讀；冇畀 = 唔聽 */
    events?: EventTarget | null;
    key?: string;
}

export interface FavouritesStore {
    subscribe(listener: () => void): () => void;
    getSnapshot(): readonly FavouriteEntry[];
    has(trackId: string): boolean;
    /** 已收藏 = 唔做嘢。`addedAt` 冇畀 = 而家（排最尾） */
    add(trackId: string, addedAt?: number): void;
    /** 回傳拎走嗰項；本身冇收藏 = null */
    remove(trackId: string): FavouriteEntry | null;
    /** 再聽其他分頁（建立時已經聽緊；同一個 listener 唔會加兩次）：effect 重新 mount 用 */
    listen(): void;
    /** 唔再用：唔再聽其他分頁（S-257） */
    dispose(): void;
}

const NO_FAVOURITES: readonly FavouriteEntry[] = [];

const isEntry = (value: unknown): value is FavouriteEntry => {
    if (typeof value !== 'object' || value === null) return false;
    const { trackId, addedAt } = value as Record<string, unknown>;
    return typeof trackId === 'string' && trackId !== '' && Number.isFinite(addedAt);
};

/** 逐項驗；同一首歌只留第一次；按收藏時間排（同一時間保持原本次序） */
const toEntries = (value: unknown): readonly FavouriteEntry[] => {
    if (!Array.isArray(value)) return NO_FAVOURITES;
    const seen = new Set<string>();
    const entries = value.filter(isEntry).filter(({ trackId }) => {
        if (seen.has(trackId)) return false;
        seen.add(trackId);
        return true;
    });
    return entries
        .map(({ trackId, addedAt }) => ({ trackId, addedAt }))
        .sort((a, b) => a.addedAt - b.addedAt);
};

const readEntries = (storage: FavouritesStorage | null, key: string) => {
    try {
        const raw = storage?.getItem(key);
        return raw ? toEntries(JSON.parse(raw)) : NO_FAVOURITES;
    } catch {
        return NO_FAVOURITES;
    }
};

const writeEntries = (
    storage: FavouritesStorage | null,
    key: string,
    entries: readonly FavouriteEntry[],
) => {
    try {
        storage?.setItem(key, JSON.stringify(entries));
    } catch {
        // 寫唔到：今次照用記憶體嗰份
    }
};

/** 插入去收藏時間嘅位置（undo 取消收藏時放返原位；新收藏一定排最尾） */
const inserted = (entries: readonly FavouriteEntry[], entry: FavouriteEntry) => {
    const at = entries.findIndex((other) => other.addedAt > entry.addedAt);
    return at === -1 ? [...entries, entry] : [...entries.slice(0, at), entry, ...entries.slice(at)];
};

class Store implements FavouritesStore {
    private entries: readonly FavouriteEntry[];
    private readonly listeners = new Set<() => void>();
    private readonly storage: FavouritesStorage | null;
    private readonly now: () => number;
    private readonly key: string;
    private readonly events: EventTarget | null;
    private readonly listener = (event: Event) => this.onStorage(event);

    constructor(deps: FavouritesStoreDeps) {
        this.storage = deps.storage;
        this.now = deps.now ?? Date.now;
        this.key = deps.key ?? FAVOURITES_STORAGE_KEY;
        this.entries = readEntries(this.storage, this.key);
        this.events = deps.events ?? null;
        this.listen();
    }

    listen = (): void => this.events?.addEventListener('storage', this.listener);

    dispose = (): void => this.events?.removeEventListener('storage', this.listener);

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): readonly FavouriteEntry[] => this.entries;

    has = (trackId: string): boolean => this.entries.some((entry) => entry.trackId === trackId);

    add = (trackId: string, addedAt: number = this.now()): void => {
        if (this.has(trackId)) return;
        this.commit(inserted(this.entries, { trackId, addedAt }));
    };

    remove = (trackId: string): FavouriteEntry | null => {
        const entry = this.entries.find((candidate) => candidate.trackId === trackId) ?? null;
        if (entry) this.commit(this.entries.filter((candidate) => candidate !== entry));
        return entry;
    };

    private commit(entries: readonly FavouriteEntry[]): void {
        this.entries = entries;
        writeEntries(this.storage, this.key, entries);
        this.notify();
    }

    /** 其他分頁：key 係呢個（或者 null = 清晒）先重新讀 */
    private onStorage(event: Event): void {
        const { key } = event as StorageEvent;
        if (key !== null && key !== this.key) return;
        this.entries = readEntries(this.storage, this.key);
        this.notify();
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }
}

export const createFavouritesStore = (deps: FavouritesStoreDeps): FavouritesStore =>
    new Store(deps);

/** 瀏覽器嗰份：`localStorage`（攞唔到 = 只喺記憶體）、聽 `window` 嘅 storage 事件 */
const browserStorage = (): FavouritesStorage | null => {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
};

export const createBrowserFavourites = (): FavouritesStore =>
    createFavouritesStore({
        storage: browserStorage(),
        events: typeof window === 'undefined' ? null : window,
    });
