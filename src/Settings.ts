import { AbstractInputSuggest, App, PluginSettingTab, SearchComponent, Setting, TFolder, normalizePath, setIcon } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { normalizeFolderRule, parseExcludedFolders } from './scoring/exclusions';

export interface AtomicInsightsSettings {
    excludedFolders: string;
    showFolderNames: boolean;
    showRelatedNotes: boolean;
    replaceNativeBacklinks: boolean;
    showBacklinks: boolean;
    showOutgoingLinks: boolean;
    showContext: boolean;

    // Scoring Algorithms
    enableGraphScore: boolean;
    weightGraph: number;

    enableMetadataScore: boolean;
    metadataKeys: string;
    enableEmojiScore: boolean;
    weightEmoji: number;
    enableYamlScore: boolean;
    weightYaml: number;

    enableTimeScore: boolean;
    weightTime: number;
    timeDecayDays: number;

    enableEditTimeScore: boolean;
    weightEditTime: number;
    editTimeDecayHours: number;

    weightOther: number;
}

export const DEFAULT_SETTINGS: AtomicInsightsSettings = {
    excludedFolders: '',
    showFolderNames: false,
    showRelatedNotes: true,
    replaceNativeBacklinks: false,
    showBacklinks: true,
    showOutgoingLinks: true,
    showContext: false,

    // Scoring Algorithms Defaults
    enableGraphScore: true,
    weightGraph: 1.0,

    enableMetadataScore: true,
    metadataKeys: 'project, tags',
    enableEmojiScore: true,
    weightEmoji: 1.0,
    enableYamlScore: true,
    weightYaml: 1.0,

    enableTimeScore: true,
    weightTime: 1.0,
    timeDecayDays: 28,

    enableEditTimeScore: true,
    weightEditTime: 1.0,
    editTimeDecayHours: 24,

    weightOther: 1.0,
};

class FolderPathSuggest extends AbstractInputSuggest<TFolder> {
    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
    }

    protected getSuggestions(query: string): TFolder[] {
        const normalizedQuery = normalizeFolderRule(query).toLowerCase();
        const folders = this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder)
            .filter((folder) => folder.path.length > 0)
            .sort((a, b) => a.path.localeCompare(b.path, 'ja'));

        if (!normalizedQuery) {
            return folders.slice(0, 100);
        }

        return folders
            .filter((folder) => folder.path.toLowerCase().includes(normalizedQuery))
            .slice(0, 100);
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.setText(folder.path);
    }

    selectSuggestion(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
        this.setValue(folder.path);
    }

    getFirstSuggestion(query: string): TFolder | null {
        const suggestions = this.getSuggestions(query);
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            return null;
        }
        return suggestions[0];
    }
}

export class AtomicInsightsSettingTab extends PluginSettingTab {
    plugin: AtomicInsightsPlugin;

