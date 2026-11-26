/** 設計稿 isLatin()：全部係 ASCII 可見字元（英文、數字）就用 slab，否則用 Noto Sans HK */
const LATIN_ONLY = /^[\x20-\x7e]+$/;

export const isLatin = (text: string): boolean => LATIN_ONLY.test(text);
