/*
 * 字體守衛（W-027）：repo 係公開嘅，只可以有打包用嘅兩個 Rokkitt 字體檔（SIL Open Font License 1.1）。
 * 用 SHA-256 鎖死內容：換檔要人手更新呢個表，review 時一定見到。
 */
export const ALLOWED_FONTS = Object.freeze({
    'apps/player/src/assets/fonts/rokkitt-extrabold-latin1.woff2':
        '3c0fde848c9293d8f756c9ee4b0727668b5be3f0b40192f2b4c83f383cf64b55',
    'apps/player/src/assets/fonts/rokkitt-light-latin1.woff2':
        'dcec09a98769b4ff614d0abf2c247dcde24e057111ea27be168e4f6369275e3f',
});

const FONT_EXTENSION = /\.(?:otf|ttf|ttc|woff2?|eot)$/i;

export const isFontFile = (path) => FONT_EXTENSION.test(path);

/** 唔喺允許名單入面嘅字體檔（照輸入次序） */
export const findStrayFonts = (paths) =>
    paths.filter((path) => isFontFile(path) && !Object.hasOwn(ALLOWED_FONTS, path));
