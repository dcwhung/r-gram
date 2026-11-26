import type { MiniView } from '../../app/miniView';
import { t } from '../../i18n/t';
import { miniHitBox, miniLabelX, miniScale, miniTitleMaxWidth } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { fitText } from '../../utils/fitText';
import type { TextMeasure } from '../../utils/textMeasure';
import { ChromeFade } from '../chrome-fade/ChromeFade';
import { Disc } from '../disc/Disc';
import { Platter } from '../platter/Platter';
import { pressable } from '../pressable';
import { Clamp } from '../spindle/Clamp';
import { px, ratio } from '../svgNumber';
import { Tonearm } from '../tonearm/Tonearm';
import './miniTurntable.css';

/** 「播放中」／「已暫停」／「已播完」同成粒掣嘅名 */
const captionKeys = ({ paused, ended, failed }: MiniView) => {
    if (ended) return { label: 'miniTurntable.ended', back: 'miniTurntable.backEnded' } as const;
    // S-242：載入失敗用同左上一樣嘅字（US-004），唔寫「已暫停」
    if (failed) return { label: 'track.failed', back: 'miniTurntable.backFailed' } as const;
    if (paused) return { label: 'miniTurntable.paused', back: 'miniTurntable.backPaused' } as const;
    return { label: 'miniTurntable.playing', back: 'miniTurntable.backPlaying' } as const;
};

const TITLE_WEIGHT = 700;

interface MiniTurntableProps {
    layout: StageLayout;
    mini: MiniView;
    /** 量文字闊度（歌名放唔落就縮字） */
    measure: TextMeasure;
    /** 㩒：放低拎住嘅碟，返去載入嘅碟 */
    onPress: () => void;
    /** 弧線歌單嘅暗層蓋住（照畫）：㩒唔到、Tab 唔到、讀屏唔讀 */
    covered?: boolean;
}

type MachineProps = Pick<MiniTurntableProps, 'layout' | 'mini'>;

/** 同大唱片機一樣嘅零件（轉盤、碟、唱片夾、唱臂），以設計單位畫，再成組縮細搬去右上角 */
const Machine = ({ layout, mini }: MachineProps) => {
    const { disc, hub, platter, arm, miniTurntable: centre } = layout;
    const k = miniScale(layout);
    const at = `translate(${disc.x} ${disc.y})`;
    return (
        <g
            data-part="mini-machine"
            transform={`translate(${px(centre.x - disc.x * k)} ${px(centre.y - disc.y * k)}) scale(${ratio(k)})`}
        >
            <Platter disc={disc} platter={platter} />
            <g transform={at}>
                <Disc
                    r={disc.r}
                    hub={hub}
                    coverUrl={mini.coverUrl}
                    thumbUrl={mini.thumbUrl}
                    accent={mini.accent}
                    spinning={mini.spinning}
                />
            </g>
            <g transform={at}>
                <Clamp r={disc.r * hub.clamp} />
            </g>
            {/* 細唱片機出現時唱臂已經喺位，之後只跟播放狀態（冇開場） */}
            <Tonearm arm={arm} pose={mini.armPose} instant glow={mini.glow} />
        </g>
    );
};

type CaptionProps = MachineProps & Pick<MiniTurntableProps, 'measure'>;

/**
 * 兩行字靠右對齊喺碟左邊、歌單第一行上面：「播放中」／「已暫停」，下面係歌名。歌名向左用到 `title.left`
 *（W-045，B-083 ④），放唔落就縮字，再唔得先「…」；完整歌名喺掣嘅無障礙名
 */
const Caption = ({ layout, mini, measure }: CaptionProps) => {
    const { miniTurntable: shape } = layout;
    const x = miniLabelX(layout);
    const fitted = fitText(mini.title, {
        size: shape.title.size,
        minSize: shape.title.minSize,
        step: shape.title.step,
        maxWidth: miniTitleMaxWidth(layout),
        measure: (text, size) =>
            measure(text, { family: 'cjk', size, weight: TITLE_WEIGHT, spacing: 0 }),
    });
    return (
        <>
            <text
                data-part="mini-label"
                className="mini-label"
                x={x}
                y={shape.y + shape.label.dy}
                textAnchor="end"
                fontSize={shape.label.size}
                letterSpacing={shape.label.spacing}
            >
                {t(captionKeys(mini).label)}
            </text>
            <text
                data-part="mini-title"
                className="mini-title"
                x={x}
                y={shape.y + shape.title.dy}
                textAnchor="end"
                fontSize={fitted.size}
            >
                {fitted.text}
            </text>
        </>
    );
};

/**
 * 右上角細唱片機（設計稿第 18 版 miniTurntable()；Functional Spec FR-043、D58）：拎住另一隻碟時照播載入嘅碟。
 * 成組（連兩行字）係一粒掣，㩒 = 返去載入嘅碟。唔顯示時淡出（chromeFade），唔接受 pointer、唔入 Tab 次序。
 */
export const MiniTurntable = (props: MiniTurntableProps) => {
    const { layout, mini, measure, onPress, covered = false } = props;
    const box = miniHitBox(layout);
    const active = mini.shown && !covered;
    return (
        <ChromeFade part="mini-turntable" hidden={!mini.shown}>
            <g
                data-part="mini-button"
                aria-label={t(captionKeys(mini).back, { title: mini.title })}
                aria-hidden={covered || undefined}
                {...pressable(onPress, !active, active)}
            >
                <rect
                    data-part="mini-hit"
                    x={box.left}
                    y={box.top}
                    width={box.right - box.left}
                    height={box.bottom - box.top}
                    fill="transparent"
                />
                <Machine layout={layout} mini={mini} />
                <Caption layout={layout} mini={mini} measure={measure} />
            </g>
        </ChromeFade>
    );
};
