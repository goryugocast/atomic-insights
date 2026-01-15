import { Plugin, WorkspaceLeaf, addIcon, MarkdownView } from 'obsidian';
import { AtomicInsightsView, VIEW_TYPE_ATOMIC_INSIGHTS } from './AnalysisView';
import { DEFAULT_SETTINGS, AtomicInsightsSettings, AtomicInsightsSettingTab } from './Settings';
import { RelatedNotesView } from './RelatedNotesView';

export default class AtomicInsightsPlugin extends Plugin {
    settings: AtomicInsightsSettings;
    relatedNotesView: RelatedNotesView;

    async onload() {
        console.log('Loading Atomic Insights');

        await this.loadSettings();

        this.relatedNotesView = new RelatedNotesView(this);

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

        // Listen for leaf changes to update the related notes footer
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf) this.relatedNotesView.update(leaf);
            })
        );

        // Initial check for active leaf
        this.app.workspace.onLayoutReady(() => {
            const activeLeaf = this.app.workspace.getMostRecentLeaf();
            if (activeLeaf) {
                this.relatedNotesView.update(activeLeaf);
            }
            this.updateBodyClass();
        });
    }

    onunload() {
        console.log('Unloading Atomic Insights');
        document.body.classList.remove('atomic-insights-replace-native');

        // Clean up footer from all leaves if necessary
        // Ideally we iterate leaves, but simply letting them be destroyed/removed by GC or manual navigation is okay 
        // if we are cautious. But strictly specific cleanup:
        this.app.workspace.iterateAllLeaves((leaf) => {
            // We can't easily access the specific DOM element without re-querying
            const view = leaf.view;
            if (view instanceof MarkdownView) {
                const footer = view.contentEl.querySelector('.atomic-insights-footer');
                if (footer) footer.remove();
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateBodyClass();

        // Refresh view for active leaf
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        if (activeLeaf) {
            this.relatedNotesView.update(activeLeaf);
        }
    }

    updateBodyClass() {
        if (this.settings.replaceNativeBacklinks) {
            document.body.classList.add('atomic-insights-replace-native');
        } else {
            document.body.classList.remove('atomic-insights-replace-native');
        }
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
