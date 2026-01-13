import { Plugin, WorkspaceLeaf } from 'obsidian';
import { AnalysisView, VIEW_TYPE_GRAPH_ANALYSIS } from './AnalysisView';
import { DEFAULT_SETTINGS, GraphAnalysisSettings, GraphAnalysisSettingTab } from './Settings';

export default class GraphAnalysisPlugin extends Plugin {
    settings: GraphAnalysisSettings;

    async onload() {
        console.log('Loading Graph Analysis (Adamic Adar)');

        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_GRAPH_ANALYSIS,
            (leaf: WorkspaceLeaf) => new AnalysisView(leaf, this)
        );

        this.addCommand({
            id: 'show-graph-analysis-view',
            name: 'Open Graph Analysis View',
            callback: () => {
                this.activateView();
            },
        });

        this.addSettingTab(new GraphAnalysisSettingTab(this.app, this));
    }

    onunload() {
        console.log('Unloading Graph Analysis');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Trigger generic event or let view handle it?
        // For now, simpler is better. User might need to reopen/refresh view if settings change, 
        // or we can add a method to notify view later.
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: VIEW_TYPE_GRAPH_ANALYSIS,
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }
}
