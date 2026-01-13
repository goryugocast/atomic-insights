import { App, TFile } from 'obsidian';
import { GraphAnalysisSettings } from './Settings';

export interface AnalysisResult {
    path: string;
    score: number;
    commonNeighbors: string[];
}

export class AdamicAdar {
    app: App;
    settings: GraphAnalysisSettings;

    constructor(app: App, settings: GraphAnalysisSettings) {
        this.app = app;
        this.settings = settings;
    }

    public calculate(sourcePath: string): AnalysisResult[] {
        const { resolvedLinks } = this.app.metadataCache;

        // 1. Build Graph & Filtering
        const exclusionList = this.settings.excludedFolders
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const isExcluded = (path: string) => {
            return exclusionList.some(folder => path.startsWith(folder));
        };

        if (isExcluded(sourcePath)) {
            // If source is excluded, maybe return empty or still calculate?
            // Let's calculate anyway for now, but filter results.
        }

        const neighbors: Record<string, Set<string>> = {};
        const degrees: Record<string, number> = {};

        // Helper to add edge
        const addEdge = (u: string, v: string) => {
            if (!neighbors[u]) neighbors[u] = new Set();
            if (!neighbors[v]) neighbors[v] = new Set();
            neighbors[u].add(v);
            neighbors[v].add(u);
        };

        // Populate Graph
        // We only care about resolved links for now as unresolved files don't have back-links easily tracked without full scan
        // iterating source files
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

        // 2. Algorithm
        const sourceNeighbors = neighbors[sourcePath];
        if (!sourceNeighbors) return [];

        const results: AnalysisResult[] = [];

        for (const targetNode in neighbors) {
            if (targetNode === sourcePath) continue;

            const targetNeighbors = neighbors[targetNode];
            let score = 0;
            const commonNodes: string[] = [];

            // Intersection
            sourceNeighbors.forEach(w => {
                if (targetNeighbors.has(w)) {
                    commonNodes.push(w);
                    const degree = degrees[w];
                    if (degree > 1) { // log(1) is 0, avoid division by zero if degree is 1 (though logic implies at least 2 if it connects two nodes)
                        score += 1 / Math.log(degree);
                    }
                }
            });

            if (score > 0) {
                results.push({
                    path: targetNode,
                    score: score,
                    commonNeighbors: commonNodes
                });
            }
        }

        // 3. Sort
        return results.sort((a, b) => b.score - a.score);
    }
}
