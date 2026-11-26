/*
 * ① 產品嘅做法（Technical Spec 實現注意事項 1）：㩒落去（手勢入面）即刻 `muted = true` + `play()`，
 * 唱臂開場 1.5 秒後落針：`currentTime = 0`、`muted = false`（手勢以外）。量度落針之後聲音有冇真係行。
 */
import { UNLOCK_DELAY_MS } from '../config';
import { errorText } from '../media/probe';
import { TEXT } from '../text';

const LOG = TEXT.unlockLog;

/** 落針之後等幾耐先睇 currentTime 有冇行 */
const CHECK_AFTER_MS = 1200;
/** currentTime 起碼行咗幾多秒先當有出聲 */
const MIN_PROGRESS_S = 0.5;

export interface UnlockReport {
    ok: boolean;
    detail: string;
}

type Log = (text: string) => void;

const watchPlay = (promise: Promise<void>, label: string, log: Log, errors: string[]) =>
    promise.then(
        () => log(LOG.playOk(label)),
        (error: unknown) => {
            errors.push(`${label}: ${errorText(error)}`);
            log(LOG.playRejected(label, errorText(error)));
        },
    );

const checkSound = (
    audio: HTMLAudioElement,
    tap: number,
    errors: string[],
    done: (r: UnlockReport) => void,
) => {
    const start = audio.currentTime;
    const dropAt = Math.round(performance.now() - tap);
    window.setTimeout(() => {
        const moved = audio.currentTime - start;
        const ok = !audio.paused && !audio.muted && moved >= MIN_PROGRESS_S && errors.length === 0;
        const parts = [
            LOG.dropAt(dropAt),
            LOG.moved(moved.toFixed(2)),
            `paused=${audio.paused}`,
            `muted=${audio.muted}`,
        ];
        done({ ok, detail: [...parts, ...errors].join(TEXT.comma) });
    }, CHECK_AFTER_MS);
};

/** 要喺 click handler 入面同步叫 */
export const primeThenDrop = (
    audio: HTMLAudioElement,
    url: string,
    log: Log,
    done: (r: UnlockReport) => void,
) => {
    const tap = performance.now();
    const errors: string[] = [];
    audio.src = url;
    audio.muted = true;
    void watchPlay(audio.play(), LOG.muted, log, errors);
    window.setTimeout(() => {
        audio.currentTime = 0;
        audio.muted = false;
        log(LOG.dropped(Math.round(performance.now() - tap)));
        if (audio.paused) void watchPlay(audio.play(), LOG.drop, log, errors);
        checkSound(audio, tap, errors, done);
    }, UNLOCK_DELAY_MS);
};

/** 對照：手勢入面乜都唔做，1.5 秒後先 `play()`（用一個新嘅 element，唔受 1a 解鎖影響） */
export const playLater = (url: string, log: Log, done: (r: UnlockReport) => void) => {
    const fresh = new Audio();
    window.setTimeout(() => {
        fresh.src = url;
        fresh.play().then(
            () => {
                log(LOG.controlOk);
                done({ ok: true, detail: LOG.controlPlays });
                window.setTimeout(() => fresh.pause(), CHECK_AFTER_MS);
            },
            (error: unknown) => done({ ok: false, detail: LOG.rejected(errorText(error)) }),
        );
    }, UNLOCK_DELAY_MS);
};
