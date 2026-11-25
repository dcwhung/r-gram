import { isAlbumId, isTrackId } from './ids';
import { type CatalogError, type Fields, Issues, isRecord } from './issues';
import { CATALOG_VERSION, CREDIT_FIELDS, type CatalogDocument } from './types';

export type CatalogParseResult =
    { ok: true; document: CatalogDocument } | { ok: false; errors: CatalogError[] };

const ACCENT = /^#[0-9a-f]{6}$/i;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_BASE = /^https:\/\/.+\/$/;
const WHEEL_KEY_MAX_CHARS = 2;
const BASE_FIELDS = ['mediaBase', 'imageBase', 'lyricsBase'] as const;

const isPositiveInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0;

/** 按字（code point）計，中文字同 emoji 都當一個字 */
const charCount = (value: string) => Array.from(value).length;

/** 成份文件入面唔可以重覆嘅值 */
interface Seen {
    albumIds: Set<string>;
    trackIds: Set<string>;
}

/** 記低一個值；之前見過就報 DUPLICATE */
const claim = (issues: Issues, seen: Set<unknown>, value: unknown, path: string): void => {
    issues.check(!seen.has(value), path, 'DUPLICATE');
    seen.add(value);
};

const checkCredits = (issues: Issues, value: unknown, path: string): void => {
    if (value === null) return;
    if (!issues.check(isRecord(value), path, 'NOT_AN_OBJECT')) return;
    const credits = value as Fields;
    CREDIT_FIELDS.forEach((field) =>
        issues.text(credits[field], `${path}.${field}`, { nullable: true }),
    );
};

const checkTrack = (
    issues: Issues,
    value: unknown,
    path: string,
    seen: Seen,
    numbers: Set<unknown>,
): void => {
    if (!issues.check(isRecord(value), path, 'NOT_AN_OBJECT')) return;
    const track = value as Fields;
    const validId = typeof track.id === 'string' && isTrackId(track.id);
    if (issues.check(validId, `${path}.id`, 'INVALID_ID')) {
        claim(issues, seen.trackIds, track.id, `${path}.id`);
    }
    if (issues.check(isPositiveInteger(track.no), `${path}.no`, 'INVALID_NUMBER')) {
        claim(issues, numbers, track.no, `${path}.no`);
    }
    issues.text(track.title, `${path}.title`);
    issues.text(track.subtitle, `${path}.subtitle`, { nullable: true });
    checkCredits(issues, track.credits, `${path}.credits`);
    (['audio', 'mv', 'lyrics'] as const).forEach((field) =>
        issues.text(track[field], `${path}.${field}`, { nullable: true }),
    );
};

const checkAlbumFields = (issues: Issues, album: Fields, path: string): void => {
    issues.text(album.title, `${path}.title`);
    const wheelKey = album.wheelKey;
    const validKey =
        typeof wheelKey === 'string' &&
        wheelKey !== '' &&
        charCount(wheelKey) <= WHEEL_KEY_MAX_CHARS;
    issues.check(validKey, `${path}.wheelKey`, 'INVALID_WHEEL_KEY');
    const date = album.releaseDate;
    const validDate = date === null || (typeof date === 'string' && CALENDAR_DATE.test(date));
    issues.check(validDate, `${path}.releaseDate`, 'INVALID_DATE');
    issues.check(
        album.year === null || isPositiveInteger(album.year),
        `${path}.year`,
        'INVALID_NUMBER',
    );
    issues.text(album.type, `${path}.type`, { allowEmpty: true });
    issues.text(album.label, `${path}.label`, { allowEmpty: true });
    const validAccent = typeof album.accent === 'string' && ACCENT.test(album.accent);
    issues.check(validAccent, `${path}.accent`, 'INVALID_COLOUR');
    issues.text(album.cover, `${path}.cover`, { nullable: true });
    issues.text(album.thumb, `${path}.thumb`, { nullable: true });
};

const checkAlbum = (issues: Issues, value: unknown, path: string, seen: Seen): void => {
    if (!issues.check(isRecord(value), path, 'NOT_AN_OBJECT')) return;
    const album = value as Fields;
    const validId = typeof album.id === 'string' && isAlbumId(album.id);
    if (issues.check(validId, `${path}.id`, 'INVALID_ID')) {
        claim(issues, seen.albumIds, album.id, `${path}.id`);
    }
    checkAlbumFields(issues, album, path);
    if (!issues.check(Array.isArray(album.tracks), `${path}.tracks`, 'NOT_AN_ARRAY')) return;
    const numbers = new Set<unknown>();
    (album.tracks as unknown[]).forEach((track, index) =>
        checkTrack(issues, track, `${path}.tracks[${index}]`, seen, numbers),
    );
};

const checkHeader = (issues: Issues, document: Fields): void => {
    issues.check(document.version === CATALOG_VERSION, 'version', 'UNSUPPORTED_VERSION');
    const generatedAt = document.generatedAt;
    const validDate = typeof generatedAt === 'string' && !Number.isNaN(Date.parse(generatedAt));
    issues.check(validDate, 'generatedAt', 'INVALID_DATE');
    BASE_FIELDS.forEach((field) => {
        const base = document[field];
        issues.check(typeof base === 'string' && HTTPS_BASE.test(base), field, 'INVALID_URL');
    });
};

/**
 * 驗證 catalog 文件。Backend 發佈前驗一次，播放端載入時再驗一次（唔信任 cache 同網絡）。
 * 唔拋 exception：錯誤連 path 一次過列晒。通過就原樣回傳（已收窄型別）。
 */
export const parseCatalogDocument = (input: unknown): CatalogParseResult => {
    const issues = new Issues();
    if (!issues.check(isRecord(input), '$', 'NOT_AN_OBJECT'))
        return { ok: false, errors: issues.errors };
    const document = input as Fields;
    checkHeader(issues, document);
    if (issues.check(Array.isArray(document.albums), 'albums', 'NOT_AN_ARRAY')) {
        const seen: Seen = { albumIds: new Set(), trackIds: new Set() };
        (document.albums as unknown[]).forEach((album, index) =>
            checkAlbum(issues, album, `albums[${index}]`, seen),
        );
    }
    if (issues.errors.length > 0) return { ok: false, errors: issues.errors };
    return { ok: true, document: input as CatalogDocument };
};
