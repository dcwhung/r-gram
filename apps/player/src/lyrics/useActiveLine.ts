/*
 * 歌書跟歌行（Technical Spec 實現注意事項 8、`activeLine()`）：而家唱緊第幾行。
 * 每次 render 都由播放位置（`clock`，秒，引擎嘅真位置）重新計，所以暫停時拉進度、換歌、重新打開都即刻啱；
 * 播緊時每 LYRIC_TICK_MS 睇一次，換咗行先 render。暫停 = 唔睇（歌詞停喺而家嗰行，決定 5）。
 */
import type { LyricLine } from '@r-gram/catalog';
import { useEffect, useReducer, useRef } from 'react';
import { LYRIC_TICK_MS } from '../config/limits';
import { activeLine, BEFORE_FIRST_LINE } from './activeLine';

const MS_PER_SECOND = 1000;

const bump = (count: number) => count + 1;

export const useActiveLine = (
    lines: readonly LyricLine[] | null,
    clock: () => number,
    running: boolean,
): number => {
    const read = () => (lines ? activeLine(lines, clock() * MS_PER_SECOND) : BEFORE_FIRST_LINE);
    const active = read();
    const shown = useRef(active);
    const [, rerender] = useReducer(bump, 0);
    useEffect(() => {
        shown.current = active;
    });
    useEffect(() => {
        if (!running || !lines) return undefined;
        const timer = setInterval(() => {
            if (activeLine(lines, clock() * MS_PER_SECOND) !== shown.current) rerender();
        }, LYRIC_TICK_MS);
        return () => clearInterval(timer);
    }, [lines, clock, running]);
    return active;
};
