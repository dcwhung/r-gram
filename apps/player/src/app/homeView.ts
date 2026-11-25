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
import { albumTracks, findAlbum, isPlayable } from '../catalog/selectors';
import type { ArmPose } from '../components/tonearm/armPose';
import type { SpindleMode } from '../components/spindle/Spindle';
import { formatTime } from '../utils/formatTime';
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
}

const loadedTrack = (album: CatalogAlbum | null, stage: StageState, playback: PlaybackState) =>
    isLoadedHere(stage, playback)
        ? (album?.tracks.find((track) => track.id === playback.trackId) ?? null)
        : null;

const colours = (document: CatalogDocument, album: CatalogAlbum | null) => {
    const accent = album?.accent ?? NEUTRAL_ACCENT;
    const coverUrl = album?.cover ? mediaUrl(document.imageBase, album.cover) : null;
    return { accent, glow: glowColor(accent), coverUrl };
};

const progressOf = ({ positionSec, durationSec }: PlaybackState): number =>
    durationSec ? Math.min(1, positionSec / durationSec) : 0;

export const homeView = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState,
): HomeView => {
    const album = stage.viewAlbumId ? findAlbum(document, stage.viewAlbumId) : null;
    const track = loadedTrack(album, stage, playback);
    const spindle = spindleMode(stage, playback);
    return {
        album,
        track,
        ...colours(document, album),
        spindle,
        armPose: armPose(stage, playback),
        progress: progressOf(playback),
        timeText: formatTime(playback.positionSec),
        hasSong: track !== null,
        hasMv: Boolean(track?.mv),
        playing: spindle === 'playing',
        listOpen: stage.scene === 'list',
        bookletOpen: stage.overlay === 'booklet',
        mvOpen: stage.overlay === 'mv',
    };
};
