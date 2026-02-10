import { MarkdownView, WorkspaceLeaf, TFile, debounce } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { RelatedNotesRenderer } from './RelatedNotesRenderer';

export class RelatedNotesView {
    plugin: AtomicInsightsPlugin;
    renderer: RelatedNotesRenderer;
    container: HTMLElement | null = null;
    currentFile: TFile | null = null;

    debouncedUpdate: (leaf: WorkspaceLeaf) => void;

    constructor(plugin: AtomicInsightsPlugin) {
        this.plugin = plugin;
        this.renderer = new RelatedNotesRenderer(plugin);

        this.debouncedUpdate = debounce((leaf: WorkspaceLeaf) => {
            this.update(leaf);
        }, 2000, true);
    }

    update(leaf: WorkspaceLeaf) {
        if (!this.plugin.settings.showRelatedNotes) {
            this.remove();
            return;
        }

        if (!(leaf.view instanceof MarkdownView)) {
            return;
        }

        const view = leaf.view as MarkdownView;
        const file = view.file;

        if (!file) {
            return;
        }

        // If checking same file and container exists, maybe just return?
        // But we might want to re-run analysis if content changed? 
        // For now, let's re-render on active-leaf-change to be safe, 
        // or optimized later if too heavy.

        this.currentFile = file;
        this.render(view, file);
    }

    remove() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    private render(view: MarkdownView, file: TFile) {
        // Determine the correct parent element based on view mode (Source/Live Preview vs Reading View)
        let parent: HTMLElement | null = null;
        const mode = view.getMode(); // 'source' or 'preview'

        if (mode === 'source') {
            // In Live Preview/Source mode, content is managed by CodeMirror.
            // The structure is usually .cm-scroller -> .cm-sizer -> .cm-content
            // To position at the bottom of the content properly, we should inject into .cm-sizer
            // Reference: native embedded-backlinks appears to be inside .cm-sizer
            parent = view.contentEl.querySelector('.cm-sizer');

            // Fallback to scroller if sizer is not found (though it should be there in CM6)
            if (!parent) {
                parent = view.contentEl.querySelector('.cm-scroller');
            }
        } else {
            // In Reading View (Preview), content is in .markdown-preview-sizer
            // Structure: .markdown-preview-view -> .markdown-preview-sizer
            parent = view.contentEl.querySelector('.markdown-preview-sizer');
        }

        // Fallback or safety check
        if (!parent) {
            // It might be possible DOM isn't fully ready or structure is different
            console.log('Atomic Insights: Could not find parent container for mode:', mode);
            return;
        }

        // Remove from old location if mode changed or just to be safe (unique DOM ID/Class validation)
        const existingFooter = view.contentEl.querySelector('.atomic-insights-footer');
        if (existingFooter && existingFooter.parentElement !== parent) {
            existingFooter.remove();
        }

        // Check if we already have our footer in the CORRECT parent
        let footer = parent.querySelector(':scope > .atomic-insights-footer') as HTMLElement;

        if (!footer) {
            footer = parent.createDiv({ cls: 'atomic-insights-footer' });
        }

        footer.empty();

        this.renderer.render({
            container: footer,
            sourcePath: file.path,
            viewContext: view,
            hoverSource: 'atomic-insights-footer',
            emptyText: 'No strongly related notes found.',
            onRerender: () => this.render(view, file)
        });
    }
}
