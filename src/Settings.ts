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
}

export const DEFAULT_SETTINGS: AtomicInsightsSettings = {
    excludedFolders: '',
    showFolderNames: false,
    showRelatedNotes: true,
    replaceNativeBacklinks: false,
    showBacklinks: true,
    showOutgoingLinks: true,
    showContext: false,
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