    constructor(app: App, plugin: AtomicInsightsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private resolveCommittedFolderPath(query: string, folderSuggest: FolderPathSuggest): string | null {
        const normalized = normalizePath(normalizeFolderRule(query));
        if (!normalized) {
            return null;
        }

        const exact = this.app.vault.getFolderByPath(normalized);
        if (exact) {
            return exact.path;
        }

        const first = folderSuggest.getFirstSuggestion(query);
        if (!first) {
            return null;
        }

        const lowerQuery = normalized.toLowerCase();
        if (!first.path.toLowerCase().startsWith(lowerQuery)) {
            return null;
        }

        return first.path;
    }

    private async saveExcludedFolders(folders: string[]): Promise<void> {
        this.plugin.settings.excludedFolders = parseExcludedFolders(folders.join('\n')).join('\n');
        await this.plugin.saveSettings();
    }

    private renderExcludedFolderRow(containerEl: HTMLElement, value: string, options: {
        placeholder: string;
        onCommit: (resolvedPath: string) => Promise<void>;
        onRemove?: () => Promise<void>;
        addMode?: boolean;
    }): void {
        let folderDraft = value;

        const rowEl = containerEl.createDiv({ cls: 'atomic-insights-excluded-folder-row' });
        const inputWrapEl = rowEl.createDiv({ cls: 'atomic-insights-excluded-folder-input-wrap' });
        const search = new SearchComponent(inputWrapEl);
        search.setPlaceholder(options.placeholder).setValue(folderDraft);

        const folderSuggest = new FolderPathSuggest(this.app, search.inputEl);
        const commitDraft = async (fallbackValue?: string) => {
            const currentValue = fallbackValue ?? folderDraft;
            const resolved = this.resolveCommittedFolderPath(currentValue, folderSuggest);
            if (!resolved) {
                if (!options.addMode) {
                    search.setValue(value);
                    folderDraft = value;
                }
                return;
            }

            folderDraft = resolved;
            search.setValue(resolved);
            await options.onCommit(resolved);
        };

        folderSuggest.onSelect((folder) => {
            folderDraft = folder.path;
            search.setValue(folder.path);
            void commitDraft(folder.path);
        });

        search.onChange((nextValue) => {
            folderDraft = nextValue;
        });

        search.inputEl.addEventListener('keydown', (ev) => {
            if (ev.isComposing || ev.key !== 'Enter') return;
            ev.preventDefault();
            folderSuggest.close();
            void commitDraft();
        });

        search.inputEl.addEventListener('blur', () => {
            void commitDraft();
        });

        if (options.onRemove) {
            const removeButton = rowEl.createEl('button', {
                cls: 'clickable-icon atomic-insights-excluded-folder-row-action',
                attr: { 'aria-label': `Remove ${value}` }
            });
            setIcon(removeButton, 'trash');
            removeButton.addEventListener('click', () => {
                void options.onRemove?.();
            });
        } else {
            const addButton = rowEl.createEl('button', {
                cls: 'clickable-icon atomic-insights-excluded-folder-row-action',
                attr: { 'aria-label': 'Add excluded folder' }
            });
            setIcon(addButton, 'plus');
            addButton.addEventListener('click', () => {
                void commitDraft();
            });
        }
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Atomic Insights Settings' });

        // --- General Settings ---
        new Setting(containerEl)
            .setName('Show Related Notes')
            .setDesc('Show related notes at the bottom of the current note.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showRelatedNotes)
                .onChange(async (value) => {
                    this.plugin.settings.showRelatedNotes = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Replace native backlinks')
            .setDesc('Hide the native Obsidian backlinks view and reset editor padding.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.replaceNativeBacklinks)
                .onChange(async (value) => {
                    this.plugin.settings.replaceNativeBacklinks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Backlinks')
            .setDesc('Include directly linked notes (Backlinks) in the matching results.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showBacklinks)
                .onChange(async (value) => {
                    this.plugin.settings.showBacklinks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Outgoing Links')
            .setDesc('Include directly linked notes (Outgoing) in the matching results.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showOutgoingLinks)
                .onChange(async (value) => {
                    this.plugin.settings.showOutgoingLinks = value;
                    await this.plugin.saveSettings();
                }));

        // --- Scoring Algorithms ---
        containerEl.createEl('h3', { text: 'Scoring Algorithms (Weighted Hybrid)' });
        containerEl.createEl('p', { text: 'Atomic Insights uses Graph and non-Graph signals. You can adjust Graph vs Other, then tune Other internally.', cls: 'setting-item-description' });

        // 1. Graph Topology
        containerEl.createEl('h4', { text: '1. Graph Topology (Link Structure)' });
        const graphScoreSetting = new Setting(containerEl)
            .setName('Adamic Adar Score')
            .setDesc('Score based on shared connections. Highly weighted for "structurally" related notes.')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable Graph Scoring')
                .setValue(this.plugin.settings.enableGraphScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableGraphScore = value;
                    await this.plugin.saveSettings();
                }))
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightGraph)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightGraph = value;
                    await this.plugin.saveSettings();
                }));
        graphScoreSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');

        const excludedFolders = new Setting(containerEl)
            .setName('Excluded Folders (Graph Only)')
            .setDesc('Leading "/" is ignored. Applied only to Graph (Adamic Adar) calculation.');
        excludedFolders.settingEl.style.borderTop = 'none';
        excludedFolders.settingEl.style.paddingTop = '0';
        excludedFolders.settingEl.style.paddingBottom = '10px';
        excludedFolders.settingEl.addClass('atomic-insights-setting--excluded-folders');

        const currentExcludedFolders = parseExcludedFolders(this.plugin.settings.excludedFolders);
        const excludedFoldersGroup = excludedFolders.controlEl.createDiv({ cls: 'atomic-insights-excluded-folder-group' });
        const excludedFoldersList = excludedFoldersGroup.createDiv({ cls: 'atomic-insights-excluded-folder-settings-list' });
        if (currentExcludedFolders.length === 0) {
            excludedFoldersList.createDiv({
                cls: 'atomic-insights-excluded-folder-empty',
                text: 'No folders excluded.'
            });
        } else {
            currentExcludedFolders.forEach((folder, index) => {
                this.renderExcludedFolderRow(excludedFoldersList, folder, {
                    placeholder: 'notes/daily',
                    onCommit: async (resolvedPath) => {
                        const updated = [...currentExcludedFolders];
                        updated[index] = resolvedPath;
                        await this.saveExcludedFolders(updated);
                        this.display();
                    },
                    onRemove: async () => {
                        const updated = currentExcludedFolders.filter((_, folderIndex) => folderIndex !== index);
                        await this.saveExcludedFolders(updated);
                        this.display();
                    }
                });
            });
        }

        const newFolderRowWrap = excludedFoldersGroup.createDiv({ cls: 'atomic-insights-excluded-folder-new-row' });
        this.renderExcludedFolderRow(newFolderRowWrap, '', {
            placeholder: 'Search folders...',
            addMode: true,
            onCommit: async (resolvedPath) => {
                await this.saveExcludedFolders([...currentExcludedFolders, resolvedPath]);
                this.display();
            }
        });

        // Overall weight for non-graph signals
        const otherWeightSetting = new Setting(containerEl)
            .setName('Other (Non-Graph) Weight')
            .setDesc('Overall impact of non-graph signals (Emoji, YAML, Time) relative to Graph.')
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightOther)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightOther = value;
                    await this.plugin.saveSettings();
                }));
        otherWeightSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');

        // 2. Metadata Context
        containerEl.createEl('h4', { text: '2. Metadata Context (Virtual Nodes)' });
        new Setting(containerEl)
            .setName('Metadata Score')
            .setDesc('Score based on shared Frontmatter (YAML) and Emojis. These are part of "Other" signals.')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable Metadata Scoring')
                .setValue(this.plugin.settings.enableMetadataScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableMetadataScore = value;
                    await this.plugin.saveSettings();
                }));

        const emojiSetting = new Setting(containerEl)
            .setName('Emoji Score (Filename)')
            .setDesc('Score based on shared emoji in filenames. Relative weight inside "Other".')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable Emoji Scoring')
                .setValue(this.plugin.settings.enableEmojiScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableEmojiScore = value;
                    await this.plugin.saveSettings();
                }))
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightEmoji)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightEmoji = value;
                    await this.plugin.saveSettings();
                }));
        emojiSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');
        emojiSetting.settingEl.style.borderTop = 'none';
        emojiSetting.settingEl.style.paddingTop = '0';
        emojiSetting.settingEl.style.paddingBottom = '12px';

        const yamlSetting = new Setting(containerEl)
            .setName('YAML Score (Frontmatter)')
            .setDesc('Score based on shared YAML keys/values. Relative weight inside "Other".')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable YAML Scoring')
                .setValue(this.plugin.settings.enableYamlScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableYamlScore = value;
                    await this.plugin.saveSettings();
                }))
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightYaml)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightYaml = value;
                    await this.plugin.saveSettings();
                }));
        yamlSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');
        yamlSetting.settingEl.style.borderTop = 'none';
        yamlSetting.settingEl.style.paddingTop = '0';
        yamlSetting.settingEl.style.paddingBottom = '12px';

        const metaDetails = new Setting(containerEl)
            .setName('Target Metadata Keys')
            .setDesc('Comma-separated list of YAML keys to treat as Virtual Nodes.')
            .addTextArea(text => text
                .setPlaceholder('project, tags')
                .setValue(this.plugin.settings.metadataKeys)
                .onChange(async (value) => {
                    this.plugin.settings.metadataKeys = value;
                    await this.plugin.saveSettings();
                }));
        metaDetails.settingEl.style.borderTop = 'none';
        metaDetails.settingEl.style.paddingTop = '0';
        metaDetails.settingEl.style.paddingBottom = '18px'; // Add some space after block

        // 3. Temporal Context
        containerEl.createEl('h4', { text: '3. Temporal Context (Time Decay)' });
        const timeScoreSetting = new Setting(containerEl)
            .setName('Time Decay Score')
            .setDesc('Score based on date proximity (from filename). Relative weight inside "Other".')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable Time Scoring')
                .setValue(this.plugin.settings.enableTimeScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableTimeScore = value;
                    await this.plugin.saveSettings();
                }))
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightTime)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightTime = value;
                    await this.plugin.saveSettings();
                }));
        timeScoreSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');

        const timeDetails = new Setting(containerEl)
            .setName('Time Window (Half-life)')
            .setDesc('Days until the score decays to half. Default: 28 days (Monthly cycle).')
            .addText(text => text
                .setPlaceholder('28')
                .setValue(String(this.plugin.settings.timeDecayDays))
                .onChange(async (value) => {
                    const days = parseInt(value);
                    if (!isNaN(days) && days > 0) {
                        this.plugin.settings.timeDecayDays = days;
                        await this.plugin.saveSettings();
                    }
                }));
        timeDetails.settingEl.style.borderTop = 'none';
        timeDetails.settingEl.style.paddingTop = '0';
        timeDetails.settingEl.style.paddingBottom = '18px';

        // 4. Edit Time Co-occurrence (Daily-only)
        containerEl.createEl('h4', { text: '4. Edit Time Co-occurrence (Daily notes only)' });
        const editTimeScoreSetting = new Setting(containerEl)
            .setName('Edit Time Score')
            .setDesc('When viewing a daily note, surface other notes whose mtime is close to the daily note\'s mtime. Daily folder is detected from Obsidian\'s Daily Notes core plugin.')
            .addToggle(toggle => toggle
                .setTooltip('Enable/Disable Edit Time Scoring')
                .setValue(this.plugin.settings.enableEditTimeScore)
                .onChange(async (value) => {
                    this.plugin.settings.enableEditTimeScore = value;
                    await this.plugin.saveSettings();
                }))
            .addSlider(slider => slider
                .setLimits(0.1, 3.0, 0.1)
                .setValue(this.plugin.settings.weightEditTime)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.weightEditTime = value;
                    await this.plugin.saveSettings();
                }));
        editTimeScoreSetting.settingEl.addClass('atomic-insights-setting--stack-mobile');

        const editTimeDetails = new Setting(containerEl)
            .setName('Edit Time Window (Half-life)')
            .setDesc('Hours until the score decays to half. Default: 24 hours. At 24h=0.5, 48h=0.25, 72h≈0.13.')
            .addText(text => text
                .setPlaceholder('24')
                .setValue(String(this.plugin.settings.editTimeDecayHours))
                .onChange(async (value) => {
                    const hours = parseInt(value);
                    if (!isNaN(hours) && hours > 0) {
                        this.plugin.settings.editTimeDecayHours = hours;
                        await this.plugin.saveSettings();
                    }
                }));
        editTimeDetails.settingEl.style.borderTop = 'none';
        editTimeDetails.settingEl.style.paddingTop = '0';
        editTimeDetails.settingEl.style.paddingBottom = '18px';
    }
}
