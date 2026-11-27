import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagPanel } from './DiagPanel';
import { DiagRecorder } from './recorder';
import { readDiagFlag, writeDiagFlag } from './storage';
import { createTapCounter, isInside, type Rect, tapZone } from './tapZone';

/*
 * 臨時嘅畫面尺寸診斷（iPhone 主畫面 app：第一次開唔係全螢幕、轉完向底部安全區閃）。
 * 唯一接駁位：main.tsx 叫 installDiag()。刪走 = 刪 src/diag、main.tsx 兩行、語言檔 diag 一段。
 * 閂住時：唯一多咗嘅係 document 上面一個 passive 嘅 pointerdown（capture），唔攔、唔改任何㩒；冇 DOM。
 */

/** 右上版本號（VersionText）。有新版本時佢變咗版本掣（UpdateButton，㩒 = 更新），嗰陣唔計 */
const VERSION_SELECTOR = '[data-part="version"]';

interface Mounted {
    root: Root;
    host: HTMLElement;
    recorder: DiagRecorder;
}

let mounted: Mounted | null = null;

const show = (): void => {
    if (mounted) return;
    const recorder = new DiagRecorder();
    recorder.start();
    const host = document.createElement('div');
    host.dataset.diag = 'panel';
    document.body.append(host);
    const root = createRoot(host);
    root.render(createElement(DiagPanel, { recorder, onClose: () => setDiag(false) }));
    mounted = { root, host, recorder };
};

const hide = (): void => {
    if (!mounted) return;
    const { root, host, recorder } = mounted;
    mounted = null;
    root.unmount();
    host.remove();
    recorder.stop();
};

/** 開 / 閂，記住喺 localStorage（主畫面 app 重開都係同一個狀態） */
export const setDiag = (on: boolean): void => {
    writeDiagFlag(on);
    if (on) show();
    else hide();
};

export const isDiagOpen = (): boolean => mounted !== null;

const versionZone = (): Rect | null => {
    const label = document.querySelector(VERSION_SELECTOR);
    return label ? tapZone(label.getBoundingClientRect(), window.innerWidth) : null;
};

/** main.tsx 開 app 時叫一次（要早過 DOMContentLoaded）；回傳拆走嘅函數（測試用） */
export const installDiag = (): (() => void) => {
    const tap = createTapCounter();
    const onPointerDown = (event: PointerEvent) => {
        const zone = versionZone();
        if (!zone || !isInside({ x: event.clientX, y: event.clientY }, zone)) return;
        if (tap(event.timeStamp)) setDiag(!isDiagOpen());
    };
    const options = { capture: true, passive: true } as const;
    document.addEventListener('pointerdown', onPointerDown, options);
    if (readDiagFlag()) show();
    return () => {
        document.removeEventListener('pointerdown', onPointerDown, options);
        hide();
    };
};
