/*
 * 冇歌曲文字檔（或者佢有錯）時新歌嘅歌名（Functional Spec D59、FR-126；Technical Spec「CR-006 → 掃描建立歌曲」）：
 * 去咗資料夾、副檔名、開頭歌號同跟住嘅空格／`.`／`-`／`–`／`—`／`_`；剩低係空就用去咗副檔名嘅成個檔名。
 * macOS 上載嘅檔名可能係分解形式（NFD）：歌名轉做組合形式（NFC），畫面同搜尋先一致。過長就截到 TITLE_MAX_CHARS
 */
import { TITLE_MAX_CHARS } from '../song-text/limits';
import { fileNameOf } from './classifyFile';

/** S-161：同 `info.txt` 嘅曲目行一致，en dash、em dash 都當分隔 */
const LEADING_NUMBER_AND_SEPARATORS = /^\d{1,3}[\s._\-–—]*/u;

const withoutExtension = (name: string): string => {
    const dot = name.lastIndexOf('.');
    return dot <= 0 ? name : name.slice(0, dot);
};

export const titleFromFileName = (key: string): string => {
    const base = withoutExtension(fileNameOf(key)).normalize('NFC');
    const rest = base.replace(LEADING_NUMBER_AND_SEPARATORS, '').trim();
    const title = rest === '' ? base.trim() : rest;
    return [...title].slice(0, TITLE_MAX_CHARS).join('');
};
