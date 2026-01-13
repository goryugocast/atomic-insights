import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView, setIcon } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { AdamicAdar, AnalysisResult } from './AdamicAdar';

export const VIEW_TYPE_ATOMIC_INSIGHTS = 'atomic-insights-view';

export class AtomicInsightsView extends ItemView {
    plugin: AtomicInsightsPlugin;
    adamicAdar: AdamicAdar;
    currentFilePath: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: AtomicInsightsPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.adamicAdar = new AdamicAdar(plugin.app, plugin.settings);
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
        this.update();
        // Register event for file switch
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file) {
                this.update(file.path);
            }
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

        this.currentFilePath = filePath;

        // Pass fresh settings in case they changed
        this.adamicAdar.settings = this.plugin.settings;

        const results = this.adamicAdar.calculate(filePath);
        this.render(results);
    }

    renderEmpty() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('div', { text: 'No active file selected.', cls: 'graph-analysis-empty' });
    }

    render(results: AnalysisResult[]) {
        const container = this.containerEl.children[1];
        container.empty();

        const dataContainer = container.createDiv({ cls: 'graph-analysis-container' });

        // Header
        const header = dataContainer.createEl('h4', { text: 'Atomic Insights', cls: 'graph-analysis-header' });

        // Refresh Button
        const refreshBtn = header.createEl('button', { cls: 'graph-analysis-refresh-btn' });
        setIcon(refreshBtn, "refresh-cw");
        refreshBtn.onclick = () => this.update(this.currentFilePath ?? undefined);

        if (results.length === 0) {
            dataContainer.createDiv({ text: 'No results found.', cls: 'graph-analysis-no-results' });
            return;
        }

        const list = dataContainer.createEl('div', { cls: 'graph-analysis-list' });

        results.slice(0, 50).forEach(res => { // Limit to 50 for performance
            const item = list.createDiv({ cls: 'graph-analysis-item' });
            item.setAttribute('draggable', 'true');

            // Click to open
            item.addEventListener('click', (e) => {
                // Command/Ctrl click for new tab handled by standard logic if we use openLinkText?
                // Actually openLinkText behavior with modifiers is a bit manual, let's try standard.
                const newLeaf = e.metaKey || e.ctrlKey;
                this.app.workspace.openLinkText(res.path, this.currentFilePath ?? '', newLeaf);
            });

            // Drag & Drop
            item.addEventListener('dragstart', (e) => {
                if (e.dataTransfer) {
                    // Create wikilink
                    const linkText = `[[${res.path.replace('.md', '')}]]`;
                    e.dataTransfer.setData('text/plain', linkText);
                    e.dataTransfer.effectAllowed = 'copy';
                }
            });

            // Hover Preview
            item.addEventListener('mouseover', (event) => {
                this.app.workspace.trigger('hover-link', {
                    event,
                    source: VIEW_TYPE_ATOMIC_INSIGHTS,
                    hoverParent: this,
                    targetEl: item,
                    linktext: res.path,
                    sourcePath: this.currentFilePath ?? ''
                });
            });

            // Visuals
            const scorePercent = Math.min(100, Math.round(res.score * 10)); // Arbitrary scale for visibility

            // Name
            const nameEl = item.createDiv({ cls: 'graph-analysis-item-name' });
            nameEl.innerText = res.path.replace('.md', '');

            // Score Bar
            const barContainer = item.createDiv({ cls: 'graph-analysis-item-bar-container' });
            const bar = barContainer.createDiv({ cls: 'graph-analysis-item-bar' });
            bar.style.width = `${scorePercent}%`;
            bar.title = `Score: ${res.score.toFixed(2)}`;

            // Common Neighbors Tooltip (Removed to avoid conflict with hover preview)
            // item.title = ...
        });
    }

    async onClose() {
        // Nothing to cleanup
    }
}
