import { App, PluginSettingTab, Setting } from 'obsidian';
import AtomicInsightsPlugin from './main';

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

    weightOther: 1.0,
};

export class AtomicInsightsSettingTab extends PluginSettingTab {
    plugin: AtomicInsightsPlugin;

    constructor(app: App, plugin: AtomicInsightsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
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
        new Setting(containerEl)
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

        // Overall weight for non-graph signals
        new Setting(containerEl)
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
        new Setting(containerEl)
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


        // --- Folder Settings ---
        containerEl.createEl('h3', { text: 'Exclusions' });
        new Setting(containerEl)
            .setName('Excluded Folders')
            .setDesc('One folder path per line. Notes in these folders will be ignored.')
            .addTextArea(text => text
                .setPlaceholder('Templates\nArchive')
                .setValue(this.plugin.settings.excludedFolders)
                .onChange(async (value) => {
                    this.plugin.settings.excludedFolders = value;
                    await this.plugin.saveSettings();
                }));
    }
}
