import { type Dispatch, useEffect, useState, useSyncExternalStore } from 'react';
import { createMvController, type MvController, type MvSnapshot } from '../mv/mvController';
import { createVideoEngine } from '../mv/videoEngine';
import type { TvHandlers } from '../components/tv/TvButtons';
import type { HomeView } from './homeView';
import type { StageAction, StageState } from './stageReducer';
import { tvView, type TvView } from './tvView';

/**
 * 電視 controller 成個 app 一個：第一次 render 嗰個一直用。冇畀（測試、spike 頁）就自己建一個
 *（唔接鎖屏）；app 一律由 main.tsx 畀（同唱片共用 Media Session 嘅目標）
 */
export const useMvController = (controller: MvController | undefined) => {
    const [mv] = useState(
        () => controller ?? createMvController({ engine: createVideoEngine(), sessions: null }),
    );
    const snapshot = useSyncExternalStore(mv.subscribe, mv.getSnapshot);
    return { mv, snapshot };
};

/**
 * 電視熄機 + 收埋完（或者播完收埋）先轉場景狀態（Technical Spec「MV 電視過場」）：
 * 收埋期間 overlay 仲係 `mv`，背後唱片機照舊模糊、㩒唔到
 */
export const useTvClosed = (
    snapshot: MvSnapshot,
    stage: StageState,
    dispatch: Dispatch<StageAction>,
) => {
    const closed = snapshot.phase === 'closed' && stage.overlay === 'mv';
    useEffect(() => {
        if (closed) dispatch({ type: 'closeMv' });
    }, [closed, dispatch]);
};

export interface TvParts {
    tv: TvView | null;
    tvHandlers: TvHandlers | null;
}

/** 電視畫面同 ▶ ❚❚ ■（直接去電視 controller，唔經場景狀態機） */
export const tvParts = (mv: MvController, snapshot: MvSnapshot, view: HomeView): TvParts => {
    const tv = tvView(snapshot, { accent: view.accent, glow: view.glow }, mv.element);
    if (!tv) return { tv: null, tvHandlers: null };
    return {
        tv,
        tvHandlers: { onPlay: () => mv.play(), onPause: () => mv.pause(), onStop: () => mv.stop() },
    };
};
