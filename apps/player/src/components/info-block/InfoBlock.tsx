import type { CatalogAlbum, CatalogTrack } from '@r-gram/catalog';
import type { InfoLayout } from '../../stage/layouts';
import { fitText } from '../../utils/fitText';
import { isLatin } from '../../utils/isLatin';
import type { TextFont, TextMeasure } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import './infoBlock.css';
import { SongLines } from './SongLines';

const LATIN_WEIGHT = 400;
const CJK_TITLE_WEIGHT = 900;
const YEAR_WEIGHT = 400;

interface InfoBlockProps {
    info: InfoLayout;
    album: CatalogAlbum | null;
    /** 播緊（或者停咗）嘅歌；未有 = 只顯示碟名同年份 */
    track: CatalogTrack | null;
    timeText: string;
    accent: string;
    measure: TextMeasure;
}

type AlbumProps = Pick<InfoBlockProps, 'info' | 'accent' | 'measure'> & { album: CatalogAlbum };

/** 碟名：放唔落就縮字（FR-036、D23） */
const AlbumTitle = ({ info, album, measure }: Omit<AlbumProps, 'accent'>) => {
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
        maxWidth: info.title.maxRight - info.title.x,
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

/** 年份 + 後面一條專輯色橫線（冇年份就淨係橫線） */
const YearRule = ({ info, album, accent, measure }: AlbumProps) => {
    const { year, rule } = info;
    const text = album.year === null ? '' : String(album.year);
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

/**
 * 左上資訊（設計稿 info()；Functional Spec US-002）：碟名 → 年份 + 專輯色橫線 → 歌名 → 「第 nn 首 · m:ss」。
 * 屬於貼頂組（FR-039）。歌書 / 歌單嘅白字版本喺各自嘅任務加。
 */
export const InfoBlock = ({ info, album, track, timeText, accent, measure }: InfoBlockProps) => {
    if (!album) return null;
    return (
        <g data-part="info">
            <AlbumTitle info={info} album={album} measure={measure} />
            <YearRule info={info} album={album} accent={accent} measure={measure} />
            {track && (
                <SongLines
                    info={info}
                    track={track}
                    timeText={timeText}
                    accent={accent}
                    measure={measure}
                />
            )}
        </g>
    );
};
