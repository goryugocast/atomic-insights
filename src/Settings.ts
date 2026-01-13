import { App, PluginSettingTab, Setting } from 'obsidian';
import GraphAnalysisPlugin from './main';

export interface GraphAnalysisSettings {
    excludedFolders: string;
}

export const DEFAULT_SETTINGS: GraphAnalysisSettings = {
    excludedFolders: '',
};

export class GraphAnalysisSettingTab extends PluginSettingTab {
    plugin: GraphAnalysisPlugin;

    constructor(app: App, plugin: GraphAnalysisPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Graph Analysis (Adamic Adar) Settings' });

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
