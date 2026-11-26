/*
 * 由資料砌返 `info.txt`（Technical Spec API-018：資料夾未有 `info.txt` 時文字框嘅範本）。
 * 同用戶自己個檔一樣嘅樣：全形冒號、`1. 歌名`（唔補零）、按歌號排；冇年份唔出嗰行；LF、檔尾一個換行。
 * `parseAlbumInfo(formatAlbumInfo(x))` 讀返 `x`（歌名已 trim、冇換行）
 */
import { INFO_COLON, INFO_LABEL_OF } from './lines';
import type { AlbumInfoFields } from './types';

const TRACK_SEPARATOR = '. ';

const labelLine = (field: keyof typeof INFO_LABEL_OF, value: string): string =>
    `${INFO_LABEL_OF[field]}${INFO_COLON}${value}`;

export const formatAlbumInfo = ({ title, year, tracks }: AlbumInfoFields): string => {
    const head = [labelLine('title', title)];
    if (year !== null) head.push(labelLine('year', String(year)));
    const trackLines = [...tracks]
        .sort((a, b) => a.no - b.no)
        .map(({ no, title: name }) => `${no}${TRACK_SEPARATOR}${name}`);
    return [...head, labelLine('tracks', ''), ...trackLines, ''].join('\n');
};
