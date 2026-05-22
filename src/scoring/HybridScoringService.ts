import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';
import { GraphScoreStrategy } from './GraphScoreStrategy';
import { MetadataScoreStrategy } from './MetadataScoreStrategy';
import { TimeScoreStrategy } from './TimeScoreStrategy';
import { EditTimeScoreStrategy } from './EditTimeScoreStrategy';
import { computeOtherRatios, OtherWeightRatios } from './weights';

export interface AggregatedResult {
    path: string;
    score: number;
    reasons: string[];
    details: Record<string, unknown>;
}

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
            new TimeScoreStrategy(app, settings),
            new EditTimeScoreStrategy(app, settings)
        ];
    }

    private _weightForReason(reason: string | undefined, otherRatios: OtherWeightRatios): number {
        if (reason === 'graph') return this.settings.weightGraph;
        if (otherRatios.total <= 0) return 0;
        if (reason === 'emoji') return otherRatios.emoji;
        if (reason === 'yaml') return otherRatios.yaml;
        if (reason === 'time') return otherRatios.time;
        if (reason === 'edit-time') return otherRatios.editTime;
        return 0;
    }

    private _aggregate(
        results: ScoringResult[],
        otherRatios: OtherWeightRatios,
        aggregatedScores: Record<string, number>,
        aggregatedReasons: Record<string, Set<string>>,
        aggregatedDetails: Record<string, Record<string, unknown>>
    ): void {
        results.forEach(res => {
            const weight = this._weightForReason(res.reason, otherRatios);
            if (weight === 0) return;
            const weightedScore = res.score * weight;
            if (!aggregatedScores[res.path]) {
                aggregatedScores[res.path] = 0;
                aggregatedReasons[res.path] = new Set();
            }
            aggregatedScores[res.path] += weightedScore;
            if (res.reason) {
                aggregatedReasons[res.path].add(res.reason);
            }
            if (res.details) {
                if (!aggregatedDetails[res.path]) aggregatedDetails[res.path] = {};
                aggregatedDetails[res.path] = { ...aggregatedDetails[res.path], ...res.details };
            }
        });
    }

    public calculate(sourcePath: string): AggregatedResult[] {
        const aggregatedScores: Record<string, number> = {};
        const aggregatedReasons: Record<string, Set<string>> = {};
        const aggregatedDetails: Record<string, Record<string, unknown>> = {};
        const otherRatios = computeOtherRatios(this.settings);

        this.strategies.forEach(strategy => {
            const results = strategy.calculate(sourcePath);
            this._aggregate(results, otherRatios, aggregatedScores, aggregatedReasons, aggregatedDetails);
        });

        return this._finalize(sourcePath, aggregatedScores, aggregatedReasons, aggregatedDetails);
    }

    /**
     * Async version of calculate() that yields to the event loop during heavy computation.
     * Use this for CDP/CLI callers to prevent UI thread blocking.
     */
    public async calculateAsync(sourcePath: string): Promise<AggregatedResult[]> {
        const aggregatedScores: Record<string, number> = {};
        const aggregatedReasons: Record<string, Set<string>> = {};
        const aggregatedDetails: Record<string, Record<string, unknown>> = {};
        const otherRatios = computeOtherRatios(this.settings);

        for (const strategy of this.strategies) {
            const results = strategy.calculateAsync
                ? await strategy.calculateAsync(sourcePath)
                : strategy.calculate(sourcePath);
            this._aggregate(results, otherRatios, aggregatedScores, aggregatedReasons, aggregatedDetails);
        }

        return this._finalize(sourcePath, aggregatedScores, aggregatedReasons, aggregatedDetails);
    }

    private _finalize(
        sourcePath: string,
        aggregatedScores: Record<string, number>,
        aggregatedReasons: Record<string, Set<string>>,
        aggregatedDetails: Record<string, Record<string, unknown>>
    ): AggregatedResult[] {
        let finalResults = Object.entries(aggregatedScores).map(([path, score]) => ({
            path,
            score,
            reasons: Array.from(aggregatedReasons[path] || []),
            details: aggregatedDetails[path] || {}
        }));

        if (this.settings.showBacklinks || this.settings.showOutgoingLinks) {
            const { resolvedLinks } = this.app.metadataCache;
            const connectedNodes = new Set<string>();

            const targets = resolvedLinks[sourcePath];
            if (this.settings.showOutgoingLinks && targets) {
                Object.keys(targets).forEach(t => connectedNodes.add(t));
            }

            if (this.settings.showBacklinks) {
                for (const potentialSource in resolvedLinks) {
                    if (resolvedLinks[potentialSource][sourcePath]) {
                        connectedNodes.add(potentialSource);
                    }
                }
            }

            connectedNodes.forEach(targetPath => {
                if (targetPath === sourcePath) return;
                if (!aggregatedScores[targetPath]) {
                    finalResults.push({
                        path: targetPath,
                        score: 0,
                        reasons: ['link'],
                        details: {}
                    });
                }
            });
        }

        return finalResults.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.path.localeCompare(a.path);
        });
    }
}
