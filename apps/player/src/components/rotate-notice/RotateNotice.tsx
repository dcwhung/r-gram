import { t } from '../../i18n/t';
import './rotateNotice.css';

/*
 * 線條畫：一部直度手機 + 一條由打橫轉返直嘅弧形箭咀（畫布 96 × 96；線寬喺 rotateNotice.css）。
 * 純裝飾，意思由下面嘅文字講
 */
const PHONE = { x: 34, y: 14, width: 28, height: 52, radius: 5 };
const SPEAKER_PATH = 'M44 21 H52';
const ARROW_ARC_PATH = 'M18 52 A30 30 0 0 1 30 26';
const ARROW_HEAD_PATH = 'M22 26 H30 V34';

/**
 * 「請打直」（T-039；Functional Spec US-015、FR-018）。⚠️ 設計稿冇呢個畫面：proposal，等用戶確認。
 * 蓋住成個 viewport；舞台同時 `inert` + `aria-hidden`（App），所以讀屏同 Tab 只會去到呢度。
 */
export const RotateNotice = () => (
    <div className="rotate-notice" role="alert">
        <svg
            className="rotate-notice__drawing"
            viewBox="0 0 96 96"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x={PHONE.x}
                y={PHONE.y}
                width={PHONE.width}
                height={PHONE.height}
                rx={PHONE.radius}
                fill="none"
                stroke="currentColor"
            />
            <path d={SPEAKER_PATH} fill="none" stroke="currentColor" />
            <path d={ARROW_ARC_PATH} fill="none" stroke="currentColor" />
            <path d={ARROW_HEAD_PATH} fill="none" stroke="currentColor" />
        </svg>
        <p className="rotate-notice__text">{t('rotate.notice')}</p>
    </div>
);
