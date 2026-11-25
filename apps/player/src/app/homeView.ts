/*
 * 主頁畫面要嘅衍生值（純函數）：由場景狀態、播放狀態同 catalog 計，唔另外存（Technical Spec「衍生狀態唔另外存」）。
 * 左上資訊、唱片夾同歌號跟播緊嘅歌（播放狀態），唔跟 `selectedTrackId`（backlog B-029、B-030）。
 */
import {
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    glowColor,
    mediaUrl,
    NEUTRAL_ACCENT,
} from '@r-gram/catalog';
import { coverVariantOf, type CoverVariants, NO_COVER_PICKS } from '../catalog/coverVariants';
import { albumArt, albumTracks, findAlbum, isPlayable } from '../catalog/selectors';
import type { ArmPose } from '../components/tonearm/armPose';
import type { SpindleMode } from '../components/spindle/Spindle';
import { formatTime } from '../utils/formatTime';
import { dialView, type DialView } from './dialView';
import type { PlaybackState } from './playbackState';
import type { StageState } from './stageReducer';

/** 播放狀態入面有歌，而且係畫面上呢隻碟嘅（暫停期間轉去睇另一隻碟就唔係：D36 ④） */
const isLoadedHere = (stage: StageState, playback: PlaybackState): boolean =>
    playback.status !== 'idle' && playback.albumId === stage.viewAlbumId;

/** 唱臂姿勢（FR-040、D36）：其餘情況（未揀歌、MV、熄 MV 之後、重開 app、睇緊另一隻碟）一律泊位 */
export const armPose = (stage: StageState, playback: PlaybackState): ArmPose => {
    if (!isLoadedHere(stage, playback) || stage.overlay === 'mv') return 'parked';
    if (playback.status === 'playing') return 'playing';
    return playback.pauseReason === 'user' ? 'lifted' : 'parked';
};

/** 唱片夾：歌單入面係 play；呢隻碟有歌就 pause / play；冇就「開啟歌單」 */
export const spindleMode = (stage: StageState, playback: PlaybackState): SpindleMode => {
    if (stage.scene === 'list') return 'list';
    if (!isLoadedHere(stage, playback)) return 'idle';
    return playback.status === 'playing' && stage.overlay !== 'mv' ? 'playing' : 'paused';
};

/** 打開歌單時預先揀中嘅歌（US-004）：已揀中嗰首，否則第一首播得嘅 */
export const listFocusTrackId = (document: CatalogDocument, stage: StageState): string | null => {
    if (stage.selectedTrackId) return stage.selectedTrackId;
    if (!stage.viewAlbumId) return null;
    return albumTracks(document, stage.viewAlbumId).find(isPlayable)?.id ?? null;
};

export interface HomeView {
    album: CatalogAlbum | null;
    /** 左上顯示、唱片夾控制嘅歌：播放狀態入面嗰首（要係呢隻碟嘅） */
    track: CatalogTrack | null;
    accent: string;
    glow: string;
    /** 封面圖網址；冇封面 = null（碟面用專輯色） */
    coverUrl: string | null;
    spindle: SpindleMode;
    armPose: ArmPose;
    /** 播放進度 0–1 */
    progress: number;
    timeText: string;
    hasSong: boolean;
    hasMv: boolean;
    playing: boolean;
    listOpen: boolean;
    bookletOpen: boolean;
    mvOpen: boolean;
    /** 旋鈕、刻度、字母盤、轉盤上面嘅碟（T-036） */
    dial: DialView;
    /** 唱片機入面嗰隻碟（播放狀態，有歌播緊或者暫停緊）；冇 = null */
    loadedAlbumId: string | null;
    /** 拎住另一隻碟：有歌載入，但旋鈕指住（或者鬆手停喺）另一隻碟（CR-005 第 18 版；畫面係 T-048） */
    holding: boolean;
    /** 唱臂同三粒細掣淡出（揀碟期間、拎住另一隻碟時；Functional Spec D52） */
    chromeHidden: boolean;
    /** 左上歌名嗰部分（音量條、歌名、心形、「第 nn 首」同時間）淡出，只留碟名同年份 */
    songHidden: boolean;
    /** 畫面上嘅碟轉緊：播緊呢隻碟，而且唔係揀緊碟、唔係拎住另一隻碟 */
    spinning: boolean;
}

const loadedTrack = (album: CatalogAlbum | null, stage: StageState, playback: PlaybackState) =>
    isLoadedHere(stage, playback)
        ? (album?.tracks.find((track) => track.id === playback.trackId) ?? null)
        : null;

/** 封面用開 app 時揀中嗰張（CR-005 D56）；專輯色永遠跟第一張 */
const colours = (document: CatalogDocument, album: CatalogAlbum | null, covers: CoverVariants) => {
    const accent = album?.accent ?? NEUTRAL_ACCENT;
    const cover = album ? albumArt(album, coverVariantOf(covers, album.id)).cover : null;
    const coverUrl = cover ? mediaUrl(document.imageBase, cover) : null;
    return { accent, glow: glowColor(accent), coverUrl };
};

/** 唱片機入面嘅碟：播放狀態唔係 idle 先有 */
const loadedAlbumOf = (playback: PlaybackState): string | null =>
    playback.status === 'idle' ? null : playback.albumId;

/**
 * 揀碟相關嘅衍生值（Technical Spec「補充：第 18 版」）：`holding` = 載入嘅碟 ≠ 顯示嘅碟（主頁或者揀緊碟）；
 * 揀碟期間或者拎住另一隻碟時，唱臂、細掣同歌名嗰部分淡出，碟停轉
 */
const choosingView = (stage: StageState, playback: PlaybackState, pose: ArmPose) => {
    const loadedAlbumId = loadedAlbumOf(playback);
    const onHome = stage.scene === 'home' || stage.scene === 'discChange';
    const holding = loadedAlbumId !== null && onHome && stage.viewAlbumId !== loadedAlbumId;
    const chromeHidden = stage.scene === 'discChange' || holding;
    return {
        loadedAlbumId,
        holding,
        chromeHidden,
        songHidden: chromeHidden,
        spinning: pose === 'playing' && !chromeHidden,
    };
};

const progressOf = ({ positionSec, durationSec }: PlaybackState): number =>
    durationSec ? Math.min(1, positionSec / durationSec) : 0;

export const homeView = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState,
    covers: CoverVariants = NO_COVER_PICKS,
): HomeView => {
    const album = stage.viewAlbumId ? findAlbum(document, stage.viewAlbumId) : null;
    const track = loadedTrack(album, stage, playback);
    const spindle = spindleMode(stage, playback);
    const pose = armPose(stage, playback);
    return {
        album,
        track,
        ...colours(document, album, covers),
        spindle,
        armPose: pose,
        progress: progressOf(playback),
        timeText: formatTime(playback.positionSec),
        hasSong: track !== null,
        hasMv: Boolean(track?.mv),
        playing: spindle === 'playing',
        listOpen: stage.scene === 'list',
        bookletOpen: stage.overlay === 'booklet',
        mvOpen: stage.overlay === 'mv',
        dial: dialView(document, stage, covers),
        ...choosingView(stage, playback, pose),
    };
};
