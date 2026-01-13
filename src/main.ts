import { Plugin, WorkspaceLeaf, addIcon } from 'obsidian';
import { AtomicInsightsView, VIEW_TYPE_ATOMIC_INSIGHTS } from './AnalysisView';
import { DEFAULT_SETTINGS, AtomicInsightsSettings, AtomicInsightsSettingTab } from './Settings';

export default class AtomicInsightsPlugin extends Plugin {
    settings: AtomicInsightsSettings;

    async onload() {
        console.log('Loading Atomic Insights');

        await this.loadSettings();

        // Custom Icon: Atomic Network
        // A central core with 3 orbiting nodes connected by lines
        addIcon('atomic-insights', `
            <circle cx="50" cy="50" r="14" fill="currentColor" />
            <circle cx="20" cy="20" r="8" fill="currentColor" />
            <circle cx="80" cy="20" r="8" fill="currentColor" />
            <circle cx="50" cy="85" r="8" fill="currentColor" />
            <line x1="50" y1="50" x2="20" y2="20" stroke="currentColor" stroke-width="6" />
            <line x1="50" y1="50" x2="80" y2="20" stroke="currentColor" stroke-width="6" />
            <line x1="50" y1="50" x2="50" y2="85" stroke="currentColor" stroke-width="6" />
        `);

        this.registerView(
            VIEW_TYPE_ATOMIC_INSIGHTS,
            (leaf: WorkspaceLeaf) => new AtomicInsightsView(leaf, this)
        );

        // Ribbon Icon
        this.addRibbonIcon('atomic-insights', 'Atomic Insights', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-atomic-insights',
            name: 'Open Atomic Insights View',
            callback: () => {
                this.activateView();
            },
        });

        this.addSettingTab(new AtomicInsightsSettingTab(this.app, this));
    }

    onunload() {
        console.log('Unloading Atomic Insights');
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
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_ATOMIC_INSIGHTS);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: VIEW_TYPE_ATOMIC_INSIGHTS,
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }
}
