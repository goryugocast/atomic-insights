import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult, yieldToEventLoop } from './ScoringStrategy';
import { buildExclusionFilter } from './exclusions';

const CHUNK_SIZE = 2000;

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
        const isExcludedCandidate = (path: string) => path !== sourcePath && isExcluded(path);

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
            if (isExcludedCandidate(source)) continue;
            const targets = resolvedLinks[source];

            for (const target in targets) {
                if (isExcludedCandidate(target)) continue;
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
                if (isExcludedCandidate(source)) continue;
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
                if (isExcluded(targetNode)) continue;

                const targetNeighbors = neighbors[targetNode];
                let rawScore = 0;
                const commonNeighbors: string[] = [];

                sourceNeighbors.forEach(w => {
                    if (targetNeighbors.has(w)) {
                        commonNeighbors.push(w);
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
                        reason: 'graph',
                        details: {
                            commonNeighbors
                        }
                    });
                }
            }
        }

        return results;
    }

    async calculateAsync(sourcePath: string): Promise<ScoringResult[]> {
        if (!this.settings.enableGraphScore) {
            return [];
        }

        const { resolvedLinks } = this.app.metadataCache;

        const isExcluded = buildExclusionFilter(this.settings);
        const isExcludedCandidate = (path: string) => path !== sourcePath && isExcluded(path);

        const neighbors: Record<string, Set<string>> = {};
        const degrees: Record<string, number> = {};

        const addEdge = (u: string, v: string) => {
            if (!neighbors[u]) neighbors[u] = new Set();
            if (!neighbors[v]) neighbors[v] = new Set();
            neighbors[u].add(v);
            neighbors[v].add(u);
        };

        // Populate Graph — yield every CHUNK_SIZE sources
        const sources = Object.keys(resolvedLinks);
        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            if (isExcludedCandidate(source)) continue;
            const targets = resolvedLinks[source];

            for (const target in targets) {
                if (isExcludedCandidate(target)) continue;
                addEdge(source, target);
            }

            if (i > 0 && i % CHUNK_SIZE === 0) {
                await yieldToEventLoop();
            }
        }

        await yieldToEventLoop();

        // Calculate degrees
        for (const node in neighbors) {
            degrees[node] = neighbors[node].size;
        }

        // Adamic Adar Algorithm
        const results: ScoringResult[] = [];
        let sourceNeighbors = neighbors[sourcePath];
        if (!sourceNeighbors) {
            const fallbackSources = Object.keys(resolvedLinks);
            for (let i = 0; i < fallbackSources.length; i++) {
                const source = fallbackSources[i];
                if (isExcludedCandidate(source)) continue;
                const targets = resolvedLinks[source];
                if (targets && targets[sourcePath] !== undefined) {
                    addEdge(source, sourcePath);
                }
                if (i > 0 && i % CHUNK_SIZE === 0) {
                    await yieldToEventLoop();
                }
            }
            sourceNeighbors = neighbors[sourcePath];
        }

        await yieldToEventLoop();

        if (sourceNeighbors && sourceNeighbors.size > 0) {
            const allNodes = Object.keys(neighbors);
            for (let i = 0; i < allNodes.length; i++) {
                const targetNode = allNodes[i];
                if (targetNode === sourcePath) continue;
                if (isExcluded(targetNode)) continue;

                const targetNeighbors = neighbors[targetNode];
                let rawScore = 0;
                const commonNeighbors: string[] = [];

                sourceNeighbors.forEach(w => {
                    if (targetNeighbors.has(w)) {
                        commonNeighbors.push(w);
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
                        reason: 'graph',
                        details: {
                            commonNeighbors
                        }
                    });
                }

                if (i > 0 && i % CHUNK_SIZE === 0) {
                    await yieldToEventLoop();
                }
            }
        }

        return results;
    }
}
