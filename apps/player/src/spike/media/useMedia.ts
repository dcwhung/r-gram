import { titleFromFileName } from '@r-gram/catalog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALBUM_FOLDER } from '../config';
import { folderFileUrl } from './candidates';
import { type Discovery, discover } from './discover';

/** 用戶可以改嘅檔名（記喺 localStorage） */
export interface MediaFields {
    audio1: string;
    audio2: string;
    audio3: string;
    mv: string;
    cover: string;
}

export interface SpikeTrack {
    name: string;
    title: string;
    url: string;
}

export interface SpikeMedia {
    base: string;
    albumTitle: string;
    tracks: SpikeTrack[];
    mvUrl: string | null;
    coverUrl: string | null;
    /** 封面檔名（未 encode；⑤ 嘅 catalog 用） */
    coverName: string | null;
}

const STORAGE_KEY = 'r-gram-spike-media';
const FALLBACK_ALBUM_TITLE = 'KOMOREBI';
const EMPTY: MediaFields = { audio1: '', audio2: '', audio3: '', mv: '', cover: '' };

const loadFields = (): MediaFields => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MediaFields>;
        return { ...EMPTY, ...saved };
    } catch {
        return EMPTY;
    }
};

const saveFields = (fields: MediaFields) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    } catch {
        // 私密瀏覽：唔記得都照用
    }
};

/** 偵測結果填入；`overwrite` = 「重新尋找」，否則只填空格 */
const filled = (fields: MediaFields, found: Discovery, overwrite: boolean): MediaFields => {
    const from: MediaFields = {
        audio1: found.audio[0] ?? '',
        audio2: found.audio[1] ?? '',
        audio3: found.audio[2] ?? '',
        mv: found.mv ?? '',
        cover: found.cover ?? '',
    };
    const keys = Object.keys(from) as (keyof MediaFields)[];
    return Object.fromEntries(
        keys.map((key) => [key, (overwrite ? from[key] : fields[key]) || from[key] || fields[key]]),
    ) as unknown as MediaFields;
};

const mediaOf = (base: string, fields: MediaFields, found: Discovery | null): SpikeMedia => {
    const url = (name: string) =>
        name.trim() ? folderFileUrl(base, ALBUM_FOLDER, name.trim()) : null;
    const names = [fields.audio1, fields.audio2, fields.audio3].map((name) => name.trim());
    return {
        base,
        albumTitle: found?.albumTitle ?? FALLBACK_ALBUM_TITLE,
        tracks: names
            .filter(Boolean)
            .map((name) => ({ name, title: titleFromFileName(name), url: url(name) ?? '' })),
        mvUrl: url(fields.mv),
        coverUrl: url(fields.cover),
        coverName: fields.cover.trim() || null,
    };
};

export const useMedia = (base: string) => {
    const [fields, setFields] = useState<MediaFields>(loadFields);
    const [found, setFound] = useState<Discovery | null>(null);
    const [searching, setSearching] = useState(true);
    const search = useCallback(
        (overwrite: boolean) =>
            discover({ base, folder: ALBUM_FOLDER }).then((result) => {
                setFound(result);
                setSearching(false);
                setFields((current) => filled(current, result, overwrite));
            }),
        [base],
    );
    useEffect(() => {
        void search(false);
    }, [search]);
    const rescan = () => {
        setSearching(true);
        void search(true);
    };
    useEffect(() => saveFields(fields), [fields]);
    const media = useMemo(() => mediaOf(base, fields, found), [base, fields, found]);
    return { fields, setFields, found, searching, rescan, media };
};
