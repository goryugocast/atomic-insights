import { App, TFile } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';

function getDailyNotesFolder(app: App): string | null {
    const internalPlugins = (app as any).internalPlugins;
    const dailyNotes = internalPlugins?.plugins?.['daily-notes'];
    if (!dailyNotes?.enabled) return null;
    const folder = dailyNotes.instance?.options?.folder;
    if (typeof folder !== 'string') return null;
    return folder.replace(/^\/+/, '').replace(/\/+$/, '');
}

function isUnderFolder(path: string, folder: string): boolean {
    if (!folder) return true;
    return path === folder || path.startsWith(`${folder}/`);
}

export class EditTimeScoreStrategy implements IScoringStrategy {
    app: App;
    settings: AtomicInsightsSettings;

    constructor(app: App, settings: AtomicInsightsSettings) {
        this.app = app;
        this.settings = settings;
    }

    calculate(sourcePath: string): ScoringResult[] {
        if (!this.settings.enableEditTimeScore) {
            return [];
        }

        const dailyFolder = getDailyNotesFolder(this.app);
        if (dailyFolder === null) return [];
        if (!isUnderFolder(sourcePath, dailyFolder)) return [];

        const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(sourceFile instanceof TFile)) return [];
        const sourceMtime = sourceFile.stat.mtime;
        if (!sourceMtime) return [];

        const halfLifeHours = this.settings.editTimeDecayHours;
        if (!(halfLifeHours > 0)) return [];
        const lambda = Math.LN2 / (halfLifeHours * 60 * 60 * 1000);

        const results: ScoringResult[] = [];
        const files = this.app.vault.getMarkdownFiles();

        files.forEach((file) => {
            if (file.path === sourcePath) return;

            const targetMtime = file.stat.mtime;
            if (!targetMtime) return;

            const diff = Math.abs(targetMtime - sourceMtime);
            const score = Math.exp(-lambda * diff);

            if (score > 0.01) {
                results.push({
                    path: file.path,
                    score,
                    reason: 'edit-time'
                });
            }
        });

        return results;
    }
}
