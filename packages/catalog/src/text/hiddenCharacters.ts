/*
 * 睇唔到嘅字元（review S-158）：控制字元（C0、DEL、C1）、零寬字元（ZWSP、ZWNJ、ZWJ、WORD JOINER、BOM 等）
 * 同 bidi 控制字元（LRM、RLM、ALM、LRE…RLO、LRI…PDI）。人手打或者由網頁複製嘅歌名有時夾住呢啲字，
 * 畫面上睇唔到，但會令碟名、歌名變「空」或者次序亂（RLO）。`info.txt` 嘅碟名、歌名同歌曲文字嘅歌名都去走
 */
const HIDDEN_CHARACTERS =
    // eslint-disable-next-line no-control-regex -- 就係要搵控制字元
    /[\u0000-\u001f\u007f-\u009f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/gu;

export const withoutHiddenCharacters = (text: string): string =>
    text.replace(HIDDEN_CHARACTERS, '');
