import { useEffect, useState } from 'react';

/** 記號留幾多格：第一格瀏覽器用「冇過場」畫出新位置，第二格先除記號（之後嘅改動照有過場） */
const FRAMES_TO_HOLD = 2;

interface SwapState {
    key: string | null;
    framesLeft: number;
}

/**
 * 顯示嘅碟換咗（例如由拎住嘅碟返去載入嘅碟，T-048）：由嗰次 render 起，唱臂即時到位、唔行開場，
 * 等兩格先恢復過場（設計稿 swapAlbum 嘅 data-arm-instant）。第一次 render 唔算換碟。
 */
export const useSwapInstant = (key: string | null): boolean => {
    const [state, setState] = useState<SwapState>({ key, framesLeft: 0 });
    const changed = state.key !== key;
    // React「render 期間調整 state」：同一次 commit 已經用到記號
    if (changed) setState({ key, framesLeft: FRAMES_TO_HOLD });
    const { framesLeft } = state;
    useEffect(() => {
        if (framesLeft === 0) return undefined;
        const frame = requestAnimationFrame(() =>
            setState((current) => ({ ...current, framesLeft: current.framesLeft - 1 })),
        );
        return () => cancelAnimationFrame(frame);
    }, [framesLeft]);
    return changed || framesLeft > 0;
};
