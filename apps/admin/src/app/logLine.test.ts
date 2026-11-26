import { logLines } from './logLine';

const A = 'album-11-komorebi';
const done = {
    type: 'folderDone' as const,
    folder: A,
    created: false,
    added: 1,
    updated: 2,
    unchanged: 3,
    failed: [],
    checks: [],
};

describe('logLines', () => {
    it('should describe the start and the end', () => {
        expect(logLines({ type: 'started', folders: 3 })).toEqual(['開始同步：共 3 個資料夾。']);
        expect(logLines({ type: 'stopped', code: 'UNAUTHORIZED' })).toEqual([
            '同步已停止（UNAUTHORIZED）。',
        ]);
    });

    it('should give one line per folder with its counts', () => {
        expect(logLines(done)).toEqual([`${A}：新增 1、更新 2、沒有改動 3`]);
        expect(logLines({ ...done, created: true })).toEqual([
            `${A}：新專輯；新增 1、更新 2、沒有改動 3`,
        ]);
    });

    it('should add lines for failed tracks and check results', () => {
        const lines = logLines({
            ...done,
            failed: [{ no: 4, trackId: null, code: 'STALE', message: '' }],
            checks: [
                { level: 'warning', code: 'NO_AUDIO', message: '' },
                { level: 'warning', code: 'NO_AUDIO', message: '' },
                { level: 'error', code: 'TEXT_INVALID', message: '' },
            ],
        });
        expect(lines.slice(1)).toEqual([
            `${A}：第 4 首未能同步（STALE）`,
            `${A}：檢查結果 3 項（NO_AUDIO × 2、TEXT_INVALID）`,
        ]);
    });

    it('should name problems with the folder and the error code', () => {
        expect(logLines({ type: 'folderProblem', folder: A, code: 'DUPLICATE_ALBUM_ID' })).toEqual([
            `${A}：問題（DUPLICATE_ALBUM_ID）`,
        ]);
        expect(
            logLines({ type: 'coverProblem', folder: A, slot: 'cover2', code: 'NO_FIRST_COVER' }),
        ).toEqual([`${A}：第二張封面問題（NO_FIRST_COVER）`]);
        expect(
            logLines({ type: 'invalidFolder', folder: 'X', code: 'INVALID_FOLDER_NAME' }),
        ).toEqual(['X：資料夾名稱不符合格式，已略過（INVALID_FOLDER_NAME）']);
    });

    it('should note an upscaled or cropped cover', () => {
        expect(
            logLines({
                type: 'coverDone',
                folder: A,
                slot: 'cover',
                upscaled: false,
                notSquare: false,
            }),
        ).toEqual([`${A}：封面已處理`]);
        expect(
            logLines({
                type: 'coverDone',
                folder: A,
                slot: 'cover',
                upscaled: true,
                notSquare: true,
            }),
        ).toEqual([`${A}：封面已處理；原圖小於 1200 像素，已放大；原圖不是正方形，已置中裁切`]);
    });

    it('should describe each kind of pending removal', () => {
        const line = (removal: object) =>
            logLines({
                type: 'removal',
                folder: A,
                removal: { albumId: 'k', ...removal } as never,
            });
        expect(line({ kind: 'album', title: 'Komorebi' })).toEqual([
            `待確認移除（未移除）：${A} 專輯「Komorebi」`,
        ]);
        expect(line({ kind: 'track', no: 4, title: '毒蟲圖鑑' })).toEqual([
            `待確認移除（未移除）：${A} 第 4 首「毒蟲圖鑑」`,
        ]);
        expect(line({ kind: 'audio', key: `${A}/04 a.m4a` })).toEqual([
            `待確認移除（未移除）：${A} 音檔 ${A}/04 a.m4a`,
        ]);
        expect(line({ kind: 'mv', key: 'm' })[0]).toContain('MV m');
        expect(line({ kind: 'text', key: 't' })[0]).toContain('歌曲文字 t');
        expect(line({ kind: 'cover', slot: 'cover2' })[0]).toContain('第二張封面');
        expect(line({ kind: 'track' })[0]).toContain('第 ? 首「」');
    });

    it('should describe retries, duplicates and an incomplete listing', () => {
        expect(logLines({ type: 'retry', folder: A, attempt: 1, code: 'NETWORK' })).toEqual([
            `${A}：第 1 次失敗（NETWORK），稍後重試`,
        ]);
        expect(
            logLines({ type: 'retry', folder: null, attempt: 2, code: 'INTERNAL' })[0],
        ).toContain('資料夾清單');
        expect(
            logLines({ type: 'duplicateId', id: 'x', folders: ['album-01-x', 'ep-01-x'] }),
        ).toEqual(['專輯編號 x 重複：album-01-x、ep-01-x']);
        expect(logLines({ type: 'truncated' })[0]).toContain('不完整');
    });

    it('should leave the summary to its own section', () => {
        const summary = {
            stats: null,
            folders: 0,
            failedFolders: 0,
            coversDone: 0,
            coverProblems: 0,
            checks: 0,
            pendingRemovals: 0,
            stopped: null,
        };
        expect(logLines({ type: 'finished', summary })).toEqual(['同步完成。']);
    });
});
