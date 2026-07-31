import { describe, expect, it, vi } from 'vitest';
import { restoreNativeBacklinks, restoreNativeBacklinksInLeaves } from '../src/nativeBacklinks';

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

    it('restores every open markdown leaf that retains false', async () => {
        const stale = fakeLeaf({ type: 'markdown', state: { file: 'A.md', backlinks: false } });
        const alreadyVisible = fakeLeaf({ type: 'markdown', state: { file: 'B.md', backlinks: true } });

        await restoreNativeBacklinksInLeaves([stale, alreadyVisible], true);

        expect(stale.setViewState).toHaveBeenCalledWith({
            type: 'markdown', state: { file: 'A.md', backlinks: true }
        });
        expect(alreadyVisible.setViewState).not.toHaveBeenCalled();
    });
});

function fakeLeaf(viewState: { type: string; state: Record<string, unknown> }) {
    return {
        getViewState: () => viewState,
        setViewState: vi.fn().mockResolvedValue(undefined)
    };
}
