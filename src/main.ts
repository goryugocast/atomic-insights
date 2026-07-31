import { Plugin, WorkspaceLeaf, addIcon, MarkdownView } from 'obsidian';
import { AtomicInsightsView, VIEW_TYPE_ATOMIC_INSIGHTS } from './AnalysisView';
import { DEFAULT_SETTINGS, AtomicInsightsSettings, AtomicInsightsSettingTab } from './Settings';
import { RelatedNotesView } from './RelatedNotesView';
import { AtomicInsightsAPI } from './API';
import { restoreNativeBacklinksInLeaves } from './nativeBacklinks';

interface BacklinkCorePlugin {
    instance?: { options?: { backlinkInDocument?: boolean } };
}

interface AppWithInternalPlugins {
    internalPlugins?: { plugins?: Record<string, BacklinkCorePlugin> };
}

export default class AtomicInsightsPlugin extends Plugin {
    settings: AtomicInsightsSettings;
    relatedNotesView: RelatedNotesView;
    api: AtomicInsightsAPI;

    async onload() {
        console.log('Loading Atomic Insights');

        await this.loadSettings();

        this.api = new AtomicInsightsAPI(this);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AtomicInsights = this.api;
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
            void this.activateView();
        });

        this.addCommand({
            id: 'open-atomic-insights',
            name: 'Open Atomic Insights View',
            callback: () => {
                void this.activateView();
            },
        });

        this.addSettingTab(new AtomicInsightsSettingTab(this.app, this));

        // Listen for leaf changes to update the related notes footer
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf) this.relatedNotesView.update(leaf);
            })
        );

        // A graph change can affect every open note, not just the most recent leaf.
        this.registerEvent(
            this.app.metadataCache.on('changed', (_file) => {
                this.relatedNotesView.debouncedRefresh();
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

        this.relatedNotesView.removeAll();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateBodyClass();

        this.relatedNotesView.refresh();
    }

    /** Restore native backlinks for leaves that retain a stale false override. */
    async clearNativeBacklinkOverrides(): Promise<void> {
        const nativeBacklinksEnabled = (this.app as unknown as AppWithInternalPlugins)
            .internalPlugins?.plugins?.backlink?.instance?.options?.backlinkInDocument === true;
        if (!nativeBacklinksEnabled) return;

        const markdownLeaves: WorkspaceLeaf[] = [];

        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view instanceof MarkdownView) markdownLeaves.push(leaf);
        });

        try {
            await restoreNativeBacklinksInLeaves(markdownLeaves, nativeBacklinksEnabled);
        } catch (error) {
            console.error('Atomic Insights: Failed to restore native backlinks', error);
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
            await workspace.revealLeaf(leaf);
        }
    }
}
