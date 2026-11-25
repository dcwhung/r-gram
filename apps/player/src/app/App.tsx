import { APP_VERSION } from '../config/appVersion';
import { t } from '../i18n/t';
import { Stage } from '../stage/Stage';
import './app.css';

/** 暫時嘅外殼：舞台 + App 名、非官方聲明、版本號。場景（Preload、主頁…）喺之後嘅任務加入 */
export const App = () => (
    <Stage>
        <div className="app-identity">
            <strong>{t('app.name')}</strong>
            <span>{t('app.unofficial')}</span>
            <span>{t('app.version', { version: APP_VERSION })}</span>
        </div>
    </Stage>
);
