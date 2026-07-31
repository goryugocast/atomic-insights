import { MarkdownView, WorkspaceLeaf, TFile, debounce } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { FooterRegistry } from './FooterRegistry';
import { RelatedNotesRenderer } from './RelatedNotesRenderer';

export class RelatedNotesView {
    plugin: AtomicInsightsPlugin;
    renderer: RelatedNotesRenderer;
    private readonly footers = new FooterRegistry<MarkdownView, HTMLElement>();

    debouncedRefresh: () => void;

    constructor(plugin: AtomicInsightsPlugin) {
        this.plugin = plugin;
        this.renderer = new RelatedNotesRenderer(plugin);

        this.debouncedRefresh = debounce(() => {
            this.refresh();
        }, 250, false);
    }

    update(leaf: WorkspaceLeaf): void {
        if (!this.plugin.settings.showRelatedNotes) {
            this.removeAll();
            return;
        }

        if (!(leaf.view instanceof MarkdownView)) {
            return;
        }

        const view = leaf.view;
        const file = view.file;

        if (!file) {
            return;
        }

        // If checking same file and container exists, maybe just return?
        // But we might want to re-run analysis if content changed? 
        // For now, let's re-render on active-leaf-change to be safe, 
        // or optimized later if too heavy.

        this.render(view, file);
    }

    refresh(): void {
        if (!this.plugin.settings.showRelatedNotes) {
            this.removeAll();
            return;
        }

        for (const [view] of this.footers.entries()) {
            if (!view.file) {
                this.footers.remove(view);
                continue;
            }
            this.render(view, view.file);
        }
    }

    removeAll(): void {
        this.footers.removeAll();
    }

    private render(view: MarkdownView, file: TFile) {
        const mountedFooter = this.footers.get(view);
        if (mountedFooter && !view.contentEl.contains(mountedFooter)) {
            this.footers.remove(view);
        }

        const footer = this.footers.getOrCreate(view, () =>
            view.contentEl.createDiv({ cls: 'atomic-insights-footer' })
        );

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
