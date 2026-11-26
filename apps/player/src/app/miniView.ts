/*
 * 細唱片機（純函數；Functional Spec FR-043、D58；Technical Spec「補充：第 18 版」）：拎住另一隻碟時喺右上角照播
 * 載入嘅碟。碟面、歌名、唱臂姿勢全部跟載入嘅碟（播放狀態），唔跟畫面上嘅碟。
 */
import { type CatalogDocument, glowColor } from '@r-gram/catalog';
import { findTrack } from '../catalog/selectors';
import type { ArmPose } from '../components/tonearm/armPose';
import type { DialEntry } from './dialView';
import type { PlaybackState } from '../playback/playbackState';

export interface MiniView {
    /** 拎住另一隻碟先顯示；唔顯示時照畫（淡出），但唔接受 pointer、唔入 Tab 次序 */
    shown: boolean;
    /** 載入嘅歌嘅歌名；catalog 搵唔到 = '' */
    title: string;
    /** 唔係播緊（寫「已暫停」，D58 ①） */
    paused: boolean;
    /** 播完（寫「已播完」、唱針泊位，B-086 ⑥；觸發係 T-038） */
    ended: boolean;
    /** 載入失敗（寫「未能播放」、唱針泊位；US-004、D58 ①、S-242） */
    failed: boolean;
    armPose: ArmPose;
    /** 碟轉緊：播緊，而且細唱片機睇得到 */
    spinning: boolean;
    accent: string;
    glow: string;
    coverUrl: string | null;
    thumbUrl: string | null;
}

/**
 * 載入嘅碟嘅唱臂姿勢（FR-040、D36、D58 ①）：播緊落針；用戶暫停升針；
 * 其他停低嘅原因（熄咗 MV、重開 app 回復）泊位。大唱片機喺畫面係載入嘅碟時都係用呢套
 */
export const loadedArmPose = (playback: PlaybackState): ArmPose => {
    if (playback.status === 'playing') return 'playing';
    return playback.status === 'paused' && playback.pauseReason === 'user' ? 'lifted' : 'parked';
};

/** 冇歌載入 = null；碟面用轉盤嗰格（Favourites 碟係 ♥ 格），所以封面同開 app 揀中嗰張一致 */
export const miniView = (
    document: CatalogDocument,
    playback: PlaybackState,
    entries: readonly DialEntry[],
    holding: boolean,
): MiniView | null => {
    const disc = entries.find((entry) => entry.albumId === playback.albumId);
    if (playback.status === 'idle' || !disc) return null;
    const playing = playback.status === 'playing';
    const found = playback.trackId ? findTrack(document, playback.trackId) : null;
    return {
        shown: holding,
        title: found?.track.title ?? '',
        paused: !playing,
        ended: playback.status === 'ended',
        failed: playback.status === 'error',
        armPose: loadedArmPose(playback),
        spinning: playing && holding,
        accent: disc.accent,
        glow: glowColor(disc.accent),
        coverUrl: disc.coverUrl,
        thumbUrl: disc.thumbUrl,
    };
};
