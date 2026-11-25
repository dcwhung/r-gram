import { pressable } from '../components/pressable';
import { t } from '../i18n/t';
import { DESIGN_WIDTH } from '../stage/fitStage';
import { useStageFitContext } from '../stage/StageContext';

/** 設計稿 dimLayer()：黑色 80% */
const VEIL_OPACITY = 0.8;

/**
 * 歌單嘅暗層（暫時嘅佔位）：壓暗唱片機，㩒暗位收返歌單（D25）。歌名沿弧線排、框線、捲動、
 * 左上資訊轉白字係 T-037。喺貼底組入面，所以向上伸返多出嚟嘅高度，蓋住成個舞台。
 */
export const ListVeil = ({ onClose }: { onClose: () => void }) => {
    const { heightUnits, extraUnits } = useStageFitContext();
    return (
        <rect
            data-part="list-veil"
            className="list-veil"
            x={0}
            y={-extraUnits}
            width={DESIGN_WIDTH}
            height={heightUnits}
            fill="#000"
            opacity={VEIL_OPACITY}
            aria-label={t('list.close')}
            {...pressable(onClose)}
        />
    );
};
