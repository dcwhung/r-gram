import type { StageLayout } from '../../stage/layouts';
import { Metal, Shadow } from '../metal/Metal';

const SPINDLE_PIN_RADIUS = 16;
const FACE_INSET = 6;

/** 轉盤（設計稿 platter()）：淺色車床鋁面，碟放上去只見到外面一圈；正中有中軸 */
export const Platter = ({ disc, platter }: Pick<StageLayout, 'disc' | 'platter'>) => (
    <>
        <Shadow cx={disc.x} cy={disc.y} r={platter.r} dx={0} dy={14} opacity={0.22} large />
        <Metal cx={disc.x} cy={disc.y} r={platter.r} rot={12} bevel={0.007} shadow={false} />
        <circle cx={disc.x} cy={disc.y} r={platter.r - FACE_INSET} fill="#f6f6f4" opacity=".5" />
        <Metal cx={disc.x} cy={disc.y} r={SPINDLE_PIN_RADIUS} rot={40} bevel={0.2} shadow={false} />
    </>
);
