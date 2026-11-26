/*
 * 同步頁用到嘅管理 API（全部同源）：登入狀態、登出、API-033、API-034、API-050、API-017、API-010 統計。
 * 刻意冇 API-035（確認移除）：移除要管理員逐項剔選、確認先做（Functional Spec D73、D76），
 * 呢個暫用頁冇確認畫面，只喺記錄列出（設計好嘅掃描畫面 T-055 先加）
 */
import { ApiError, createClient, type Fetch } from './client';
import type {
    CoverResultBody,
    FolderSyncResult,
    SiteStats,
    SyncOverview,
    UploadedImage,
} from './types';

const HTTP_UNAUTHORIZED = 401;

export interface AdminApi {
    /** 已登入嘅管理員 email；未登入 = null */
    me: () => Promise<string | null>;
    logout: () => Promise<void>;
    syncOverview: () => Promise<SyncOverview>;
    syncFolder: (folder: string, from?: number) => Promise<FolderSyncResult>;
    uploadImage: (image: Blob) => Promise<UploadedImage>;
    putCover: (albumId: string, body: CoverResultBody) => Promise<unknown>;
    stats: () => Promise<SiteStats>;
}

const readMe = async (request: ReturnType<typeof createClient>['request']) => {
    try {
        return (await request<{ email: string }>('/api/me')).email;
    } catch (error) {
        if (error instanceof ApiError && error.status === HTTP_UNAUTHORIZED) return null;
        throw error;
    }
};

export const createAdminApi = (fetchImpl?: Fetch): AdminApi => {
    const { request } = createClient(fetchImpl);
    return {
        me: () => readMe(request),
        logout: async () => {
            await request('/auth/logout', { method: 'POST' });
        },
        syncOverview: () => request<SyncOverview>('/api/sync'),
        syncFolder: (folder, from) =>
            request<FolderSyncResult>(`/api/sync/folders/${encodeURIComponent(folder)}`, {
                method: 'POST',
                query: { from },
            }),
        uploadImage: (image) =>
            request<UploadedImage>('/api/assets', { method: 'PUT', body: image }),
        putCover: (albumId, body) =>
            request(`/api/albums/${encodeURIComponent(albumId)}/cover`, {
                method: 'PUT',
                json: body,
            }),
        stats: async () => (await request<{ stats: SiteStats }>('/api/albums')).stats,
    };
};
