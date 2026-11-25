import type { StageLayout } from '../../stage/layouts';
import { Metal, Shadow } from '../metal/Metal';

/** 轉盤嘅形狀（設計稿 platter()）。轉盤半徑喺幾何表 `platter.r` */
const PLATTER_SHAPE = {
    /** 落影：偏移、深淺 */
    shadow: { dx: 0, dy: 14, opacity: 0.22 },
    /** 車床鋁面：車床紋角度、斜邊（以轉盤半徑做 1） */
    surface: { rot: 12, bevel: 0.007 },
    /** 淺色面：由轉盤邊縮入幾多 */
    faceInset: 6,
    /** 正中嘅中軸：半徑、車床紋角度、斜邊 */
    pin: { r: 16, rot: 40, bevel: 0.2 },
} as const;

/** 轉盤：淺色車床鋁面，碟放上去只見到外面一圈；正中有中軸 */
export const Platter = ({ disc, platter }: Pick<StageLayout, 'disc' | 'platter'>) => {
    const { shadow, surface, faceInset, pin } = PLATTER_SHAPE;
    const centre = { cx: disc.x, cy: disc.y };
    return (
        <>
            <Shadow {...centre} r={platter.r} {...shadow} large />
            <Metal {...centre} r={platter.r} {...surface} shadow={false} />
            <circle {...centre} r={platter.r - faceInset} fill="#f6f6f4" opacity=".5" />
            <Metal {...centre} {...pin} shadow={false} />
        </>
    );
};
