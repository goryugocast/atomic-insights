import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';
import { buildExclusionFilter } from './exclusions';

export class GraphScoreStrategy implements IScoringStrategy {
    app: App;
    settings: AtomicInsightsSettings;

    constructor(app: App, settings: AtomicInsightsSettings) {
        this.app = app;
        this.settings = settings;
    }

    calculate(sourcePath: string): ScoringResult[] {
        if (!this.settings.enableGraphScore) {
            return [];
        }

        const { resolvedLinks } = this.app.metadataCache;

        const isExcluded = buildExclusionFilter(this.settings);
        if (isExcluded(sourcePath)) {
            return [];
        }

        const neighbors: Record<string, Set<string>> = {};
        const degrees: Record<string, number> = {};

        const addEdge = (u: string, v: string) => {
            if (!neighbors[u]) neighbors[u] = new Set();
            if (!neighbors[v]) neighbors[v] = new Set();
            neighbors[u].add(v);
            neighbors[v].add(u);
        };

        // Populate Graph
        for (const source in resolvedLinks) {
            if (isExcluded(source)) continue;
            const targets = resolvedLinks[source];

            for (const target in targets) {
                if (isExcluded(target)) continue;
                addEdge(source, target);
            }
        }

        // Calculate degrees
        for (const node in neighbors) {
            degrees[node] = neighbors[node].size;
        }

        // Adamic Adar Algorithm
        const results: ScoringResult[] = [];
        let sourceNeighbors = neighbors[sourcePath];
        if (!sourceNeighbors) {
            // Build incoming links for sourcePath if it has no outbound links
            for (const source in resolvedLinks) {
                if (isExcluded(source)) continue;
                const targets = resolvedLinks[source];
                if (targets && targets[sourcePath] !== undefined) {
                    addEdge(source, sourcePath);
                }
            }
            sourceNeighbors = neighbors[sourcePath];
        }

        if (sourceNeighbors && sourceNeighbors.size > 0) {
            for (const targetNode in neighbors) {
                if (targetNode === sourcePath) continue;

                const targetNeighbors = neighbors[targetNode];
                let rawScore = 0;

                sourceNeighbors.forEach(w => {
                    if (targetNeighbors.has(w)) {
                        const degree = degrees[w];
                        if (degree > 1) {
                            rawScore += 1 / Math.log(degree);
                        }
                    }
                });

                if (rawScore > 0) {
                    results.push({
                        path: targetNode,
                        score: rawScore,
                        reason: 'graph'
                    });
                }
            }
        }

        return results;
    }
}
