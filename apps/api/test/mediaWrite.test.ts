/*
 * 寫媒體 bucket 嘅唯一入口（T-106；Technical Spec「寫返媒體 bucket」、「安全設計 → 寫媒體 bucket」）：
 * 只寫專輯資料夾第一層嘅 `info.txt` 同 `NN ….txt`；條件寫入（ETag／新檔）；UTF-8、冇 BOM、LF
 */
import { env } from 'cloudflare:test';
import {
    isWritableTextKey,
    normalizeText,
    putMediaText,
    type MediaTextTarget,
} from '../src/media/writeText';

const FOLDER = 'album-11-komorebi';

const info = (key: string, folder = FOLDER): MediaTextTarget => ({ kind: 'info', folder, key });
const text = (key: string, no = 5, folder = FOLDER): MediaTextTarget => ({
    kind: 'text',
    folder,
    key,
    no,
});

describe('isWritableTextKey', () => {
    it.each([
        info(`${FOLDER}/info.txt`),
        info(`${FOLDER}/Info.TXT`),
        text(`${FOLDER}/05 太平門.txt`),
        text(`${FOLDER}/05.txt`),
    ])('should allow %j', (target) => {
        expect(isWritableTextKey(target)).toBe(true);
    });

    it.each([
        ['path traversal', text(`${FOLDER}/../_fonts/05 x.txt`)],
        ['dot segments', text(`${FOLDER}/../05 x.txt`)],
        ['another folder', text('album-12-other/05 x.txt')],
        ['a sub-folder', text(`${FOLDER}/sub/05 x.txt`)],
        ['a reserved folder', info('_fonts/info.txt', '_fonts')],
        ['a folder name out of format', info('Album-11-x/info.txt', 'Album-11-x')],
        ['a folder with a slash', info('album-11-x/../info.txt', 'album-11-x/..')],
        ['audio', text(`${FOLDER}/05 太平門.m4a`)],
        ['MV', text(`${FOLDER}/05 太平門.mp4`)],
        ['a cover', info(`${FOLDER}/cover.jpg`)],
        ['another number', text(`${FOLDER}/06 x.txt`)],
        ['info.txt as song text', text(`${FOLDER}/info.txt`)],
        ['song text as info.txt', info(`${FOLDER}/05 x.txt`)],
        ['an empty name', text(`${FOLDER}/`)],
        ['no folder', text('05 x.txt')],
    ])('should refuse %s', (_name, target) => {
        expect(isWritableTextKey(target)).toBe(false);
    });
});

describe('normalizeText', () => {
    it('should drop the BOM and turn CRLF and CR into LF, and change nothing else', () => {
        expect(normalizeText('\uFEFF甲\r\n乙\r丙\n  丁 \t')).toBe('甲\n乙\n丙\n  丁 \t');
    });
});

describe('putMediaText', () => {
    const KEY = `${FOLDER}/05 太平門.txt`;

    it('should create a new file only when there is none', async () => {
        const etag = await putMediaText(env.MEDIA, text(KEY), '太平門', null);
        expect(etag).toMatch(/^".+"$/);
        const object = await env.MEDIA.get(KEY);
        expect(await object?.text()).toBe('太平門');
        expect(object?.httpMetadata?.contentType).toBe('text/plain; charset=utf-8');
        expect(await putMediaText(env.MEDIA, text(KEY), '另一個', null)).toBeNull();
        expect(await (await env.MEDIA.get(KEY))?.text()).toBe('太平門');
    });

    it('should replace a file only while it still has the ETag it was read with', async () => {
        const first = (await env.MEDIA.put(KEY, '舊'))?.httpEtag ?? '';
        const second = await putMediaText(env.MEDIA, text(KEY), '新', first);
        expect(second).not.toBeNull();
        expect(await putMediaText(env.MEDIA, text(KEY), '再改', first)).toBeNull();
        expect(await (await env.MEDIA.get(KEY))?.text()).toBe('新');
    });

    it('should write the text as UTF-8 without BOM and with LF', async () => {
        await putMediaText(env.MEDIA, text(KEY), '\uFEFF甲\r\n乙', null);
        const bytes = new Uint8Array((await (await env.MEDIA.get(KEY))?.arrayBuffer()) ?? []);
        expect([...bytes]).toEqual([...new TextEncoder().encode('甲\n乙')]);
    });

    it('should throw and write nothing for a key outside the allowed kinds', async () => {
        await expect(
            putMediaText(env.MEDIA, text(`${FOLDER}/05 太平門.m4a`), 'x', null),
        ).rejects.toThrow();
        await expect(putMediaText(env.MEDIA, text(KEY), 'x', '*')).rejects.toThrow();
        expect((await env.MEDIA.list()).objects).toEqual([]);
    });
});
