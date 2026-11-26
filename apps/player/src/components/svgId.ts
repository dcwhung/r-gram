import { useId } from 'react';

/** 一個元件自己嘅 SVG id（漸層、mask、clipPath）。useId() 可以有冒號等符號；url(#…) 用返淨係英數 */
export const useSvgId = (prefix: string): string =>
    `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
