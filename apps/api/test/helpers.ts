/* test 共用：打 Worker */
import { env } from 'cloudflare:test';
import worker from '../src/index';

export const ORIGIN = env.WORKER_ORIGIN;

/** bindings：要換設定嘅 test 傳 { ...env, X: … } */
export const call = (path: string, init: RequestInit = {}, bindings = env): Promise<Response> =>
    Promise.resolve(worker.fetch(new Request(new URL(path, ORIGIN), init), bindings));
