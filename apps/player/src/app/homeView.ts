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
import { t } from '../i18n/t';
import { DEFAULT_PLAY_MODE, type PlayMode } from '../playback/playModes';
import { formatTime } from '../utils/formatTime';
import { dialView, type DialView } from './dialView';
import { type TrackColumnView, trackColumnView } from './heldTracksView';
import { isHolding, isLoadedHere, loadedAlbumOf } from './holding';
import { type ArcListView, listView } from './listView';
import { loadedArmPose, type MiniView, miniView } from './miniView';
import { IDLE_PLAYBACK, type PlaybackState } from '../playback/playbackState';
import type { StageState } from './stageReducer';

/**
 * 唱臂姿勢（FR-040、D36）：其餘情況（未揀歌、MV、熄 MV 之後、重開 app、拎住另一隻碟）一律泊位。
 * 拎住另一隻碟時大唱片機嘅唱臂淡出咗；載入嘅碟嘅唱臂喺細唱片機（miniView）
 */
export const armPose = (stage: StageState, playback: PlaybackState): ArmPose =>
    !isLoadedHere(stage, playback) || stage.overlay === 'mv' ? 'parked' : loadedArmPose(playback);

/** 唱片夾：歌單入面係 play；呢隻碟有歌就 pause / play；未揀歌 = play（播第一首，B-086 ③） */
export const spindleMode = (stage: StageState, playback: PlaybackState): SpindleMode => {
    if (stage.scene === 'list') return 'list';
    if (!isLoadedHere(stage, playback)) return 'idle';
    return playback.status === 'playing' && stage.overlay !== 'mv' ? 'playing' : 'paused';
};

/**
 * 打開歌單時框入面嘅歌（US-004）：載入嘅碟 = 播緊（暫停緊）嗰首（設計稿 SONG = 框入面嗰首，T-037）；
 * 未揀歌嘅碟 = 第一首播得嘅（設計稿第 19 版 openListFloating()；B-086 ②）
 */
export const listFocusTrackId = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState = IDLE_PLAYBACK,
): string | null => {
    if (isLoadedHere(stage, playback)) return playback.trackId;
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
    /** 「第 nn 首 · 」後面：播放位置 `m:ss`；載入失敗 = 一行錯誤提示（US-004） */
    timeText: string;
    /** 呢隻碟嘅歌載入失敗（唱臂泊位、唱片夾 play；再㩒 = 由泊位重新開始同一首） */
    failed: boolean;
    /** 而家嘅播放模式（模式掣嘅 icon 同名） */
    mode: PlayMode;
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
    /** 唱臂淡出：有細唱片機（拎住另一隻碟）或者字母盤開住（B-086 ⑤ (ii)） */
    armHidden: boolean;
    /** 三粒細掣淡出：字母盤開住先淡出，鬆手就出返，拎住另一隻碟都一樣（B-086 ⑤ (i)） */
    buttonsHidden: boolean;
    /** 左上歌名嗰部分（音量條、歌名、心形、「第 nn 首」同時間）淡出，只留碟名同年份 */
    songHidden: boolean;
    /** 畫面上嘅碟轉緊：播緊呢隻碟、真係出緊聲，而且唔係揀緊碟、唔係拎住另一隻碟 */
    spinning: boolean;
    /** 右上角嘅細唱片機（載入嘅碟，T-048）；冇歌載入 = null */
    mini: MiniView | null;
    /** 碟名下面嘅歌單欄（純睇；字母盤開住或者未揀歌先有，B-086）；冇 = null */
    trackColumn: TrackColumnView | null;
    /** 主頁㩒碟面開弧線歌單（T-037、B-086 ②）：字母盤收埋就得，拎住另一隻碟都一樣；電視開住唔得 */
    canOpenList: boolean;
    /** 弧線歌單（T-037）；冇開 = null */
    list: ArcListView | null;
    /** 歌單開住時框入面嗰首（左上白字顯示）；冇 = null */
    listTrack: CatalogTrack | null;
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

/**
 * 揀碟相關嘅衍生值（Technical Spec「補充：第 18 版」；設計稿第 19 版 scene() 嘅 armFade、buttonsFade）：
 * `holding` = 載入嘅碟 ≠ 顯示嘅碟（主頁或者揀緊碟）。字母盤開住：唱臂、細掣淡出；拎住另一隻碟：唱臂淡出
 *（細唱片機有自己支唱臂），細掣照出。兩種情況歌名嗰部分都淡出，碟停轉
 */
const choosingView = (
    stage: StageState,
    playback: PlaybackState,
    pose: ArmPose,
    audible: boolean,
) => {
    const loadedAlbumId = loadedAlbumOf(playback);
    const holding = isHolding(stage, loadedAlbumId);
    const dialOpen = stage.scene === 'discChange';
    const armHidden = dialOpen || holding;
    return {
        loadedAlbumId,
        holding,
        armHidden,
        buttonsHidden: dialOpen,
        // 弧線歌單開住：左上係框入面嗰首（設計稿 songFade = list ? 1）
        songHidden: armHidden && stage.scene !== 'list',
        spinning: pose === 'playing' && !armHidden && audible,
    };
};

/** 播放進度（0–1）同左上嘅時間；載入失敗時間嗰度變錯誤提示 */
const timing = ({ positionSec, durationSec }: PlaybackState, failed: boolean) => ({
    progress: durationSec ? Math.min(1, positionSec / durationSec) : 0,
    timeText: failed ? t('track.failed') : formatTime(positionSec),
    failed,
});

/** 右上角細唱片機（拎住另一隻碟，T-048）、碟名下面嘅歌單欄（B-086） */
const heldParts = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState,
    dial: DialView,
    holding: boolean,
) => ({
    mini: miniView(document, playback, dial.entries, holding),
    trackColumn: trackColumnView(document, stage, playback),
});

