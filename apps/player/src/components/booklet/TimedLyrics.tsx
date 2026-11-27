import type { LyricLine } from '@r-gram/catalog';
import { useMemo } from 'react';
import { t } from '../../i18n/t';
import { usePlaybackClock } from '../../lyrics/PlaybackClock';
import { type LyricMeasures, type TimedLayout, timedLayout } from '../../lyrics/timedLayout';
import { useActiveLine } from '../../lyrics/useActiveLine';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { BookletFrame } from './BookletParts';
import { type LyricLineModel, LyricLineView } from './LyricLineView';

/** 而家嗰行粗體、其他行普通（設計稿 booklet()：700 / 500） */
const FOCUS_WEIGHT = 700;
const OTHER_WEIGHT = 500;

/** 畫面要嘅行：而家嗰行（框入面）先，之後係其他行；以原本第幾行做 key，換行時同一行做過場 */
const lineModels = (plan: TimedLayout, layout: StageLayout): LyricLineModel[] => {
    const step = layout.arc.stepDeg;
    const models: LyricLineModel[] = plan.others.map((pose) => ({
        ...pose,
        rows: [pose.text],
        pitch: 0,
        focus: false,
        spread: pose.k * step,
    }));
    const { focus } = plan;
    if (focus) models.push({ ...focus, opacity: 1, focus: true, spread: 0 });
    return models.sort((a, b) => a.index - b.index);
};

interface TimedLyricsProps {
    layout: StageLayout;
    /** 有時間標記嘅歌詞；冇（攞緊、冇歌詞、攞唔到）= null */
    lines: readonly LyricLine[] | null;
    /** 框入面嘅一行提示（冇歌詞、攞唔到）；攞緊 = null（留空） */
    notice: string | null;
    measure: TextMeasure;
    /** 播緊：跟歌行；暫停 = 停喺而家嗰行（決定 5） */
    playing: boolean;
}

/**
 * 有時間標記嘅歌詞（設計稿第 18 版 booklet()、第 17 版 longLyrics()；Functional Spec D22）：白色框線（長行時變高）+
 * 而家嗰行喺框入面 + 上下其他行。喺碟嘅座標（貼底組）。淨係字（唔接 pointer：㩒落去 = 㩒暗位收返）。
 * 讀屏：成組叫「歌詞」，而家嗰行 `aria-current`；唱到下一行唔會讀出嚟（唔用 live region：會一直打斷）
 */
export const TimedLyrics = ({ layout, lines, notice, measure, playing }: TimedLyricsProps) => {
    const active = useActiveLine(lines, usePlaybackClock(), playing);
    const measures = useMemo<LyricMeasures>(() => {
        const at = (weight: number) => (text: string, size: number) =>
            measure(text, { family: 'mixed', size, weight, spacing: 0 });
        return { bold: at(FOCUS_WEIGHT), regular: at(OTHER_WEIGHT) };
    }, [measure]);
    const plan = useMemo(
        () => (lines ? timedLayout(lines, active, layout, measures) : null),
        [lines, active, layout, measures],
    );
    const { disc, arc, booklet } = layout;
    return (
        <g data-part="lyrics-timed" pointerEvents="none">
            <BookletFrame layout={layout} height={plan?.frameHeight ?? booklet.frame.height} />
            {notice ? (
                <g className="booklet-line">
                    <text
                        className="booklet-lyrics-notice"
                        x={disc.x - arc.r}
                        y={disc.y}
                        dominantBaseline="central"
                        fontSize={booklet.lyrics.arc.nowMin}
                    >
                        {notice}
                    </text>
                </g>
            ) : null}
            {plan ? (
                <g
                    role="group"
                    aria-label={t('booklet.lyrics')}
                    transform={`translate(${disc.x} ${disc.y})`}
                >
                    {lineModels(plan, layout).map((line) => (
                        <LyricLineView
                            key={line.index}
                            line={line}
                            centre={disc}
                            fade={booklet.lyrics.cutFade}
                        />
                    ))}
                </g>
            ) : null}
        </g>
    );
};
