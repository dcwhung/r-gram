import { useEffect, useReducer } from 'react';
import { MOTION } from '../../config/motion';
import { prefersReducedMotion } from '../../utils/motion';
import { type ArmLeadIn, type ArmPose, leadInAfter, leadInOnPose } from './armPose';

/** 每段開場幾耐（同 tonearm.css 嘅過場同一組 token） */
const LEAD_IN_MS: Readonly<Record<Exclude<ArmLeadIn, null>, number>> = {
    swing: MOTION.scene.tonearmMs,
    drop: MOTION.scene.needleDropMs,
};

interface LeadInState {
    /** 上一次見到嘅姿勢 */
    pose: ArmPose;
    leadIn: ArmLeadIn;
}

type LeadInAction = { type: 'pose'; pose: ArmPose; reduceMotion: boolean } | { type: 'elapsed' };

/** 姿勢變 → 計新開場；一段時間到 → 下一段（要睇埋而家個姿勢：暫停緊就唔放低唱針） */
const leadInReducer = (state: LeadInState, action: LeadInAction): LeadInState => {
    if (action.type === 'elapsed') {
        return { ...state, leadIn: state.leadIn && leadInAfter(state.leadIn, state.pose) };
    }
    const leadIn = action.reduceMotion ? null : leadInOnPose(state.leadIn, state.pose, action.pose);
    return { pose: action.pose, leadIn };
};

/**
 * 跟住唱臂姿勢計開場進行緊邊段。`instant`：唱臂淡出咗（揀碟期間，T-036）時姿勢變咗就即時到位、唔行開場，
 * 淡入返嗰陣已經喺新位（設計稿 swapAlbum、data-arm-instant；返載入嘅碟唔行開場，FR-040）。
 *姿勢由泊位變做 playing 先開始：swing → drop → null。
 * 轉入途中暫停 / 再播，swing 照計時（唱臂仲轉緊，S-072）；返泊位就即刻停。減少動態效果時冇開場，直接去終點。
 * 第一次 render 冇開場（例如重開 app 時已經係某個姿勢）。
 */
export const useArmLeadIn = (pose: ArmPose, instant = false): ArmLeadIn => {
    const [state, dispatch] = useReducer(leadInReducer, { pose, leadIn: null });
    // 姿勢一變就喺同一次 render 入面重設（React「render 期間調整 state」嘅做法），唔使等 effect 閃一格
    if (pose !== state.pose) {
        dispatch({ type: 'pose', pose, reduceMotion: instant || prefersReducedMotion() });
    }
    const { leadIn } = state;
    // 開場段數唔變（例如 swing 途中暫停）就唔重新計時：timer 由呢段開始嗰陣計
    useEffect(() => {
        if (!leadIn) return undefined;
        const timer = setTimeout(() => dispatch({ type: 'elapsed' }), LEAD_IN_MS[leadIn]);
        return () => clearTimeout(timer);
    }, [leadIn]);
    return leadIn;
};
