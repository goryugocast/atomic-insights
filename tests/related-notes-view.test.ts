import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownView } from 'obsidian';
import { RelatedNotesView } from '../src/RelatedNotesView';
import { shouldReplaceNativeBacklinks } from '../src/nativeBacklinks';

vi.mock('obsidian', () => ({
    MarkdownView: class MarkdownView {},
    debounce: (callback: () => void) => callback,
}));

vi.mock('../src/RelatedNotesRenderer', () => ({
    RelatedNotesRenderer: class {
        render = vi.fn();
    },
}));

class FakeFooter {
    removed = false;
    remove() { this.removed = true; }
}

class FakeMarkdownView extends MarkdownView {
    file = { path: 'Notes/Same.md' };
    contentEl = {
        footers: [] as FakeFooter[],
        createDiv: () => {
            const footer = new FakeFooter();
            this.contentEl.footers.push(footer);
            return footer;
        },
        contains: (footer: FakeFooter) => this.contentEl.footers.includes(footer),
    };
}

function makeViewHarness(initiallyEnabled: boolean) {
    const left = new FakeMarkdownView();
    const right = new FakeMarkdownView();
    const leaves = [{ view: left }, { view: right }];
    const plugin = {
        settings: { showRelatedNotes: initiallyEnabled },
        app: { workspace: { iterateAllLeaves: (callback: (leaf: typeof leaves[number]) => void) => leaves.forEach(callback) } },
    };
    return { left, right, plugin, relatedView: new RelatedNotesView(plugin as never) };
}

describe('related note visibility transitions', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        [false, false, false],
        [false, true, false],
        [true, false, false],
        [true, true, true],
    ])('hides native backlinks only when Related Notes and replacement are enabled (%s, %s)', (show, replace, expected) => {
        expect(shouldReplaceNativeBacklinks(show, replace)).toBe(expected);
    });

    it('restores all open Markdown views immediately after OFF → ON, including an initial OFF setting', () => {
        const { left, right, plugin, relatedView } = makeViewHarness(false);

        relatedView.refresh();
        expect(left.contentEl.footers).toHaveLength(0);
        expect(right.contentEl.footers).toHaveLength(0);

        plugin.settings.showRelatedNotes = true;
        relatedView.refresh();
        expect(left.contentEl.footers).toHaveLength(1);
        expect(right.contentEl.footers).toHaveLength(1);

        relatedView.refresh();
        expect(left.contentEl.footers).toHaveLength(1);
        expect(right.contentEl.footers).toHaveLength(1);
    });

    it('removes every footer on OFF and recreates one per view on ON without a leaf switch', () => {
        const { left, right, plugin, relatedView } = makeViewHarness(true);

        relatedView.refresh();
        const originalLeft = left.contentEl.footers[0];
        const originalRight = right.contentEl.footers[0];
        expect(left.contentEl.footers).toHaveLength(1);
        expect(right.contentEl.footers).toHaveLength(1);

        plugin.settings.showRelatedNotes = false;
        relatedView.refresh();
        expect(originalLeft.removed).toBe(true);
        expect(originalRight.removed).toBe(true);

        plugin.settings.showRelatedNotes = true;
        relatedView.refresh();
        expect(left.contentEl.footers.filter(footer => !footer.removed)).toHaveLength(1);
        expect(right.contentEl.footers.filter(footer => !footer.removed)).toHaveLength(1);
    });
});
