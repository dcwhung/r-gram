import { renderHook } from '@testing-library/react';
import { useColumnEntrance } from './useColumnEntrance';

interface Props {
    dialOpen: boolean;
    holding: boolean;
}

/*
 * 設計稿第 19 版 ACTIONS.wheel（review W-055）：打開字母盤時，唔係拎住另一隻碟就重播歌單欄逐行飄落
 *（PANEL_FLOAT）；拎住另一隻碟唔重播
 */
describe('useColumnEntrance', () => {
    const hook = (initialProps: Props) =>
        renderHook((props: Props) => useColumnEntrance(props.dialOpen, props.holding), {
            initialProps,
        });

    it('should start a new entrance each time the dial opens without holding another disc', () => {
        const { result, rerender } = hook({ dialOpen: false, holding: false });
        const first = result.current;
        rerender({ dialOpen: true, holding: false });
        const second = result.current;
        expect(second).not.toBe(first);
        rerender({ dialOpen: false, holding: false });
        expect(result.current).toBe(second);
        rerender({ dialOpen: true, holding: false });
        expect(result.current).not.toBe(second);
    });

    it('should keep the entrance while the dial stays open or stays closed', () => {
        const { result, rerender } = hook({ dialOpen: true, holding: false });
        const first = result.current;
        rerender({ dialOpen: true, holding: false });
        expect(result.current).toBe(first);
    });

    it('should not start a new entrance when the dial opens while holding another disc', () => {
        const { result, rerender } = hook({ dialOpen: false, holding: true });
        const first = result.current;
        rerender({ dialOpen: true, holding: true });
        expect(result.current).toBe(first);
    });
});
