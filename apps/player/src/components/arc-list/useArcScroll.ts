/*
 * 弧線歌單嘅捲動（Technical Spec「歌單：拖動 / 滾輪捲動 + 吸附」；設計稿第 18 版：框入面係揀中嗰行）：
 * - 拖動：行跟手指沿弧線行（一行 = 弧線上一格嘅長度），鬆手吸附去最近一行播得嘅歌；拖過唔當㩒
 * - 滾輪：儲夠一行先移一行（觸控板）；轉方向就由頭儲
 * - 鍵盤（焦點喺 listbox）：上下鍵一行、Page Up／Down 一版（見到嘅行數）、Home／End 頭尾；灰色行跳過；
 *   Enter／空白鍵播框入面嗰首
 * 停低（吸附、鍵盤、滾輪）就話畀外面知框入面係邊首（左上白字跟住變）。冇過場：位置即時到（減少動態效果唔使另外處理）。
 */
import { type KeyboardEvent, type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import type { TrackRow } from '../../app/heldTracksView';
import { nextRowIndex, stepRowIndex } from '../scroll/rowStep';
import { useDragScroll } from '../scroll/useDragScroll';
import { useWheel, wheelUnits } from '../scroll/useWheel';
import { clampOffset, snapIndex, wheelSteps } from './arcScroll';

const ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];

export interface ArcScrollSpec {
    rows: readonly TrackRow[];
    /** 開嗰陣框入面嗰行 */
    initial: number;
    /** 一行喺弧線上嘅長度（設計單位） */
    pitch: number;
    /** 一版幾多行（Page Up／Down） */
    perPage: number;
    /** 1 設計單位 = 幾多 CSS px */
    unit: number;
    thresholdPx: number;
    onFocus: (trackId: string) => void;
    onPlay: (trackId: string) => void;
}

export interface ArcScroll {
    /** 捲動位置（行；拖動中途有小數） */
    offset: number;
    /** 框入面（最近）嗰行 */
    active: number;
    rootRef: RefObject<SVGGElement | null>;
    dragHandlers: ReturnType<typeof useDragScroll>;
    onKeyDown: (event: KeyboardEvent) => void;
}

/** 捲動位置：state 畀畫面用，ref 畀同一個 tick 入面嘅事件（拖動、滾輪）讀最新值 */
const useOffset = (initial: number) => {
    const [offset, setState] = useState(initial);
    const latest = useRef(initial);
    const setOffset = useCallback((value: number) => {
        latest.current = value;
        setState(value);
    }, []);
    return { offset, latest, setOffset };
};

/** 滾輪 → 停喺邊行（儲夠一行先郁） */
const useWheelStep = (
    spec: ArcScrollSpec,
    latest: RefObject<number>,
    settle: (index: number) => void,
) => {
    const rest = useRef(0);
    const { rows, pitch, perPage, unit } = spec;
    const pressable = usePressable(rows);
    const onWheel = useCallback(
        (event: WheelEvent) => {
            const units = wheelUnits(event, { pitch, room: pitch * perPage, unit });
            const carried = Math.sign(units) === Math.sign(rest.current) ? rest.current : 0;
            const { steps, rest: left } = wheelSteps(carried + units, pitch);
            rest.current = left;
            if (steps === 0) return;
            const current = Math.round(latest.current);
            const target = clampOffset(current + steps, rows.length);
            settle(stepRowIndex(current, steps, pressable) ?? Math.round(target));
        },
        [pitch, perPage, unit, rows.length, pressable, latest, settle],
    );
    return useWheel(onWheel);
};

/** 播得嘅行（由細到大）：鍵盤、吸附、滾輪只停喺呢啲 */
const usePressable = (rows: readonly TrackRow[]) => {
    const key = rows.map((row) => (row.playable ? '1' : '0')).join('');
    return useMemo(() => [...key].flatMap((flag, index) => (flag === '1' ? [index] : [])), [key]);
};

const keyHandler =
    (
        spec: ArcScrollSpec,
        active: number,
        pressable: readonly number[],
        settle: (i: number) => void,
    ) =>
    (event: KeyboardEvent) => {
        if (ACTIVATION_KEYS.includes(event.key)) {
            event.preventDefault();
            const row = spec.rows[active];
            if (!event.repeat && row?.playable) spec.onPlay(row.id);
            return;
        }
        const next = nextRowIndex(event.key, active, pressable, spec.perPage);
        if (next === null) return;
        event.preventDefault();
        settle(next);
    };

export const useArcScroll = (spec: ArcScrollSpec): ArcScroll => {
    const { rows, pitch, onFocus } = spec;
    const { offset, latest, setOffset } = useOffset(spec.initial);
    const pressable = usePressable(rows);
    const settle = useCallback(
        (index: number) => {
            setOffset(index);
            const row = rows[index];
            if (row) onFocus(row.id);
        },
        [rows, onFocus, setOffset],
    );
    const rootRef = useWheelStep(spec, latest, settle);
    const dragHandlers = useDragScroll(
        spec,
        (units) => setOffset(clampOffset(latest.current + units / pitch, rows.length)),
        () => settle(snapIndex(latest.current, pressable, rows.length)),
    );
    const active = Math.round(clampOffset(offset, rows.length));
    return {
        offset,
        active,
        rootRef,
        dragHandlers,
        onKeyDown: keyHandler(spec, active, pressable, settle),
    };
};
