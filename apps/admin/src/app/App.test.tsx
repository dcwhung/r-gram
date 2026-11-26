import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/client';
import type { AdminApi } from '../api/adminApi';
import { coverJob, fakeDeps, folderResult, overviewOf, STATS } from '../sync/testing/fakeApi';
import { App } from './App';

const A = 'album-11-komorebi';

const setup = (me: () => Promise<string | null>) => {
    const fake = fakeDeps({
        overview: overviewOf([A]),
        folders: { [A]: [folderResult(A, { added: [{ no: 1 }] })] },
    });
    const logout = vi.fn(async () => undefined);
    const api: AdminApi = { ...fake.api, me: vi.fn(me), logout };
    render(<App api={api} syncDeps={{ ...fake.deps, api }} />);
    return { ...fake, logout };
};

describe('App', () => {
    it('should offer the Google sign-in link when nobody is signed in', async () => {
        setup(async () => null);
        const link = await screen.findByRole('link', { name: '以 Google 登入' });
        expect(link).toHaveAttribute('href', '/auth/google/start?next=%2F');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should say when the server cannot be reached', async () => {
        setup(() => Promise.reject(new ApiError(0, 'NETWORK', 'x')));
        expect(await screen.findByText('未能連接伺服器（NETWORK）。')).toBeInTheDocument();
    });

    it('should show the admin, sync the bucket and show the log and summary', async () => {
        const { api } = setup(async () => 'admin@example.com');
        expect(await screen.findByText('已登入：admin@example.com')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '同步媒體資料夾' }));
        expect(await screen.findByText('同步完成。')).toBeInTheDocument();
        const log = screen.getByRole('log');
        expect(log).toHaveTextContent(`${A}：新專輯；新增 1、更新 0、沒有改動 0`);
        expect(screen.getByText('有音檔的歌曲').nextElementSibling).toHaveTextContent(
            String(STATS.tracksWithAudio),
        );
        expect(screen.getByText('待確認移除').nextElementSibling).toHaveTextContent('0');
        expect(api.syncOverview).toHaveBeenCalledOnce();
    });

    it('should say when the statistics could not be read', async () => {
        const fake = fakeDeps({
            overview: overviewOf([]),
            stats: new ApiError(500, 'INTERNAL', 'x'),
        });
        const api: AdminApi = { ...fake.api, me: async () => 'a@example.com', logout: vi.fn() };
        render(<App api={api} syncDeps={{ ...fake.deps, api }} />);
        await userEvent.click(await screen.findByRole('button', { name: '同步媒體資料夾' }));
        expect(await screen.findByText('未能讀取統計。')).toBeInTheDocument();
    });

    it('should disable the button while syncing', async () => {
        let release: () => void = () => undefined;
        const fake = fakeDeps({ overview: overviewOf([]) });
        fake.api.syncOverview.mockImplementation(
            () => new Promise((resolve) => (release = () => resolve(overviewOf([])))),
        );
        const api: AdminApi = { ...fake.api, me: async () => 'a@example.com', logout: vi.fn() };
        render(<App api={api} syncDeps={{ ...fake.deps, api }} />);
        await userEvent.click(await screen.findByRole('button', { name: '同步媒體資料夾' }));
        expect(screen.getByRole('button', { name: '同步中…' })).toBeDisabled();
        release();
        expect(await screen.findByRole('button', { name: '同步媒體資料夾' })).toBeEnabled();
    });

    // S-231：同步途中 session 過期 → 停低、轉返登入連結
    it('should go back to the sign-in link when the session expires during a sync', async () => {
        const fake = fakeDeps({
            overview: overviewOf([A]),
            folders: { [A]: [folderResult(A, { coverJobs: [coverJob(A)] })] },
            uploads: [new ApiError(401, 'UNAUTHORIZED', 'x')],
        });
        const api: AdminApi = { ...fake.api, me: async () => 'a@example.com', logout: vi.fn() };
        render(<App api={api} syncDeps={{ ...fake.deps, api }} />);
        await userEvent.click(await screen.findByRole('button', { name: '同步媒體資料夾' }));
        expect(await screen.findByRole('link', { name: '以 Google 登入' })).toBeInTheDocument();
        expect(screen.getByText('登入已過期，請重新登入。')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should sign out and offer the sign-in link again', async () => {
        const { logout } = setup(async () => 'admin@example.com');
        await userEvent.click(await screen.findByRole('button', { name: '登出' }));
        expect(logout).toHaveBeenCalledOnce();
        expect(await screen.findByRole('link', { name: '以 Google 登入' })).toBeInTheDocument();
    });

    it('should say when signing out fails', async () => {
        const fake = fakeDeps({ overview: overviewOf([]) });
        const logout = vi.fn(() => Promise.reject(new ApiError(403, 'FORBIDDEN_ORIGIN', 'x')));
        const api: AdminApi = { ...fake.api, me: async () => 'a@example.com', logout };
        render(<App api={api} syncDeps={{ ...fake.deps, api }} />);
        await userEvent.click(await screen.findByRole('button', { name: '登出' }));
        await waitFor(() =>
            expect(screen.getByText('登出失敗（FORBIDDEN_ORIGIN）。')).toBeInTheDocument(),
        );
    });
});
