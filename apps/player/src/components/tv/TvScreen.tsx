import { type CSSProperties, useLayoutEffect, useRef } from 'react';
import { t } from '../../i18n/t';
import type { TvLayout } from '../../stage/layouts';
import { tvPicture } from './tvShapes';

interface TvScreenProps {
    tv: TvLayout;
    /** 成個 app 嗰個 `<video>`（videoEngine 擁有；電視 mount 時搬入嚟） */
    video: HTMLVideoElement;
    failed: boolean;
}

/**
 * MV 嘅畫面（Technical Spec「電視」：`<video>` 係疊喺畫布上面嘅 HTML element，位置由幾何表換算）：
 * 16:9 放喺 4:3 螢幕入面（上下黑邊），掃描線、暗角、反光用 CSS 疊層；開機／熄機（crtOn／crtOff）喺 `.tv-crt` 縮放。
 * 位置喺貼底組：高身手機加 `--stage-extra`。螢幕本身係畫面，讀屏唔讀（載入失敗由 Tv 嘅 live region 講）
 */
export const TvScreen = ({ tv, video, failed }: TvScreenProps) => {
    const host = useRef<HTMLDivElement>(null);
    // 同一個 element 搬嚟搬去：已經喺度就唔郁。電視拆走時連 host 一齊離開 DOM（之前已經 stop 咗）。
    // 唔係 DOM node（測試嘅假 element）就唔搬
    useLayoutEffect(() => {
        const element = host.current;
        if (!element || !(video instanceof Node) || video.parentElement === element) return;
        element.appendChild(video);
    }, [video]);
    const picture = tvPicture(tv);
    const style = {
        '--tv-screen-x': tv.x + picture.x,
        '--tv-screen-y': tv.y + picture.y,
        '--tv-screen-w': picture.w,
        '--tv-screen-h': picture.h,
    } as CSSProperties;
    return (
        <div className="tv-screen" data-part="tv-screen" style={style} aria-hidden="true">
            <div className="tv-crt">
                <div ref={host} className="tv-video" />
                {failed && <p className="tv-failed">{t('mv.failed')}</p>}
                <div className="tv-crt-flash" />
            </div>
        </div>
    );
};
