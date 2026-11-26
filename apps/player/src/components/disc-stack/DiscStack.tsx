import { Fragment, type ReactNode } from 'react';
import type { DialEntry } from '../../app/dialView';
import { orbitPose } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { Disc } from '../disc/Disc';
import { ringPath } from '../disc/ringPath';
import { px, ratio } from '../svgNumber';
import './discStack.css';

interface DiscStackProps {
    layout: StageLayout;
    entries: readonly DialEntry[];
    current: number;
    /** 字母盤打開：其他碟沿弧線滑入 */
    open: boolean;
    /** 揀中嗰隻碟轉緊 */
    spinning: boolean;
    /** 緊接喺揀中嗰隻碟後面畫嘅嘢（唱片夾：喺佢上面，但之後嘅碟滑入時蓋過佢） */
    children?: ReactNode;
}

/** 揀中嗰隻碟前後各畫幾多隻：見到嘅範圍再加一隻，等入嚟同出去嘅碟都有過場 */
const EDGE = 1;
/** slot 嘅 key：專輯 id 唔會有 `#`，唔會撞 */
const SLOT_KEY = '#slot';

interface StackDiscProps {
    layout: StageLayout;
    entry: DialEntry;
    offset: number;
    open: boolean;
    spinning: boolean;
}

/** 一隻碟：位置同大細寫喺 inline transform（CSS 過場）；其他碟蓋一層白紗、用縮圖、唔接受 pointer */
const StackDisc = ({ layout, entry, offset, open, spinning }: StackDiscProps) => {
    const { disc, hub } = layout;
    const pose = orbitPose(layout, offset, open);
    const current = offset === 0;
    const style = {
        transform: `translate(${px(pose.x)}px, ${px(pose.y)}px) scale(${ratio(pose.r / disc.r)})`,
        opacity: pose.opacity,
    };
    return (
        <g
            data-part="stack-disc"
            data-album={entry.albumId}
            data-current={current}
            className="stack-disc"
            style={style}
            pointerEvents={current ? undefined : 'none'}
            aria-hidden={current ? undefined : true}
        >
            <Disc
                r={disc.r}
                hub={hub}
                coverUrl={current ? entry.coverUrl : null}
                thumbUrl={entry.thumbUrl}
                accent={entry.accent}
                spinning={current && spinning}
            />
            <path
                className="stack-veil"
                fillRule="evenodd"
                d={ringPath(disc.r, disc.r * hub.clamp)}
                fill="#fff"
                style={{ opacity: pose.veil }}
            />
        </g>
    );
};

/**
 * 轉盤上面嘅碟（設計稿 discs()、discPose()）：揀中嗰隻留喺轉盤；轉碟時其他碟沿弧線滑入，疊喺上面，
 * 右邊嗰張永遠最頂（按刻度次序畫）。每隻碟以專輯 id 做 key：轉碟時同一隻碟由弧線滑去轉盤（唔會重新 mount），
 * 唔喺範圍入面嘅碟唔畫；換碟時新嚟嘅封面由 0° 開始（B-033）。
 */
export const DiscStack = ({
    layout,
    entries,
    current,
    open,
    spinning,
    children,
}: DiscStackProps) => {
    const { shown } = layout.orbit;
    const from = Math.max(0, current + shown.from - EDGE);
    const to = Math.min(entries.length - 1, current + shown.to + EDGE);
    // 一列有 key 嘅兄弟：換碟時 React 只係搬 slot，碟同 slot 入面嘅嘢都唔會重新 mount
    return entries.slice(from, to + 1).flatMap((entry, index) => {
        const offset = from + index - current;
        const disc = (
            <StackDisc
                key={entry.albumId}
                layout={layout}
                entry={entry}
                offset={offset}
                open={open}
                spinning={spinning}
            />
        );
        return offset === 0 ? [disc, <Fragment key={SLOT_KEY}>{children}</Fragment>] : [disc];
    });
};
