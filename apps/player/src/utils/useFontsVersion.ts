import { useEffect, useState } from 'react';
import { createTextMeasure, type TextMeasure } from './textMeasure';

/**
 * 字體載入咗幾多次（W-017；Technical Spec「字體載入」）：`document.fonts.ready` 一次，之後每個 `loadingdone` 一次
 *（Noto Sans HK 按 unicode-range 分片，新字用到先下載；遠端 slab 字體可能遲到）。
 * 數字變 = 有字體載入咗，用後備字體量嘅闊度唔再啱，要重新量。冇 Font Loading API 就一直係 0。
 */
export const useFontsVersion = (): number => {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (!('fonts' in document)) return undefined;
        const { fonts } = document;
        let active = true;
        const bump = () => {
            if (active) setVersion((value) => value + 1);
        };
        void fonts.ready.then(bump);
        fonts.addEventListener('loadingdone', bump);
        return () => {
            active = false;
            fonts.removeEventListener('loadingdone', bump);
        };
    }, []);
    return version;
};

/**
 * 量字函數：字體載入完就換一個新嘅，用佢 fit 嘅元件（左上碟名、歌名）就會用真字體重新量。
 * 例如用後備字體放得落 88 號嘅碟名，Lubalin / Rokkitt 載入完闊咗就縮返細。
 */
export const useTextMeasure = (): TextMeasure => {
    const fontsVersion = useFontsVersion();
    const [current, setCurrent] = useState(() => ({ fontsVersion, measure: createTextMeasure() }));
    // 版本一變就喺同一次 render 換（React「render 期間調整 state」嘅做法），唔使等 effect 用舊字量多一次
    if (current.fontsVersion === fontsVersion) return current.measure;
    const next = { fontsVersion, measure: createTextMeasure() };
    setCurrent(next);
    return next.measure;
};
