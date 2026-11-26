import { t } from '../../i18n/t';
import { useUpdateStatus, type UpdatePort } from '../../pwa/useUpdates';
import './updatePrompt.css';

interface UpdatePromptProps {
    port: UpdatePort;
    /** 播緊歌或者 MV 開住（pwa/playbackActivity.ts）：交畀 UpdateManager 決定幾時換版 */
    playing: boolean;
    /** 有全畫面嘅嘢蓋住（「請打直」）：唔顯示，但照樣將播放狀態交畀 UpdateManager */
    covered?: boolean;
}

/**
 * 更新提示（T-039；⚠️ 設計稿冇呢張卡，係 proposal，等用戶確認）。只喺播緊時有新版先出：
 * 停咗會自動更新（Functional Spec D14），呢度只係畀聽眾揀即刻更新。
 * live region 一直喺度（空），內容出現時讀屏先會讀出。
 */
export const UpdatePrompt = ({ port, playing, covered = false }: UpdatePromptProps) => {
    const status = useUpdateStatus(port, playing);
    const open = status === 'waiting' && !covered;
    return (
        <div className="update-prompt" role="status" data-open={open}>
            {open ? (
                <>
                    <span className="update-prompt__text">{t('update.available')}</span>
                    <button
                        type="button"
                        className="update-prompt__apply"
                        // 歌單開住時 Tab 兜圈都包埋呢粒掣（arc-list/useListFocus.ts，S-199）
                        data-trap-stop
                        aria-label={t('update.applyLabel')}
                        onClick={port.applyNow}
                    >
                        {t('update.apply')}
                    </button>
                </>
            ) : null}
        </div>
    );
};
