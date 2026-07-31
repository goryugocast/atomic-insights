import { describe, expect, it, vi } from 'vitest';
import { openRelatedNote, shouldOpenRelatedNoteInNewTab } from '../src/relatedNoteNavigation';

describe('related note navigation', () => {
    it('opens a normal click in the current leaf', async () => {
        const app = createApp();

        await openRelatedNote(app, 'Notes/Target.md', 'Notes/Source.md', { button: 0 });

        expect(app.workspace.openLinkText).toHaveBeenCalledWith('Notes/Target.md', 'Notes/Source.md');
        expect(app.workspace.getLeaf).not.toHaveBeenCalled();
    });

    it.each([
        { metaKey: true, button: 0 },
        { ctrlKey: true, button: 0 },
        { button: 1 }
    ])('opens Cmd/Ctrl/middle click in a new tab', async (event) => {
        const app = createApp();

        await openRelatedNote(app, 'Notes/Target.md', 'Notes/Source.md', event);

        expect(app.workspace.getLeaf).toHaveBeenCalledWith('tab');
        expect(app.leaf.openFile).toHaveBeenCalledWith(app.file);
        expect(app.workspace.openLinkText).not.toHaveBeenCalled();
    });

    it('recognizes the standard new-tab gestures', () => {
        expect(shouldOpenRelatedNoteInNewTab({ button: 0, metaKey: true })).toBe(true);
        expect(shouldOpenRelatedNoteInNewTab({ button: 0, ctrlKey: true })).toBe(true);
        expect(shouldOpenRelatedNoteInNewTab({ button: 1 })).toBe(true);
        expect(shouldOpenRelatedNoteInNewTab({ button: 0 })).toBe(false);
    });
});

function createApp() {
    const file = { path: 'Notes/Target.md' };
    const leaf = { openFile: vi.fn().mockResolvedValue(undefined) };
    return {
        file,
        leaf,
        vault: { getFileByPath: vi.fn().mockReturnValue(file) },
        workspace: {
            getLeaf: vi.fn().mockReturnValue(leaf),
            openLinkText: vi.fn().mockResolvedValue(undefined)
        }
    };
}
