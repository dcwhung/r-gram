import { t } from '../../i18n/t';
import type { InfoLayout } from '../../stage/layouts';
import { Icon } from '../icons/Icon';
import { DEF, ref } from '../metal/defIds';
import { pressable } from '../pressable';
import { px } from '../svgNumber';

interface FavouriteHeartProps {
    info: InfoLayout;
    /** 心形中心（跟喺歌名最後一行尾；songFit） */
    at: { x: number; y: number };
    /** 感應範圍邊長（≥ 44pt） */
    hitSize: number;
    favourite: boolean;
    /** 著燈色：而家隻碟嘅 glow（設計稿 ALBUMS[album].glow） */
    glow: string;
    /** 歌名嗰部分淡出（揀碟期間）：唔喺 Tab 次序 */
    hidden: boolean;
    /** 冇畀 = 只係圖案（唔係掣，讀屏唔讀） */
    onPress?: () => void;
}

type GlyphProps = Pick<FavouriteHeartProps, 'info' | 'at' | 'favourite' | 'glow'>;

/** 已收藏：實心著燈色 + 光暈；未收藏：空心（線色由 infoBlock.css 繼承） */
const Glyph = ({ info, at, favourite, glow }: GlyphProps) => {
    const { size, stroke, haloOpacity } = info.heart;
    if (!favourite) {
        return (
            <g
                data-part="heart-outline"
                className="info-heart"
                strokeWidth={stroke}
                strokeLinejoin="round"
            >
                <Icon name="heart" cx={at.x} cy={at.y} size={size} color="none" />
            </g>
        );
    }
    return (
        <>
            <g data-part="heart-glow" opacity={haloOpacity} filter={ref(DEF.glow)}>
                <Icon name="heart" cx={at.x} cy={at.y} size={size} color={glow} />
            </g>
            <g data-part="heart-fill">
                <Icon name="heart" cx={at.x} cy={at.y} size={size} color={glow} />
            </g>
        </>
    );
};

/**
 * 歌名後面嘅心形掣（設計稿 infoParts() 嘅 data-act="heart"；Functional Spec US-010）：㩒一下收藏／取消收藏左上嗰首歌。
 * 名固定係「收藏這首歌」，狀態用 `aria-pressed`（同設計稿一樣）；感應方格 44pt 置中喺心形
 */
export const FavouriteHeart = ({ hitSize, hidden, onPress, ...glyph }: FavouriteHeartProps) => {
    // 向上取整：px() 嘅四捨五入唔可以令感應範圍細過 44pt
    const side = Math.ceil(hitSize);
    const half = side / 2;
    const button = onPress
        ? {
              'aria-label': t('favourites.add'),
              'aria-pressed': glyph.favourite,
              ...pressable(onPress, false, !hidden),
          }
        : { 'aria-hidden': true };
    return (
        <g data-part="song-heart" className="info-heart-button" {...button}>
            <rect
                data-part="heart-hit"
                x={px(glyph.at.x - half)}
                y={px(glyph.at.y - half)}
                width={side}
                height={side}
                fill="transparent"
            />
            <Glyph {...glyph} />
        </g>
    );
};
