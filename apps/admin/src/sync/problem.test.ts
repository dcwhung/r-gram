import { ApiError } from '../api/client';
import { CoverError } from '../covers/coverError';
import { problemCode } from './problem';

describe('problemCode', () => {
    it('should use the Worker error code', () => {
        expect(problemCode(new ApiError(409, 'STALE', 'x'))).toBe('STALE');
    });

    it('should add the field and reason of each detail', () => {
        const error = new ApiError(400, 'VALIDATION_ERROR', 'x', [
            { path: 'cover', reason: 'IMAGE_NOT_FOUND' },
            { path: 'thumb', reason: 'WRONG_SIZE' },
        ]);
        expect(problemCode(error)).toBe(
            'VALIDATION_ERROR (cover: IMAGE_NOT_FOUND, thumb: WRONG_SIZE)',
        );
    });

    it('should use the cover error code and detail', () => {
        expect(problemCode(new CoverError('COVER_DECODE_FAILED'))).toBe('COVER_DECODE_FAILED');
        expect(problemCode(new CoverError('COVER_FETCH_FAILED', 'NETWORK'))).toBe(
            'COVER_FETCH_FAILED (NETWORK)',
        );
    });

    it('should call anything else UNKNOWN', () => {
        expect(problemCode(new Error('boom'))).toBe('UNKNOWN');
        expect(problemCode('boom')).toBe('UNKNOWN');
    });
});
