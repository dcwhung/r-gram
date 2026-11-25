/* migrations/0001_init.sql 對 Technical Spec「數據庫設計」：6 張表、欄位、約束、索引 */
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

const insertLyrics = (trackId: string) =>
    run(
        'INSERT INTO lyrics (track_id, lrc, json_name, line_count, updated_at) VALUES (?, ?, ?, ?, ?)',
        trackId,
        '[00:01.00]a',
        '0123456789abcdef.json',
        1,
        NOW,
    );

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
            'lyrics',
            'publishes',
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
            'enabled INTEGER NOT NULL DEFAULT 0',
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
            'enabled INTEGER NOT NULL DEFAULT 1',
            'created_at TEXT NOT NULL',
            'updated_at TEXT NOT NULL',
        ]);
    });

    it('should define lyrics, assets, publishes and sessions as specified', async () => {
        expect(await columnsOf('lyrics')).toEqual([
            'track_id TEXT NOT NULL PK',
            'lrc TEXT NOT NULL',
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
        expect(await columnsOf('publishes')).toEqual([
            'id INTEGER PK',
            'created_at TEXT NOT NULL',
            'created_by TEXT NOT NULL',
            'status TEXT NOT NULL',
            'hash TEXT NOT NULL',
            'document TEXT NOT NULL',
            'ids TEXT NOT NULL',
            'album_count INTEGER NOT NULL',
            'track_count INTEGER NOT NULL',
            'summary TEXT NOT NULL',
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

    it('should default albums to unpublished and tracks to published, flags 0 or 1 only', async () => {
        await insertAlbum('apollo-18');
        await insertTrack('apollo-18-01', 'apollo-18', 1);
        const album = await env.DB.prepare('SELECT enabled FROM albums').first('enabled');
        const track = await env.DB.prepare('SELECT enabled FROM tracks').first('enabled');
        expect([album, track]).toEqual([0, 1]);
        await expect(insertAlbum('easy', { enabled: 2 })).rejects.toThrow();
        for (const flag of ['enabled', 'audio_manual', 'mv_manual']) {
            await expect(insertTrack('easy-01', 'apollo-18', 2, { [flag]: 2 })).rejects.toThrow();
        }
    });

    it('should only accept https lyrics source links', async () => {
        await insertAlbum('apollo-18');
        const url = (value: string) => ({ lyrics_source_url: value });
        await insertTrack('apollo-18-01', 'apollo-18', 1, url('https://example.com/lyrics'));
        for (const value of ['http://example.com', 'HTTPS://example.com', 'javascript:alert(1)']) {
            await expect(insertTrack('apollo-18-02', 'apollo-18', 2, url(value))).rejects.toThrow();
        }
    });

    it('should only accept the publish statuses pending, ok and failed', async () => {
        const publish = (status: string) =>
            run(
                `INSERT INTO publishes
                 (created_at, created_by, status, hash, document, ids, album_count, track_count, summary)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ...[NOW, 'admin@example.com', status, 'hash', '{}', '[]', 0, 0, '{}'],
            );
        for (const status of ['pending', 'ok', 'failed']) await publish(status);
        await expect(publish('done')).rejects.toThrow();
        const ids = await env.DB.prepare('SELECT id FROM publishes ORDER BY id').all();
        expect(ids.results.map((row) => row.id)).toEqual([1, 2, 3]);
    });
});
