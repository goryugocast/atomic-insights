import { App, PluginSettingTab, Setting } from 'obsidian';
import AtomicInsightsPlugin from './main';

export interface AtomicInsightsSettings {
    excludedFolders: string;
}

export const DEFAULT_SETTINGS: AtomicInsightsSettings = {
    excludedFolders: '',
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
