import { APP_VERSION } from '../config/appVersion';
import { t } from '../i18n/t';

/**
 * Preload 嘅暫時畫面：App 名、非官方聲明、版本號（FR-034 嘅文字）。
 * T-034 取代：旗幟、真實載入進度、`loadCatalog()`，載入完 dispatch `preloadDone`。
 */
export const PreloadPlaceholder = () => (
    <div className="app-identity">
        <strong>{t('app.name')}</strong>
        <span>{t('app.unofficial')}</span>
        <span>{t('app.version', { version: APP_VERSION })}</span>
    </div>
);
