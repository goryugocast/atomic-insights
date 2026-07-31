import type { ViewState } from 'obsidian';

/**
 * Restores a stale per-leaf "hide backlinks" override to the native default.
 * WorkspaceLeaf.setViewState merges state, so omitting `backlinks` cannot
 * remove an existing false value.
 */
export function restoreNativeBacklinks(viewState: ViewState, nativeBacklinksEnabled: boolean): ViewState | null {
    if (!nativeBacklinksEnabled || viewState.state?.backlinks !== false) return null;

    return { ...viewState, state: { ...viewState.state, backlinks: true } };
}
