import { t } from '../../i18n/t';
import { heartHitPoint, heartPoint, hitSizeUnits } from '../../stage/geometry';
import type { Point, StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Icon } from '../icons/Icon';
import { pressable } from '../pressable';
import { px, ratio } from '../svgNumber';
import { KNOB_SHAPE } from './knobShape';
import './knob.css';

interface FavHeartProps {
    layout: StageLayout;
    /** 字母盤打開：♥ 沿同一個角度滑出去字母盤，放大 */
    open: boolean;
    /** 身處 Favourites 碟：轉紅 */
    lit: boolean;
    onPress: () => void;
    /** 俾歌單嘅暗層蓋住（S-074）：Tab 唔到、讀屏唔讀 */
    covered?: boolean;
}

const { heart } = KNOB_SHAPE;
const translate = ({ x, y }: Point) => `translate(${px(x)}px, ${px(y)}px)`;

const Glyph = ({ lit }: { lit: boolean }) => (
    <>
        {lit && (
            <g data-part="heart-glow" opacity={heart.haloOpacity} filter={ref(DEF.glow)}>
                <Icon
                    name="heart"
                    cx={0}
                    cy={0}
                    size={heart.full + heart.haloExtra}
                    color={heart.lit}
                />
            </g>
        )}
        <Icon name="heart" cx={0} cy={0} size={heart.full} color={lit ? heart.lit : heart.color} />
    </>
);

/**
 * 刻度最尾嘅 ♥（設計稿 favHeart()）：一㩒去 Favourites 碟；身處嗰隻碟時轉紅。
 * 平時細（刻度一格），喺刻度線外面；轉碟時沿同一個角度滑出去字母盤、放大（CSS 過場）。
 * ♥ 細，所以感應方格由旋鈕邊向外伸（唔同旋鈕重疊），轉碟時跟住心形。
 */
export const FavHeart = ({ layout, open, lit, onPress, covered = false }: FavHeartProps) => {
    const progress = open ? 1 : 0;
    const half = hitSizeUnits(layout) / 2;
    const scale = open ? 1 : layout.scale.heart / heart.full;
    return (
        <g
            className="fav-heart"
            aria-label={t('favourites.go')}
            aria-pressed={lit}
            aria-hidden={covered || undefined}
            {...pressable(onPress, covered, !covered)}
        >
            <g
                data-part="heart-hit"
                className="knob-move"
                style={{ transform: translate(heartHitPoint(layout, progress)) }}
            >
                <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="transparent" />
            </g>
            <g
                data-part="heart-glyph"
                className="knob-move"
                style={{
                    transform: `${translate(heartPoint(layout, progress))} scale(${ratio(scale)})`,
                }}
            >
                <Glyph lit={lit} />
            </g>
        </g>
    );
};
