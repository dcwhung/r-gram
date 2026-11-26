import packageJson from '../../package.json';
import { APP_VERSION } from './appVersion';

/** 版本號唯一來源係 apps/player/package.json，build 時由 vite.config.ts 注入（Functional Spec FR-009） */
describe('APP_VERSION', () => {
    it('should be the version in package.json', () => {
        expect(APP_VERSION).toBe(packageJson.version);
    });

    it('should be a semantic version', () => {
        expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
