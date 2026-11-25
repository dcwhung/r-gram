import {
    REMOTE_FONT_CACHE,
    REMOTE_FONT_MARKER,
    remoteFontCaching,
    remoteFontSource,
    withRemoteFont,
} from './fontSource';

const FONT_URL = 'https://media.example/fonts/slab.woff2';

/* T-044：媒體 bucket 有字體檔就用佢（排喺本機 local() 之後、隨 app 嘅 Rokkitt 之前） */
describe('remoteFontSource', () => {
    it('should give a url() with the format of the file and a trailing comma', () => {
        expect(remoteFontSource(FONT_URL)).toBe(`url("${FONT_URL}") format("woff2"),`);
        expect(remoteFontSource('https://media.example/fonts/slab.otf')).toBe(
            'url("https://media.example/fonts/slab.otf") format("opentype"),',
        );
    });

    it('should leave out format() when the extension says nothing', () => {
        expect(remoteFontSource('https://media.example/font?id=7')).toBe(
            'url("https://media.example/font?id=7"),',
        );
    });

    // 冇設定 / 設錯：唔可以出空嘅或者爛嘅 url()
    it.each([
        undefined,
        '',
        '   ',
        'slab.woff2',
        'http://media.example/slab.woff2',
        'javascript:x',
    ])('should give nothing for %j', (value) => {
        expect(remoteFontSource(value)).toBe('');
    });

    it('should keep quotes in the address from closing the url() string', () => {
        expect(remoteFontSource('https://media.example/a"b.woff2')).toBe(
            'url("https://media.example/a%22b.woff2") format("woff2"),',
        );
    });

    it('should trim spaces around the setting', () => {
        expect(remoteFontSource(`  ${FONT_URL}\n`)).toBe(`url("${FONT_URL}") format("woff2"),`);
    });
});

describe('withRemoteFont', () => {
    const css = `src: local("A"), ${REMOTE_FONT_MARKER} url(b.woff2);\nsrc: local("A"), ${REMOTE_FONT_MARKER} url(c.woff2);`;

    it('should put the remote font into every rule', () => {
        expect(withRemoteFont(css, FONT_URL)).toBe(
            `src: local("A"), url("${FONT_URL}") format("woff2"), url(b.woff2);\n` +
                `src: local("A"), url("${FONT_URL}") format("woff2"), url(c.woff2);`,
        );
    });

    it('should drop the marker when there is no setting', () => {
        expect(withRemoteFont(css, undefined)).toBe(
            'src: local("A"),  url(b.woff2);\nsrc: local("A"),  url(c.woff2);',
        );
    });
});

// 遠端字體由 Service Worker 留低，離線都用到；冇設定就冇呢條規則
describe('remoteFontCaching', () => {
    it('should cache exactly the remote font, cache first', () => {
        const [rule, ...rest] = remoteFontCaching(FONT_URL);
        expect(rest).toHaveLength(0);
        expect(rule?.handler).toBe('CacheFirst');
        expect(rule?.options.cacheName).toBe(REMOTE_FONT_CACHE);
        expect(rule?.urlPattern.test(FONT_URL)).toBe(true);
        expect(rule?.urlPattern.test(`${FONT_URL}x`)).toBe(false);
        expect(rule?.urlPattern.test('https://media.example/fonts/slab_woff2')).toBe(false);
    });

    it('should add no rule without a valid setting', () => {
        expect(remoteFontCaching(undefined)).toEqual([]);
        expect(remoteFontCaching('not a url')).toEqual([]);
    });
});
