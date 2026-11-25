import type { CatalogDocument } from '@r-gram/catalog';
import { act, renderHook } from '@testing-library/react';
import { sampleDocument } from '../catalog/testing/catalogFixtures';
import { useHome } from './useHome';

/** `apollo-18` 第 1 首有 MV */
const catalogWithMv = (): CatalogDocument => {
    const document = sampleDocument();
    const first = document.albums[0]?.tracks[0];
    if (first) first.mv = 'apollo-18/01.mp4';
    return document;
};

const press = (home: { current: ReturnType<typeof useHome> }, name: 'onSpindle' | 'onMv') =>
    act(() => home.current.handlers?.[name]());

describe('useHome', () => {
    // S-073：電視開住時唱片夾喺電視後面（T-060）：就算有人叫到 onSpindle 都唔反應
    it('should ignore the clamp while the MV is open', () => {
        const { result } = renderHook(() => useHome(catalogWithMv()));
        press(result, 'onSpindle');
        press(result, 'onSpindle');
        press(result, 'onMv');
        const before = { stage: result.current.stage, playback: result.current.playback };
        press(result, 'onSpindle');
        expect(result.current.stage).toBe(before.stage);
        expect(result.current.playback).toBe(before.playback);
        expect(result.current.view?.mvOpen).toBe(true);
    });
});
