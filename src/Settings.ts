import { App, PluginSettingTab, Setting } from 'obsidian';
import AtomicInsightsPlugin from './main';

export interface AtomicInsightsSettings {
    excludedFolders: string;
    showFolderNames: boolean;
}

export const DEFAULT_SETTINGS: AtomicInsightsSettings = {
    excludedFolders: '',
    showFolderNames: false,
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
            .setName('Show Folder Names')
            .setDesc('Reset the view to apply changes immediately.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFolderNames)
                .onChange(async (value) => {
                    this.plugin.settings.showFolderNames = value;
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
