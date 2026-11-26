import { t } from '../../i18n/t';
import { useUpdateStatus, type UpdatePort } from '../../pwa/useUpdates';
import './updatePrompt.css';

interface UpdatePromptProps {
    port: UpdatePort;
    /** 有全畫面嘅嘢蓋住（「請打直」）：唔顯示 */
    covered?: boolean;
}

/**
 * 更新提示（T-039；⚠️ 設計稿冇呢張卡，係 proposal，等用戶確認）。用緊 app 時有新版就出（播緊、停咗都一樣；
 * S-197：用緊時唔會自動更新），聽眾㩒「立即更新」先換；唔㩒就等下次開 app。
 * live region 一直喺度（空），內容出現時讀屏先會讀出。
 */
export const UpdatePrompt = ({ port, covered = false }: UpdatePromptProps) => {
    const status = useUpdateStatus(port);
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
