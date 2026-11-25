/*
 * 字母盤幾時出字母（Functional Spec D28；設計稿 dialLetterEvery()、dialShowsLetter()）：
 * 18 格（17 張專輯 + ♥）或以下每格都出；再多就每 N 格先出一個（成個盤最多約 9 個），其餘出細點。
 * 揀中嗰格永遠出；離佢或者離 ♥ 太近嘅字母讓位，改出細點。
 */
import { scaleAngle } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';

const DEG_TO_RAD = Math.PI / 180;

/** 每幾格出一個字母（`positions` = 專輯數 + 1） */
export const dialLetterEvery = ({ dial }: StageLayout, positions: number): number => {
    const { allUpTo, maxLetters } = dial.letterRule;
    return positions <= allUpTo ? 1 : Math.ceil((positions - 1) / maxLetters);
};

/** 揀中嗰格同 ♥ 旁邊要留嘅弧長（字母圈上面） */
export const dialClearance = ({ dial }: StageLayout): number => {
    const { clearanceStepDeg, clearanceFactor } = dial.letterRule;
    return dial.letters * clearanceStepDeg * DEG_TO_RAD * clearanceFactor;
};

/** 第 pos 格出字母（true）定細點（false） */
export const dialShowsLetter = (
    layout: StageLayout,
    pos: number,
    current: number,
    positions: number,
): boolean => {
    const every = dialLetterEvery(layout, positions);
    if (pos === current || every === 1) return true;
    if (pos % every !== 0) return false;
    const stepDeg = scaleAngle(layout, 1, positions) - scaleAngle(layout, 0, positions);
    const spacing = layout.dial.letters * stepDeg * DEG_TO_RAD;
    const room = dialClearance(layout);
    const heart = positions - 1;
    return Math.abs(pos - current) * spacing >= room && (heart - pos) * spacing >= room;
};
