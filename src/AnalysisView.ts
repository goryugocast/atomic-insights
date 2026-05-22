import { ItemView, WorkspaceLeaf } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { RelatedNotesRenderer } from './RelatedNotesRenderer';

export const VIEW_TYPE_ATOMIC_INSIGHTS = 'atomic-insights-view';

export class AtomicInsightsView extends ItemView {
    plugin: AtomicInsightsPlugin;
    renderer: RelatedNotesRenderer;

    constructor(leaf: WorkspaceLeaf, plugin: AtomicInsightsPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.renderer = new RelatedNotesRenderer(plugin);
    }

    getViewType() {
        return VIEW_TYPE_ATOMIC_INSIGHTS;
    }

    getDisplayText() {
        return 'Atomic Insights';
    }

    getIcon() {
        return 'atomic-insights';
    }

    async onOpen() {
        void this.update();
        // Register event for file switch
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file) {
                void this.update(file.path);
            }
        }));

        // Also listen to active-leaf-change to catch initial load or focus changes
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (leaf && leaf.view.getViewType() === VIEW_TYPE_ATOMIC_INSIGHTS) {
                return;
            }
            void this.update();
        }));
    }

    async update(filePath?: string) {
        // Wait for layout to be ready to ensure active file can be retrieved
        if (!this.app.workspace.layoutReady) {
            this.app.workspace.onLayoutReady(() => this.update(filePath));
            return;
        }

        if (!filePath) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                filePath = activeFile.path;
            } else {
                this.renderEmpty();
                return;
            }
        }

        this.render(filePath);
    }

    renderEmpty() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.createEl('div', { text: 'No active file selected.', cls: 'atomic-insights-empty' });
    }

    render(filePath: string) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const container = this.containerEl.children[1] as HTMLElement;
        this.renderer.render({
            container,
            sourcePath: filePath,
            viewContext: this,
            hoverSource: VIEW_TYPE_ATOMIC_INSIGHTS,
            emptyText: 'No results found.',
            onRerender: () => this.update(filePath)
        });
    }

    async onClose() {
        // Nothing to cleanup
    }
}
