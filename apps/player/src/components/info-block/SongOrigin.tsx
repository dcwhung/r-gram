import type { InfoLayout } from '../../stage/layouts';

/**
 * Favourites 碟嘅歌原本嗰隻碟同年份（Functional Spec D19；設計稿 infoParts() 嘅 `from`）。
 * `y`：歌單開住喺「第 nn 首」行嘅位置；播緊時喺嗰行下面（幾何表 info.origin）
 */
export const SongOrigin = ({ info, text, y }: { info: InfoLayout; text: string; y: number }) => (
    <text
        data-part="song-origin"
        className="info-origin"
        x={info.origin.x}
        y={y}
        fontSize={info.origin.size}
        letterSpacing={info.origin.spacing}
    >
        {text}
    </text>
);