/** 有歌（歌書有內容）、有 MV；播放模式（模式掣） */
const songFlags = (track: CatalogTrack | null, mode: PlayMode) => ({
    hasSong: track !== null,
    hasMv: Boolean(track?.mv),
    mode,
});

/** 歌單、歌書、電視開住未 */
const openFlags = (stage: StageState) => ({
    listOpen: stage.scene === 'list',
    bookletOpen: stage.overlay === 'booklet',
    mvOpen: stage.overlay === 'mv',
});

/** 弧線歌單：設計稿第 19 版 ACTIONS.list = 主頁（冇開歌單、電視、字母盤），拎住另一隻碟都得 */
const listParts = (
    document: CatalogDocument,
    album: CatalogAlbum | null,
    stage: StageState,
    playback: PlaybackState,
) => ({
    canOpenList: album !== null && stage.scene === 'home' && stage.overlay !== 'mv',
    list: listView(document, stage, playback),
    listTrack:
        stage.scene === 'list'
            ? (album?.tracks.find((track) => track.id === stage.selectedTrackId) ?? null)
            : null,
});

export const homeView = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState,
    covers: CoverVariants = NO_COVER_PICKS,
    mode: PlayMode = DEFAULT_PLAY_MODE,
    audible = true,
): HomeView => {
    const album = stage.viewAlbumId ? findAlbum(document, stage.viewAlbumId) : null;
    const track = loadedTrack(album, stage, playback);
    const spindle = spindleMode(stage, playback);
    const pose = armPose(stage, playback);
    const dial = dialView(document, stage, covers);
    const choosing = choosingView(stage, playback, pose, audible);
    return {
        album,
        track,
        ...colours(document, album, covers),
        spindle,
        armPose: pose,
        ...timing(playback, track !== null && playback.status === 'error'),
        ...songFlags(track, mode),
        playing: spindle === 'playing',
        ...openFlags(stage),
        dial,
        ...choosing,
        ...heldParts(document, stage, playback, dial, choosing.holding),
        ...listParts(document, album, stage, playback),
    };
};
