import { useEffect, useState } from 'react';
import { MOTION } from '../../config/motion';
import { prefersReducedMotion } from '../../utils/motion';
import { type ArmLeadIn, type ArmPose, leadInAfter, leadInStart } from './armPose';

/** 每段開場幾耐（同 tonearm.css 嘅過場同一組 token） */
const LEAD_IN_MS: Readonly<Record<Exclude<ArmLeadIn, null>, number>> = {
    swing: MOTION.scene.tonearmMs,
    drop: MOTION.scene.needleDropMs,
};

/**
 * 跟住唱臂姿勢計開場進行緊邊段。姿勢由泊位變做 playing 先開始：swing → drop → null。
 * 開場途中姿勢再變（例如即刻暫停）就即刻停。減少動態效果時冇開場，直接去終點。
 * 第一次 render 冇開場（例如重開 app 時已經係某個姿勢）。
 */
export const useArmLeadIn = (pose: ArmPose): ArmLeadIn => {
    const [seenPose, setSeenPose] = useState(pose);
    const [leadIn, setLeadIn] = useState<ArmLeadIn>(null);
    // 姿勢一變就喺同一次 render 入面重設（React「render 期間調整 state」嘅做法），唔使等 effect 閃一格
    if (pose !== seenPose) {
        setSeenPose(pose);
        setLeadIn(prefersReducedMotion() ? null : leadInStart(seenPose, pose));
    }
    useEffect(() => {
        if (!leadIn) return undefined;
        const timer = setTimeout(() => setLeadIn(leadInAfter(leadIn)), LEAD_IN_MS[leadIn]);
        return () => clearTimeout(timer);
    }, [leadIn]);
    return leadIn;
};
