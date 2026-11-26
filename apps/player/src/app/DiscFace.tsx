import type { Ref } from 'react';
import { ringPath } from '../components/disc/ringPath';
import { pressable } from '../components/pressable';
import { t } from '../i18n/t';
import { spindleHitRadius } from '../stage/geometry';
import type { StageLayout } from '../stage/layouts';
import './discFace.css';

interface DiscFaceProps {
    layout: StageLayout;
    /**
     * 入唔入 Tab 次序、讀屏讀唔讀：冇歌載入時唱片夾本身就係「開啟歌單」，碟面只畀手指㩒（唔重覆）；
     * 有歌載入（唱片夾 = 播放／暫停）時碟面係開歌單嘅掣
     */
    focusable: boolean;
    onPress: () => void;
    /** 收返歌單之後 focus 返呢度（打開歌單嗰粒掣） */
    ref?: Ref<SVGPathElement>;
}

/**
 * 主頁嘅碟面（設計稿「碟面：打開歌單（唱片機壓暗，歌名沿碟弧線排）」；Functional Spec FR-005、US-004；T-037）：
 * 透明嘅感應範圍蓋住成隻碟，中間留返唱片夾嘅感應範圍（唱片夾喺佢下面，照㩒得）；唱臂、細掣、旋鈕喺佢上面。
 * 只喺主頁、而且唔係拎住另一隻碟先有（homeView.canOpenList）
 */
export const DiscFace = ({ layout, focusable, onPress, ref }: DiscFaceProps) => (
    <path
        ref={ref}
        data-part="disc-face"
        className="disc-face"
        transform={`translate(${layout.disc.x} ${layout.disc.y})`}
        d={ringPath(layout.disc.r, spindleHitRadius(layout))}
        fillRule="evenodd"
        fill="transparent"
        aria-label={t('list.open')}
        aria-hidden={!focusable || undefined}
        {...pressable(onPress, false, focusable)}
    />
);
