import { useEffect, useState } from 'react';
import { type OrientationReading, readOrientation } from '../env';
import { TEXT } from '../text';
import { type Insets, readInsets } from './insets';

export interface ViewportReading extends OrientationReading {
    width: number;
    height: number;
    insets: Insets;
}

const read = (): ViewportReading => ({
    width: window.innerWidth,
    height: window.innerHeight,
    ...readOrientation(),
    insets: readInsets(),
});

/** iOS 轉機之後 viewport 大細有時遲啲先定：事件之後再讀一次 */
const SETTLE_MS = 600;

export const readingText = (reading: ViewportReading): string => {
    const { width, height, angle, type, legacy, insets } = reading;
    const sides = `${insets.top}/${insets.right}/${insets.bottom}/${insets.left}`;
    return `${width}×${height} · angle ${angle ?? '?'} · ${type} · window.orientation ${legacy ?? '?'} · ${TEXT.landscape.insets(sides)}`;
};

/** 跟住轉機更新；每個事件經 `onEvent` 記低（連時間，用嚟睇系統轉向嘅時序） */
export const useViewport = (onEvent: (text: string) => void): ViewportReading => {
    const [reading, setReading] = useState(read);
    useEffect(() => {
        const timers: number[] = [];
        const handle = (event: Event) => {
            const now = read();
            setReading(now);
            onEvent(TEXT.labelled(event.type, readingText(now)));
            timers.push(window.setTimeout(() => setReading(read()), SETTLE_MS));
        };
        const orientation = typeof screen === 'undefined' ? undefined : screen.orientation;
        window.addEventListener('resize', handle);
        window.addEventListener('orientationchange', handle);
        orientation?.addEventListener('change', handle);
        return () => {
            window.removeEventListener('resize', handle);
            window.removeEventListener('orientationchange', handle);
            orientation?.removeEventListener('change', handle);
            timers.forEach((timer) => window.clearTimeout(timer));
        };
    }, [onEvent]);
    return reading;
};
