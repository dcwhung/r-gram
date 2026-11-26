import type { CatalogAlbum, CatalogTrack } from '@r-gram/catalog';
import type { InfoLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { ChromeFade } from '../chrome-fade/ChromeFade';
import { AlbumTitle, YearRule } from './AlbumLines';
import './infoBlock.css';
import { SongPart } from './SongPart';

export interface InfoBlockProps {
    info: InfoLayout;
    album: CatalogAlbum | null;
    /** 播緊（或者停咗）嘅歌；未有 = 只顯示碟名同年份 */
    track: CatalogTrack | null;
    timeText: string;
    accent: string;
    /** 著燈色（已收藏嘅心形，T-070） */
    glow: string;
    measure: TextMeasure;
    /** 感應範圍邊長（設計單位；≥ 44pt，`hitSizeUnits`）：心形掣用 */
    hitSize: number;
    /** 碟名下面嗰行：冇畀 = 年份（Favourites 碟係「N 首」，T-070） */
    sub?: string;
    /** 歌名嗰部分淡出（揀碟期間） */
    songHidden?: boolean;
    /** 拎住另一隻碟：右上角有細唱片機，碟名闊度收窄到佢左邊（T-048） */
    held?: boolean;
    /** 歌單開住（T-037）：轉白字，歌名嗰部分顯示框入面嗰首（`listTrack`；冇歌 = null） */
    listOpen?: boolean;
    listTrack?: CatalogTrack | null;
    /** 左上嗰首歌係咪收藏咗（心形掣，US-010） */
    favourite?: boolean;
    onFavourite?: () => void;
    /** Favourites 碟：嗰首歌原本嗰隻碟（D19）；其他碟 = null */
    origin?: string | null;
}

const yearText = (album: CatalogAlbum) => (album.year === null ? '' : String(album.year));

/**
 * 左上資訊（設計稿 info()；Functional Spec US-002）：碟名 → 年份 + 專輯色橫線 → 歌名 + 心形掣 → 「第 nn 首 · m:ss」。
 * 屬於貼頂組（FR-039）。歌單開住（T-037）轉白字、歌名嗰部分係框入面嗰首；歌書嘅白字版本係 T-072。
 * 揀碟時（`songHidden`）歌名嗰部分淡出，只留碟名同年份（Functional Spec D52、第 18 版確認）。
 * Favourites 碟（T-070）：年份位置係「N 首」，歌名下面加原本嗰隻碟。
 */
export const InfoBlock = (props: InfoBlockProps) => {
    const { album, held = false, sub, ...song } = props;
    const { info, accent, measure, songHidden = false } = song;
    if (!album) return null;
    return (
        <g data-part="info" className={props.listOpen ? 'info info--dark' : 'info'}>
            <AlbumTitle info={info} album={album} measure={measure} held={held} />
            <YearRule info={info} text={sub ?? yearText(album)} accent={accent} measure={measure} />
            <ChromeFade part="song-fade" hidden={songHidden}>
                <SongPart {...song} />
            </ChromeFade>
        </g>
    );
};
