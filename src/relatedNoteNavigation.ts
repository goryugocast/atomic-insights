import type { TFile, WorkspaceLeaf } from 'obsidian';

type NavigationEvent = Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey'>;

type NavigationApp = {
    vault: { getFileByPath(path: string): TFile | null };
    workspace: {
        getLeaf(type: 'tab'): WorkspaceLeaf;
        openLinkText(linktext: string, sourcePath: string): Promise<void>;
    };
};

export function shouldOpenRelatedNoteInNewTab(event: Partial<NavigationEvent>): boolean {
    return event.metaKey === true || event.ctrlKey === true || event.button === 1;
}

/** Opens a related note using the same gestures as Obsidian internal links. */
export async function openRelatedNote(
    app: NavigationApp,
    path: string,
    sourcePath: string,
    event: Partial<NavigationEvent>
): Promise<WorkspaceLeaf | null> {
    if (!shouldOpenRelatedNoteInNewTab(event)) {
        await app.workspace.openLinkText(path, sourcePath);
        return null;
    }

    const file = app.vault.getFileByPath(path);
    if (!file) return null;

    const leaf = app.workspace.getLeaf('tab');
    await leaf.openFile(file);
    return leaf;
}
