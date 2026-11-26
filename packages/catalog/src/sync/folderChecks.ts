/*
 * 同步：唔屬於任何一首歌嘅檔（Technical Spec「同步嘅設計」步驟 7；Functional Spec D68、D70、D77）：
 * - 音檔歌號唔喺 `info.txt` = AUDIO_NOT_LISTED（唔加歌）；冇 `info.txt` 時曲目就係音檔歌號，唔會出
 * - MV、`.txt` 嘅歌號唔係曲目 = FILE_WITHOUT_TRACK
 * - 兩個 `info.txt` = INFO_CONFLICT（用 list 排第一嗰個；第二個起每個一條）
 */
import type { FileGroups } from '../scan/scanFiles';
import { checkOf, type Check } from './checks';

export const orphanChecks = (groups: FileGroups, listed: ReadonlySet<number>): Check[] =>
    [...groups.numbered.values()]
        .flat()
        .filter(({ no }) => !listed.has(no))
        .map(({ key, no, kind }) =>
            checkOf(
                kind === 'audio' ? 'AUDIO_NOT_LISTED' : 'FILE_WITHOUT_TRACK',
                { key, no },
                { no },
            ),
        );

export const infoConflictChecks = (groups: FileGroups): Check[] =>
    groups.info.slice(1).map(({ key }) => checkOf('INFO_CONFLICT', { key }));
