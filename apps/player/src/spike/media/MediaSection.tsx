import type { Dispatch, SetStateAction } from 'react';
import { ALBUM_FOLDER } from '../config';
import { TEXT } from '../text';
import type { Discovery } from './discover';
import type { MediaFields } from './useMedia';

interface MediaSectionProps {
    base: string;
    fields: MediaFields;
    setFields: Dispatch<SetStateAction<MediaFields>>;
    found: Discovery | null;
    searching: boolean;
    rescan: () => void;
}

const FIELD_LABELS: Readonly<Record<keyof MediaFields, string>> = {
    audio1: `${TEXT.media.audio} 1`,
    audio2: `${TEXT.media.audio} 2`,
    audio3: `${TEXT.media.audio} 3`,
    mv: TEXT.media.mv,
    cover: TEXT.media.cover,
};

const INFO_TEXT: Readonly<Record<Discovery['info'], string>> = {
    ok: TEXT.media.infoOk,
    missing: TEXT.media.infoMissing,
    error: TEXT.media.infoError,
};

const statusText = (found: Discovery | null, searching: boolean): string => {
    if (searching || !found) return TEXT.media.searching;
    const title = found.albumTitle ? TEXT.quote(found.albumTitle) : '';
    const error = found.infoError ? TEXT.paren(found.infoError) : '';
    return `${INFO_TEXT[found.info]}${title}${error} · ${found.requests} ${TEXT.media.requests}`;
};

/** 測試檔案：偵測結果 + 可以改嘅檔名欄 */
export const MediaSection = ({
    base,
    fields,
    setFields,
    found,
    searching,
    rescan,
}: MediaSectionProps) => (
    <section className="spike-item" aria-labelledby="spike-media">
        <h2 id="spike-media">{TEXT.media.title}</h2>
        <p className="spike-how">{TEXT.media.how}</p>
        <p className="spike-mono">
            {base}
            {ALBUM_FOLDER}/
        </p>
        <p role="status" data-testid="media-status">
            {statusText(found, searching)}
        </p>
        {(Object.keys(FIELD_LABELS) as (keyof MediaFields)[]).map((key) => (
            <label key={key} className="spike-field">
                <span>{FIELD_LABELS[key]}</span>
                <input
                    type="text"
                    value={fields[key]}
                    placeholder={TEXT.media.none}
                    data-field={key}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) =>
                        setFields((current) => ({ ...current, [key]: event.target.value }))
                    }
                />
            </label>
        ))}
        <button type="button" className="spike-button" onClick={rescan} disabled={searching}>
            {TEXT.media.rescan}
        </button>
    </section>
);
