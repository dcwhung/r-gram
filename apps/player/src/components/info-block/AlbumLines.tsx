/*
 * 左上資訊嘅碟名同年份（設計稿 info() 嘅碟名部分）：揀碟時唔淡出。
 */
import type { CatalogAlbum } from '@r-gram/catalog';
import type { InfoLayout } from '../../stage/layouts';
import { fitText } from '../../utils/fitText';
import { isLatin } from '../../utils/isLatin';
import type { TextFont, TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';

const LATIN_WEIGHT = 400;
const CJK_TITLE_WEIGHT = 900;
const YEAR_WEIGHT = 400;

interface AlbumProps {
    info: InfoLayout;
    accent: string;
    measure: TextMeasure;
    album: CatalogAlbum;
}

/** 碟名：放唔落就縮字（FR-036、D23）；拎住另一隻碟時可用闊度收窄（同一個 fit，只換闊度） */
export const AlbumTitle = ({
    info,
    album,
    measure,
    held,
}: Omit<AlbumProps, 'accent'> & { held: boolean }) => {
    // 設計稿 isLatin()：全部係英文數字就用 slab，否則用 Noto Sans HK
    const latin = isLatin(album.title);
    const face = latin ? info.title.latin : info.title.cjk;
    const font = (size: number): TextFont => ({
        family: latin ? 'slab' : 'cjk',
        size,
        weight: latin ? LATIN_WEIGHT : CJK_TITLE_WEIGHT,
        spacing: face.spacing,
    });
    const fitted = fitText(album.title, {
        size: face.size,
        minSize: info.title.minSize,
        maxWidth: (held ? info.title.rightWhenHeld : info.title.maxRight) - info.title.x,
        measure: (text, size) => measure(text, font(size)),
    });
    return (
        <text
            data-part="album-title"
            className={`info-title info-title--${latin ? 'latin' : 'cjk'}`}
            x={info.title.x}
            y={face.y}
            fontSize={fitted.size}
            letterSpacing={face.spacing}
        >
            {fitted.text}
        </text>
    );
};

/**
 * 年份（Favourites 碟係「N 首」，T-070）+ 後面一條專輯色橫線（冇字就淨係橫線）
 */
export const YearRule = ({
    info,
    text,
    accent,
    measure,
}: Omit<AlbumProps, 'album'> & { text: string }) => {
    const { year, rule } = info;
    const width = measure(text, {
        family: 'mixed',
        size: year.size,
        weight: YEAR_WEIGHT,
        spacing: year.spacing,
    });
    const start = year.x + width + rule.gap;
    return (
        <>
            {text && (
                <text
                    data-part="album-year"
                    className="info-year"
                    x={year.x}
                    y={year.y}
                    fontSize={year.size}
                    letterSpacing={year.spacing}
                >
                    {text}
                </text>
            )}
            <path
                data-part="album-rule"
                d={`M${px(start)} ${rule.y}H${px(start + rule.length)}`}
                stroke={accent}
                strokeWidth={rule.width}
                strokeLinecap="round"
            />
        </>
    );
};
