import { APP_VERSION } from '../../config/appVersion';
import { t } from '../../i18n/t';
import type { TextLine } from '../../stage/layouts';
import './infoBlock.css';

/** 右上版本號（US-002：全程顯示，數值由 build 注入）。貼頂組，同左上資訊同一行（FR-039） */
export const VersionText = ({ version }: { version: TextLine }) => (
    <text
        data-part="version"
        className="info-version"
        x={version.x}
        y={version.y}
        textAnchor="end"
        fontSize={version.size}
        letterSpacing={version.spacing}
    >
        {t('app.version', { version: APP_VERSION })}
    </text>
);
