// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MEDIA_BASE } from './config';

const WRANGLER = fileURLToPath(new URL('../../../api/wrangler.toml', import.meta.url));

describe('spike media base', () => {
    it('should be the MEDIA_BASE of the Worker config (one source of truth for the bucket)', () => {
        const match = /^MEDIA_BASE\s*=\s*"([^"]+)"/m.exec(readFileSync(WRANGLER, 'utf8'));
        expect(match?.[1]).toBe(DEFAULT_MEDIA_BASE);
    });
});
