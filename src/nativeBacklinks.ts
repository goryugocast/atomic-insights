import type { ViewState } from 'obsidian';

export type NativeBacklinksLeaf = {
    getViewState(): ViewState;
    setViewState(viewState: ViewState): Promise<void>;
};

/**
 * Restores a stale per-leaf "hide backlinks" override to the native default.
 * WorkspaceLeaf.setViewState merges state, so omitting `backlinks` cannot
 * remove an existing false value.
 */
export function restoreNativeBacklinks(viewState: ViewState, nativeBacklinksEnabled: boolean): ViewState | null {
    if (!nativeBacklinksEnabled || viewState.state?.backlinks !== false) return null;

    return { ...viewState, state: { ...viewState.state, backlinks: true } };
}

export async function restoreNativeBacklinksInLeaves(
    leaves: Iterable<NativeBacklinksLeaf>,
    nativeBacklinksEnabled: boolean
): Promise<void> {
    if (!nativeBacklinksEnabled) return;

    const updates: Promise<void>[] = [];
    for (const leaf of leaves) {
        const restoredState = restoreNativeBacklinks(leaf.getViewState(), nativeBacklinksEnabled);
        if (restoredState) updates.push(leaf.setViewState(restoredState));
    }
    await Promise.all(updates);
}
