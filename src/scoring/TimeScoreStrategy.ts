import { App, TFile } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';
import { parseDateFromPath } from './timeParsing';

export class TimeScoreStrategy implements IScoringStrategy {
    app: App;
    settings: AtomicInsightsSettings;

    constructor(app: App, settings: AtomicInsightsSettings) {
        this.app = app;
        this.settings = settings;
    }

    calculate(sourcePath: string): ScoringResult[] {
        if (!this.settings.enableTimeScore) {
            return [];
        }

        const sourceDate = parseDateFromPath(sourcePath);
        if (!sourceDate) {
            return [];
        }

        const decayDays = this.settings.timeDecayDays;
        const lambda = Math.LN2 / decayDays; // Decay constant for half-life

        const results: ScoringResult[] = [];
        const files = this.app.vault.getMarkdownFiles();

        files.forEach((file) => {
            if (file.path === sourcePath) return;

            const targetDate = parseDateFromPath(file.path);
            if (!targetDate) return;

            // Calculate difference in days
            const diffTime = Math.abs(targetDate.getTime() - sourceDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Exponential Decay: N(t) = N0 * e^(-lambda * t)
            // Score = 1.0 * e^(-lambda * diffDays)
            // At diffDays = decayDays, Score should be 0.5
            const score = Math.exp(-lambda * diffDays);

            if (score > 0.01) { // Cutoff for negligible scores
                results.push({
                    path: file.path,
                    score: score,
                    reason: 'time'
                });
            }
        });

        return results;
    }

    // date parsing moved to timeParsing.ts for testability
}
