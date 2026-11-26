import { useState } from 'react';
import { DISC_ART_RADIUS as ART } from './discArt';

export interface DiscCoverProps {
    /** 大封面；null = 冇 */
    coverUrl: string | null;
    /** 縮圖（轉盤兩旁嘅碟用；正中嘅碟墊喺大封面下面，大封面未載入完都唔會空白）；null = 冇 */
    thumbUrl?: string | null;
    accent: string;
    /** 碟轉緊（播緊） */
    spinning: boolean;
}

/**
 * 一張封面圖。載入失敗（冇 CORS、404、離線未 cache）就唔畫，等下面嘅專輯色露出嚟，
 * 唔出瀏覽器自己嘅「圖片失敗」圖案（backlog B-076）。網址變咗就重新試。
 */
const CoverImage = ({ href }: { href: string }) => {
    const [failedHref, setFailedHref] = useState<string | null>(null);
    if (failedHref === href) return null;
    return (
        <image
            href={href}
            crossOrigin="anonymous"
            x={-ART}
            y={-ART}
            width={ART * 2}
            height={ART * 2}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setFailedHref(href)}
        />
    );
};

/**
 * 封面：專輯色永遠墊喺最底（冇封面、載入中、載入失敗都見到佢）→ 縮圖 → 大封面。
 * 轉動嘅動畫長駐喺呢層（disc.css）。
 */
export const DiscCover = ({ coverUrl, thumbUrl = null, accent, spinning }: DiscCoverProps) => (
    <g data-part="cover" className="disc-cover" data-spinning={spinning}>
        <circle data-part="cover-fill" r={ART} fill={accent} />
        {thumbUrl && <CoverImage key="thumb" href={thumbUrl} />}
        {coverUrl && <CoverImage key="cover" href={coverUrl} />}
    </g>
);
