/*
 * 讀歌曲文字檔（review S-137 X6、X7）：大過上限嘅檔唔讀——list 嘅大細已經超過就唔 get；
 * get 到嘅版本超過（list 之後換過檔）就唔讀 body、即刻 cancel。另外 isDirectChild（F1）唔當子資料夾嘅檔係第一層
 */
import { SONG_TEXT_MAX_BYTES } from '@r-gram/catalog';
import { isDirectChild } from '../src/media/listing';
import { readSongTextFile } from '../src/media/songTextFile';

const KEY = 'album-11-komorebi/05 a.txt';
const ETAG = '"v2"';

/** 假 bucket：記低 get；get 回一個 size 超過上限嘅 object，記低有冇讀 body */
const oversizedBucket = () => {
    const calls = { get: 0, read: 0, cancel: 0 };
    const object = {
        size: SONG_TEXT_MAX_BYTES + 1,
        httpEtag: ETAG,
        body: { cancel: async () => void (calls.cancel += 1) },
        arrayBuffer: async () => {
            calls.read += 1;
            return new ArrayBuffer(0);
        },
    };
    const bucket = {
        get: async () => {
            calls.get += 1;
            return object;
        },
    } as unknown as R2Bucket;
    return { bucket, calls };
};

describe('readSongTextFile: size limit', () => {
    it('should not fetch a file whose listed size is over the limit', async () => {
        const { bucket, calls } = oversizedBucket();
        const read = await readSongTextFile(bucket, { key: KEY, bytes: SONG_TEXT_MAX_BYTES + 1 });
        expect(calls.get).toBe(0);
        expect(read).toMatchObject({ etag: null, song: null, errors: [{ reason: 'TOO_LARGE' }] });
    });

    it('should not read the body of a fetched version over the limit', async () => {
        const { bucket, calls } = oversizedBucket();
        const read = await readSongTextFile(bucket, { key: KEY, bytes: 1 });
        expect(calls).toEqual({ get: 1, read: 0, cancel: 1 });
        expect(read).toMatchObject({ etag: ETAG, song: null, errors: [{ reason: 'TOO_LARGE' }] });
    });
});

describe('isDirectChild', () => {
    it('should accept a file directly in the folder only', () => {
        expect(isDirectChild('album-11-komorebi/01 a.m4a', 'album-11-komorebi')).toBe(true);
        expect(isDirectChild('album-11-komorebi/extra/01 a.m4a', 'album-11-komorebi')).toBe(false);
        expect(isDirectChild('album-11-komorebi/', 'album-11-komorebi')).toBe(false);
        expect(isDirectChild('album-11-komorebi-2/01 a.m4a', 'album-11-komorebi')).toBe(false);
    });
});
