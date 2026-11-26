import { t } from '../i18n/t';

/**
 * 載入失敗（US-004）只畀讀屏聽嘅通知：畫面上嘅一行提示喺左上「第 nn 首 · 未能播放」。
 * live region 一直喺舞台外面（空），失敗先填字，讀屏先會讀出（同 UpdateNotice 一樣做法；唔用 role="status"，主頁得一個 status）
 */
export const PlaybackNotice = ({ failedTitle }: { failedTitle: string | null }) => (
    <p className="visually-hidden" aria-live="polite" data-part="playback-notice">
        {failedTitle === null ? null : t('track.failedNotice', { title: failedTitle })}
    </p>
);
