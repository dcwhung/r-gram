import { APP_VERSION } from '../../config/appVersion';
import { t } from '../../i18n/t';
import type { PreloadLayout } from '../../stage/layouts';
import { pressable } from '../pressable';

const PERCENT = 100;
const PERCENT_DIGITS = 3;
const HALF = 2;

/** 進度線同三位數百分比（設計稿第 18 版 preloadCard()；US-001「底部有進度線同三位數百分比」） */
export const ProgressLine = ({ layout, progress }: { layout: PreloadLayout; progress: number }) => {
    const { bar, percent } = layout;
    const value = Math.round(progress * PERCENT);
    const line = `M${bar.x} ${bar.y}h${bar.width}`;
    return (
        <g
            className="preload-progress"
            role="progressbar"
            aria-label={t('preload.loading')}
            aria-valuemin={0}
            aria-valuemax={PERCENT}
            aria-valuenow={value}
        >
            <path
                d={line}
                className="preload-bar"
                strokeWidth={bar.stroke}
                opacity={bar.trackOpacity}
            />
            <path
                data-part="bar-fill"
                d={line}
                className="preload-bar preload-bar-fill"
                strokeWidth={bar.stroke}
                // 用 dash 畫完成咗嘅一段：CSS 過場郁 offset（減少動態效果冇過場）
                pathLength={1}
                strokeDasharray="1 1"
                style={{ strokeDashoffset: 1 - progress }}
            />
            <text
                data-part="percent"
                className="preload-percent"
                aria-hidden="true"
                x={percent.x}
                y={percent.y}
                fontSize={percent.size}
                letterSpacing={percent.spacing}
            >
                {String(value).padStart(PERCENT_DIGITS, '0')}
            </text>
        </g>
    );
};

/** 冇 catalog：錯誤訊息同重試掣（US-001；設計稿冇畫，放喺進度線嘅位） */
export const LoadFailure = ({
    layout,
    onRetry,
}: {
    layout: PreloadLayout;
    onRetry: () => void;
}) => {
    const { message } = layout.failure;
    return (
        <g data-part="failure">
            <text
                role="alert"
                className="preload-message"
                x={message.x}
                y={message.y}
                fontSize={message.size}
                letterSpacing={message.spacing}
            >
                {t('preload.failed')}
            </text>
            <RetryButton layout={layout} onRetry={onRetry} />
        </g>
    );
};

/** 重試掣：圓角外框；感應範圍上下左右各加到 44pt（`hit`） */
const RetryButton = ({ layout, onRetry }: { layout: PreloadLayout; onRetry: () => void }) => {
    const { retry } = layout.failure;
    const hitWidth = retry.width + retry.hit - retry.height;
    return (
        <g className="preload-retry" aria-label={t('preload.retry')} {...pressable(onRetry)}>
            <rect
                data-part="hit"
                className="preload-retry-hit"
                x={retry.x - hitWidth / HALF}
                y={retry.y - retry.hit / HALF}
                width={hitWidth}
                height={retry.hit}
                rx={retry.hit / HALF}
            />
            <rect
                className="preload-retry-frame"
                x={retry.x - retry.width / HALF}
                y={retry.y - retry.height / HALF}
                width={retry.width}
                height={retry.height}
                rx={retry.height / HALF}
                strokeWidth={retry.stroke}
            />
            <text
                aria-hidden="true"
                className="preload-retry-text"
                x={retry.x}
                y={retry.y}
                fontSize={retry.size}
                letterSpacing={retry.spacing}
            >
                {t('preload.retry')}
            </text>
        </g>
    );
};

/** 「R Gram」、「歌迷自製 非官方 · v版本」（FR-034；版本號由 build 注入） */
export const AppIdentity = ({ layout }: { layout: PreloadLayout }) => {
    const { name, notice } = layout;
    const footer = t('preload.footer', {
        notice: t('app.unofficial'),
        version: t('app.version', { version: APP_VERSION }),
    });
    return (
        <>
            <text
                className="preload-name"
                x={name.x}
                y={name.y}
                fontSize={name.size}
                letterSpacing={name.spacing}
            >
                {t('app.name')}
            </text>
            <text
                className="preload-notice"
                x={notice.x}
                y={notice.y}
                fontSize={notice.size}
                letterSpacing={notice.spacing}
            >
                {footer}
            </text>
        </>
    );
};
