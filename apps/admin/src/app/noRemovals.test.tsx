/*
 * S-232：同步頁永遠唔叫 API-035（確認移除；Functional Spec D73、D76）。喺傳輸層鎖住：全域 fetch 換做記低每個請求嘅假 Worker，
 * 用真嘅 API client 行一次有待確認移除嘅完整同步，任何部分（client、runner、頁面）打過 /api/sync/removals 都會 fail
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAdminApi } from '../api/adminApi';
import { coverJob, folderResult, overviewOf, processed, STATS } from '../sync/testing/fakeApi';
import { App } from './App';

const A = 'album-11-komorebi';
const REMOVALS_PATH = '/api/sync/removals';

const ROUTES: Record<string, unknown> = {
    'GET /api/me': { email: 'admin@example.com' },
    'GET /api/sync': overviewOf([A], {
        missingAlbums: [{ kind: 'album', albumId: 'gone', folder: 'album-09-gone', title: 'G' }],
    }),
    [`POST /api/sync/folders/${A}`]: folderResult(A, {
        pendingRemovals: [{ kind: 'audio', albumId: 'komorebi', key: `${A}/03 a.m4a` }],
        coverJobs: [coverJob(A)],
    }),
    'PUT /api/assets': { name: 'a.webp' },
    'PUT /api/albums/komorebi/cover': { album: {}, checks: [] },
    'GET /api/albums': { albums: [], stats: STATS },
};

const recordingWorker = () => {
    const requests: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const request = `${init.method ?? 'GET'} ${String(input)}`;
        requests.push(request);
        const body = ROUTES[request];
        if (body === undefined) return new Response('{}', { status: 404 });
        return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchImpl);
    return requests;
};

describe('sync page and the removals API', () => {
    it('should list pending removals without ever requesting the removals endpoint', async () => {
        const requests = recordingWorker();
        const api = createAdminApi();
        const syncDeps = {
            api,
            prepareCover: async () => processed(),
            wait: async () => undefined,
        };
        render(<App api={api} syncDeps={syncDeps} />);
        await userEvent.click(await screen.findByRole('button', { name: '同步媒體資料夾' }));
        expect(await screen.findByText('同步完成。')).toBeInTheDocument();
        expect(screen.getByRole('log')).toHaveTextContent('待確認移除（未移除）');
        expect(requests).toContain(`POST /api/sync/folders/${A}`);
        expect(requests.filter((request) => request.includes(REMOVALS_PATH))).toEqual([]);
        expect(requests.every((request) => request.split(' ')[1]?.startsWith('/'))).toBe(true);
    });
});
