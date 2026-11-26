/* ⑤ 用 requestAnimationFrame 收時間戳（`durationMs` 咁耐），之後交 frameStats 計 */

export const collectFrames = (durationMs: number): Promise<number[]> =>
    new Promise((resolve) => {
        const times: number[] = [];
        const tick = (now: number) => {
            times.push(now);
            const first = times[0] ?? now;
            if (now - first >= durationMs) resolve(times);
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

export const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
