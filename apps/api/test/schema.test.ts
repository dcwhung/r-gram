/* migrations/0001_init.sql 對 Technical Spec「數據庫設計」（CR-003 之後）：6 張表、欄位、約束、索引 */
import { env } from 'cloudflare:test';

const NOW = '2026-11-25T00:00:00.000Z';

interface ColumnRow {
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
}

/** 「名 型別 [NOT NULL] [DEFAULT x] [PK]」：一行一個欄，方便同 spec 對 */
const describeColumn = (column: ColumnRow): string =>
    [
        column.name,
        column.type,
        column.notnull ? 'NOT NULL' : '',
        column.dflt_value === null ? '' : `DEFAULT ${column.dflt_value}`,
        column.pk ? 'PK' : '',
    ]
        .filter((part) => part !== '')
        .join(' ');

const columnsOf = async (table: string): Promise<string[]> => {
    const rows = await env.DB.prepare(`PRAGMA table_info(${table})`).all<ColumnRow>();
    return rows.results.map(describeColumn);
};

const run = (sql: string, ...values: unknown[]) =>
    env.DB.prepare(sql)
        .bind(...values)
        .run();

const count = (table: string) =>
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<number>('n');

const insertAlbum = (id: string, extra: Record<string, unknown> = {}) => {
    const row = {
        id,
        title: 'Apollo 18',
        wheel_key: 'A',
        accent: '#c8442b',
        sort_order: 0,
        created_at: NOW,
        updated_at: NOW,
        ...extra,
    };
    const names = Object.keys(row);
    return run(
        `INSERT INTO albums (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        ...Object.values(row),
    );
};

const insertTrack = (id: string, albumId: string, no: number, extra = {}) => {
    const row = { id, album_id: albumId, no, title: '發現號', created_at: NOW, updated_at: NOW };
    const merged: Record<string, unknown> = { ...row, ...extra };
    const names = Object.keys(merged).map((name) => `"${name}"`);
    return run(
        `INSERT INTO tracks (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        ...Object.values(merged),
    );
};

const insertLyrics = (trackId: string, synced: unknown = 1) =>
    run(
        `INSERT INTO lyrics (track_id, source, synced, json_name, line_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ...[trackId, '[00:01.00]a', synced, '0123456789abcdef.json', 1, NOW],
    );

/** catalog_state 一行；`extra` 蓋過預設（一次成功嘅生成） */
const insertCatalogState = (extra: Record<string, unknown> = {}) => {
    const row = {
        id: 1,
        status: 'ok',
        hash: 'a'.repeat(64),
        generated_at: NOW,
        album_count: 17,
        track_count: 262,
        updated_at: NOW,
        updated_by: 'admin@example.com',
        error: null,
        ...extra,
    };
    const names = Object.keys(row);
    return run(
        `INSERT INTO catalog_state (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        ...Object.values(row),
    );
};

describe('D1 schema (0001_init)', () => {
    it('should create exactly the six tables of the Technical Spec', async () => {
        const rows = await env.DB.prepare(
            `SELECT name FROM sqlite_master WHERE type = 'table'
             AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations'
             ORDER BY name`,
        ).all<{ name: string }>();
        expect(rows.results.map((row) => row.name)).toEqual([
            'albums',
            'assets',
            'catalog_state',
            'lyrics',
            'sessions',
            'tracks',
        ]);
    });

    it('should define albums as specified', async () => {
        expect(await columnsOf('albums')).toEqual([
            'id TEXT NOT NULL PK',
            'title TEXT NOT NULL',
            'wheel_key TEXT NOT NULL',
            'release_date TEXT',
            'year INTEGER',
            "type TEXT NOT NULL DEFAULT ''",
            "label TEXT NOT NULL DEFAULT ''",
            'accent TEXT NOT NULL',
            'cover TEXT',
            'thumb TEXT',
            'folder TEXT',
            'sort_order INTEGER NOT NULL',
            'created_at TEXT NOT NULL',
            'updated_at TEXT NOT NULL',
        ]);
    });

    it('should define tracks as specified', async () => {
        expect(await columnsOf('tracks')).toEqual([
            'id TEXT NOT NULL PK',
            'album_id TEXT NOT NULL',
            'no INTEGER NOT NULL',
            'title TEXT NOT NULL',
            'subtitle TEXT',
            'audio_key TEXT',
            'audio_manual INTEGER NOT NULL DEFAULT 0',
            'mv_key TEXT',
            'mv_manual INTEGER NOT NULL DEFAULT 0',
            'composer TEXT',
            'lyricist TEXT',
            'arranger TEXT',
            'producer TEXT',
            'lyrics_source_url TEXT',
            'note TEXT',
            'youtube_id TEXT',
            'video_kind TEXT',
            'created_at TEXT NOT NULL',
            'updated_at TEXT NOT NULL',
        ]);
    });

    it('should define lyrics, assets, catalog_state and sessions as specified', async () => {
        expect(await columnsOf('lyrics')).toEqual([
            'track_id TEXT NOT NULL PK',
            'source TEXT NOT NULL',
            'synced INTEGER NOT NULL',
            'json_name TEXT NOT NULL',
            'line_count INTEGER NOT NULL',
            'updated_at TEXT NOT NULL',
        ]);
        expect(await columnsOf('assets')).toEqual([
            'name TEXT NOT NULL PK',
            'content_type TEXT NOT NULL',
            'bytes INTEGER NOT NULL',
            'created_at TEXT NOT NULL',
        ]);
        expect(await columnsOf('catalog_state')).toEqual([
            'id INTEGER NOT NULL PK',
            'status TEXT NOT NULL',
            'hash TEXT',
            'generated_at TEXT',
            'album_count INTEGER',
            'track_count INTEGER',
            'updated_at TEXT NOT NULL',
            'updated_by TEXT NOT NULL',
            'error TEXT',
        ]);
        expect(await columnsOf('sessions')).toEqual([
            'token_hash TEXT NOT NULL PK',
            'email TEXT NOT NULL',
            'expires_at INTEGER NOT NULL',
        ]);
    });

    it('should create the indexes of the Technical Spec', async () => {
        const rows = await env.DB.prepare(
            `SELECT name, tbl_name, sql FROM sqlite_master
             WHERE type = 'index' AND sql IS NOT NULL ORDER BY name`,
        ).all<{ name: string; tbl_name: string; sql: string }>();
        const indexes = rows.results.map((row) => row.sql.replace(/\s+/g, ' '));
        expect(indexes).toEqual([
            'CREATE INDEX albums_sort_order ON albums (sort_order)',
            'CREATE INDEX sessions_expires_at ON sessions (expires_at)',
            'CREATE UNIQUE INDEX tracks_album_no ON tracks (album_id, "no")',
            'CREATE INDEX tracks_title ON tracks (title)',
        ]);
    });
});

describe('D1 constraints (0001_init)', () => {
    it('should accept album ids of lowercase words joined by single hyphens', async () => {
        for (const id of ['apollo-18', 'easy', '2008', 'a-b-c']) await insertAlbum(id);
        expect(await count('albums')).toBe(4);
    });

    it('should reject malformed album ids and the reserved id favourites', async () => {
        const bad = ['', 'Apollo', 'a_b', 'a b', '-a', 'a-', 'a--b', '樂', 'favourites'];
        for (const id of bad) await expect(insertAlbum(id), id).rejects.toThrow();
    });

    it('should reject track ids outside [a-z0-9-]', async () => {
        await insertAlbum('apollo-18');
        await insertTrack('apollo-18-01', 'apollo-18', 1);
        for (const id of ['', 'Apollo-01', 'a b', 'a_b']) {
            await expect(insertTrack(id, 'apollo-18', 2), id).rejects.toThrow();
        }
    });

    it('should keep track numbers unique within an album', async () => {
        await insertAlbum('apollo-18');
        await insertAlbum('easy');
        await insertTrack('apollo-18-01', 'apollo-18', 1);
        await insertTrack('easy-01', 'easy', 1);
        await expect(insertTrack('apollo-18-dup', 'apollo-18', 1)).rejects.toThrow();
    });

    it('should delete tracks and lyrics together with their album', async () => {
        await insertAlbum('apollo-18');
        await insertTrack('apollo-18-01', 'apollo-18', 1);
        await insertLyrics('apollo-18-01');
        await run('DELETE FROM albums WHERE id = ?', 'apollo-18');
        expect(await count('tracks')).toBe(0);
        expect(await count('lyrics')).toBe(0);
    });

    it('should refuse a track of an unknown album and lyrics of an unknown track', async () => {
        await expect(insertTrack('ghost-01', 'ghost', 1)).rejects.toThrow();
        await expect(insertLyrics('ghost-01')).rejects.toThrow();
    });

    it('should only accept covers and thumbs that exist in assets', async () => {
        const name = '9f2c1a7b3d4e5f60.webp';
        await expect(insertAlbum('apollo-18', { cover: name })).rejects.toThrow();
        await expect(insertAlbum('apollo-18', { thumb: name })).rejects.toThrow();
        await run(
            'INSERT INTO assets (name, content_type, bytes, created_at) VALUES (?, ?, ?, ?)',
            name,
            'image/webp',
            1,
            NOW,
        );
        await insertAlbum('apollo-18', { cover: name, thumb: name });
        expect(await count('albums')).toBe(1);
    });

    // CR-003：冇上下架，兩張表都冇 enabled 欄
    it('should have no enabled flag on albums or tracks', async () => {
        await expect(insertAlbum('apollo-18', { enabled: 1 })).rejects.toThrow(/enabled/);
        await insertAlbum('apollo-18');
        await expect(insertTrack('apollo-18-01', 'apollo-18', 1, { enabled: 1 })).rejects.toThrow(
            /enabled/,
        );
    });

    it('should only accept 0 or 1 for the manual flags', async () => {
        await insertAlbum('apollo-18');
        for (const flag of ['audio_manual', 'mv_manual']) {
            await expect(
                insertTrack('apollo-18-01', 'apollo-18', 1, { [flag]: 2 }),
            ).rejects.toThrow();
        }
    });

    it('should store whether lyrics are synced as 0 or 1, and require it', async () => {
        await insertAlbum('apollo-18');
        for (const no of [1, 2, 3, 4]) await insertTrack(`apollo-18-0${no}`, 'apollo-18', no);
        await insertLyrics('apollo-18-01', 1);
        await insertLyrics('apollo-18-02', 0);
        await expect(insertLyrics('apollo-18-03', 2)).rejects.toThrow();
        await expect(insertLyrics('apollo-18-04', null)).rejects.toThrow();
        expect(await count('lyrics')).toBe(2);
    });

    it('should only accept https lyrics source links', async () => {
        await insertAlbum('apollo-18');
        const url = (value: string) => ({ lyrics_source_url: value });
        await insertTrack('apollo-18-01', 'apollo-18', 1, url('https://example.com/lyrics'));
        for (const value of ['http://example.com', 'HTTPS://example.com', 'javascript:alert(1)']) {
            await expect(insertTrack('apollo-18-02', 'apollo-18', 2, url(value))).rejects.toThrow();
        }
    });

    it('should keep a single catalog_state row with id 1', async () => {
        await expect(insertCatalogState({ id: 2 })).rejects.toThrow();
        await insertCatalogState();
        await expect(insertCatalogState()).rejects.toThrow();
        expect(await count('catalog_state')).toBe(1);
    });

    it('should only accept the catalog statuses ok and failed', async () => {
        for (const status of ['pending', 'done', '']) {
            await expect(insertCatalogState({ status }), status).rejects.toThrow();
        }
        await insertCatalogState({ status: 'failed' });
        expect(await count('catalog_state')).toBe(1);
    });

    // 生成失敗而且之前未成功過：冇 hash、冇生成時間、冇數目，但有原因
    it('should allow a failed state before any catalog was generated', async () => {
        const never = { hash: null, generated_at: null, album_count: null, track_count: null };
        await insertCatalogState({ ...never, status: 'failed', error: 'R2 write failed' });
        expect(await count('catalog_state')).toBe(1);
    });

    it('should require the hash, time and counts of an ok catalog', async () => {
        for (const column of ['hash', 'generated_at', 'album_count', 'track_count']) {
            await expect(insertCatalogState({ [column]: null }), column).rejects.toThrow();
        }
    });
});
