import { describe, expect, it } from 'vitest';
import { restoreNativeBacklinks } from '../src/nativeBacklinks';

describe('restoreNativeBacklinks', () => {
    it('restores a false per-leaf override when the native default is enabled', () => {
        const viewState = {
            type: 'markdown',
            state: { file: 'routine/Test.md', mode: 'source', backlinks: false },
            pinned: true
        };

        expect(restoreNativeBacklinks(viewState, true)).toEqual({
            type: 'markdown',
            state: { file: 'routine/Test.md', mode: 'source', backlinks: true },
            pinned: true
        });
    });

    it('does not rewrite a leaf that has no backlinks override', () => {
        const viewState = { type: 'markdown', state: { file: 'routine/Test.md', mode: 'source' } };

        expect(restoreNativeBacklinks(viewState, true)).toBeNull();
    });

    it('preserves an explicit true override', () => {
        const viewState = { type: 'markdown', state: { file: 'routine/Test.md', backlinks: true } };

        expect(restoreNativeBacklinks(viewState, true)).toBeNull();
    });

    it('does not override a false value when the native default is disabled', () => {
        const viewState = { type: 'markdown', state: { file: 'routine/Test.md', backlinks: false } };

        expect(restoreNativeBacklinks(viewState, false)).toBeNull();
    });
});
