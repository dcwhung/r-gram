import { t } from '../../i18n/t';
import './updateButton.css';

/**
 * 有新版本時只畀讀屏聽嘅通知（T-109）：畫面上冇另外一粒提示，版本號變咗掣；呢個 live region 喺舞台外面一直都喺度
 *（空），有新版本先填字，讀屏先會讀出。
 */
export const UpdateNotice = ({ waiting }: { waiting: boolean }) => (
    <p className="visually-hidden" role="status">
        {waiting ? t('update.available') : null}
    </p>
);
