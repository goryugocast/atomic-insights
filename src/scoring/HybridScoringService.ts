import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';
import { GraphScoreStrategy } from './GraphScoreStrategy';
import { MetadataScoreStrategy } from './MetadataScoreStrategy';
import { TimeScoreStrategy } from './TimeScoreStrategy';
import { computeOtherRatios } from './weights';

export class HybridScoringService {
    app: App;
    settings: AtomicInsightsSettings;
    strategies: IScoringStrategy[];

    constructor(app: App, settings: AtomicInsightsSettings) {
        this.app = app;
        this.settings = settings;
        this.strategies = [
            new GraphScoreStrategy(app, settings),
            new MetadataScoreStrategy(app, settings),
            new TimeScoreStrategy(app, settings)
        ];
    }

    public calculate(sourcePath: string): any[] {
        // Collect scores from all strategies
        const aggregatedScores: Record<string, number> = {};
        const aggregatedReasons: Record<string, Set<string>> = {};

        const otherRatios = computeOtherRatios(this.settings);

        const weightForReason = (reason?: string) => {
            if (reason === 'graph') {
                return this.settings.weightGraph;
            }
            if (otherRatios.total <= 0) {
                return 0;
            }
            if (reason === 'emoji') {
                return otherRatios.emoji;
            }
            if (reason === 'yaml') {
                return otherRatios.yaml;
            }
            if (reason === 'time') {
                return otherRatios.time;
            }
            return 0;
        };

        this.strategies.forEach(strategy => {
            const results = strategy.calculate(sourcePath);
            results.forEach(res => {
                const weight = weightForReason(res.reason);
                if (weight === 0) {
                    return;
                }
                const weightedScore = res.score * weight;
                if (!aggregatedScores[res.path]) {
                    aggregatedScores[res.path] = 0;
                    aggregatedReasons[res.path] = new Set();
                }
                aggregatedScores[res.path] += weightedScore;
                if (res.reason) {
                    aggregatedReasons[res.path].add(res.reason);
                }
            });
        });

        // Convert to array
        let finalResults = Object.entries(aggregatedScores).map(([path, score]) => ({
            path,
            score,
            commonNeighbors: [] as string[], // Legacy field, might need to populate if needed for UI?
            reasons: Array.from(aggregatedReasons[path] || [])
        }));

        // Include Direct Links (Backlinks/Outgoing) if enabled
        // Logic copied/adapted from legacy AdamicAdar to ensure basic links appear even if score is 0
        if (this.settings.showBacklinks || this.settings.showOutgoingLinks) {
            const { resolvedLinks } = this.app.metadataCache;
            const connectedNodes = new Set<string>();

            // Outgoing
            const targets = resolvedLinks[sourcePath];
            if (this.settings.showOutgoingLinks && targets) {
                Object.keys(targets).forEach(t => connectedNodes.add(t));
            }

            // Incoming
            if (this.settings.showBacklinks) {
                for (const potentialSource in resolvedLinks) {
                    if (resolvedLinks[potentialSource][sourcePath]) {
                        connectedNodes.add(potentialSource);
                    }
                }
            }

            // Add missing direct links with score 0 if not present
            connectedNodes.forEach(targetPath => {
                if (targetPath === sourcePath) return; // Self
                if (!aggregatedScores[targetPath]) {
                    finalResults.push({
                        path: targetPath,
                        score: 0,
                        commonNeighbors: [],
                        reasons: ['link']
                    });
                }
            });
        }

        // Sort
        return finalResults.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.path.localeCompare(a.path);
        });
    }
}
