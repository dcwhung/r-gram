import { t } from '../../i18n/t';
import { hitSizeUnits } from '../../stage/geometry';
import type { ButtonId, StageLayout } from '../../stage/layouts';
import { MetalButton } from '../metal-button/MetalButton';

interface SmallButtonsProps {
    layout: StageLayout;
    glow: string;
    /** 有歌（歌書先有內容） */
    hasSong: boolean;
    /** 呢首歌有 MV */
    hasMv: boolean;
    bookletOpen: boolean;
    mvOpen: boolean;
    /** 播緊：播放模式掣著燈 */
    playing: boolean;
    onBooklet: () => void;
    onMv: () => void;
    onMode: () => void;
}

/**
 * 左邊三粒細掣（設計稿 buttonState()）：
 * - 歌書：有歌先㩒得（D24）；係開關掣，打開咗就著燈兼 `aria-pressed`
 * - MV：有 MV 先㩒得；電視開咗就著燈
 * - 播放模式：光圈 = 播緊（唔係「已按下」，S-034）；模式而家固定順序播放（四個模式係 T-071）
 */
export const SmallButtons = (props: SmallButtonsProps) => {
    const { layout, glow } = props;
    const position = (id: ButtonId) => {
        const item = layout.buttons.items.find((button) => button.id === id);
        return { x: item?.x ?? 0, y: item?.y ?? 0 };
    };
    const common = { glow, metrics: layout.buttons, hitRadius: hitSizeUnits(layout) / 2 };
    return (
        <g data-part="small-buttons">
            <MetalButton
                {...common}
                {...position('booklet')}
                icon="info"
                label={t('booklet.open')}
                disabled={!props.hasSong}
                pressed={props.bookletOpen}
                lit={props.bookletOpen}
                onPress={props.onBooklet}
            />
            <MetalButton
                {...common}
                {...position('mv')}
                icon="mv"
                label={t('mv.open')}
                disabled={!props.hasMv}
                lit={props.mvOpen}
                onPress={props.onMv}
            />
            <MetalButton
                {...common}
                {...position('mode')}
                icon="order"
                label={t('mode.label', { mode: t('mode.order') })}
                lit={props.playing}
                onPress={props.onMode}
            />
        </g>
    );
};
