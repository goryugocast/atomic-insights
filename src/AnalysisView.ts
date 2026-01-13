import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView, setIcon } from 'obsidian';
import GraphAnalysisPlugin from './main';
import { AdamicAdar, AnalysisResult } from './AdamicAdar';

export const VIEW_TYPE_GRAPH_ANALYSIS = 'graph-analysis-view';

export class AnalysisView extends ItemView {
    plugin: GraphAnalysisPlugin;
    adamicAdar: AdamicAdar;
    currentFilePath: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: GraphAnalysisPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.adamicAdar = new AdamicAdar(plugin.app, plugin.settings);
    }

    getViewType() {
        return VIEW_TYPE_GRAPH_ANALYSIS;
    }

    getDisplayText() {
        return 'Graph Analysis';
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
        const header = dataContainer.createEl('h4', { text: 'Adamic Adar', cls: 'graph-analysis-header' });

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

                    // Optional: Custom Drag Image? 
                    // Let's stick to default for simplicity first.
                }
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

            // Common Neighbors Tooltip (simple native title for now)
            item.title = `Common: ${res.commonNeighbors.length}\n${res.commonNeighbors.map(p => p.replace('.md', '')).join(', ')}`;
        });
    }

    async onClose() {
        // Nothing to cleanup
    }
}
