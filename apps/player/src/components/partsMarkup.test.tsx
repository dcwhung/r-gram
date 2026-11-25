import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PHONE_LAYOUT as LAYOUT } from '../stage/layouts';
import { Screws } from './metal/Screws';
import { Platter } from './platter/Platter';
import { Spindle, type SpindleMode } from './spindle/Spindle';
import { Tonearm } from './tonearm/Tonearm';

const markup = (part: ReactNode) => render(<svg>{part}</svg>).container.firstElementChild;

const tonearm = (playing: boolean) => <Tonearm arm={LAYOUT.arm} playing={playing} glow="#24f96f" />;
const spindle = (mode: SpindleMode) => (
    <Spindle layout={LAYOUT} mode={mode} progress={0.19} accent="#2f8f57" onPress={() => {}} />
);

/*
 * W-009：零件嘅形狀數字由 JSX 搬咗入有名嘅形狀表（跟設計稿 tonearm()、spindle()、clamp()、platter()、screw()）。
 * 呢度鎖住手機版面每件零件 render 出嚟嘅 markup：snapshot 喺搬之前錄低，搬完一個字都冇變。
 * 之後改形狀表令 markup 變咗 = 同設計稿唔再一致：先改設計稿並取得確認，再用 `vitest -u` 更新。
 */
describe('part markup for the phone layout', () => {
    it.each<[string, ReactNode]>([
        ['the tonearm parked', tonearm(false)],
        ['the tonearm playing', tonearm(true)],
        ['the spindle with no song', spindle('idle')],
        ['the spindle in the track list', spindle('list')],
        ['the spindle playing', spindle('playing')],
        ['the spindle paused', spindle('paused')],
        ['the platter', <Platter key="platter" disc={LAYOUT.disc} platter={LAYOUT.platter} />],
        ['the screws', <Screws key="screws" points={LAYOUT.screws.points} />],
    ])('should draw %s exactly as ported from the mockup', (_name, part) => {
        expect(markup(part)).toMatchSnapshot();
    });
});
