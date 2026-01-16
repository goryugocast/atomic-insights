import { App, TFile } from 'obsidian';
import { AtomicInsightsSettings } from './Settings';

export interface AnalysisResult {
    path: string;
    score: number;
    commonNeighbors: string[];
}

export class AdamicAdar {
    app: App;
    settings: AtomicInsightsSettings;

    constructor(app: App, settings: AtomicInsightsSettings) {
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

        const connectedNodes = new Set<string>(); // For direct link display (ignoring exclusion)

        // Populate Graph
        // We only care about resolved links for now as unresolved files don't have back-links easily tracked without full scan
        // iterating source files
        for (const source in resolvedLinks) {
            const targets = resolvedLinks[source];

            // Check for Direct Links (Backlinks/Outgoing) - IGNORING exclusion
            if (source === sourcePath) {
                for (const target in targets) {
                    connectedNodes.add(target);
                }
            }
            // Check for Incoming to Source
            if (targets[sourcePath] !== undefined) {
                connectedNodes.add(source);
            }

            // Now apply exclusion for Adamic Adar Graph
            if (isExcluded(source)) continue;

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
        // Note: sourceNeighbors might be undefined if sourcePath is excluded or has no valid neighbors in filtered graph.

        const results: AnalysisResult[] = [];

        // Only run AA if we have valid neighbors in the filtered graph
        if (sourceNeighbors) {
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
                        if (degree > 1) { // log(1) is 0, avoid division by zero if degree is 1
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
        }

        // 2.5 Include Direct Links (Backlinks/Outgoing) if enabled
        if (this.settings.showBacklinks || this.settings.showOutgoingLinks) {
            // Use connectedNodes which includes excluded folders
            connectedNodes.forEach(targetPath => {
                // Check if already in results
                if (results.some(r => r.path === targetPath)) return;

                // Check direction
                const outgoing = resolvedLinks[sourcePath]?.[targetPath] !== undefined;
                const incoming = resolvedLinks[targetPath]?.[sourcePath] !== undefined;

                let shouldInclude = false;
                if (outgoing && this.settings.showOutgoingLinks) shouldInclude = true;
                if (incoming && this.settings.showBacklinks) shouldInclude = true;

                if (shouldInclude) {
                    results.push({
                        path: targetPath,
                        score: 0, // Base score for direct links without shared neighbors
                        commonNeighbors: []
                    });
                }
            });
        }

        // 3. Sort
        return results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // Secondary sort: Alphabetical by Path Descending (Z-A)
            // User requested "Alphabet Descending" (スコア0は降順).
            return b.path.localeCompare(a.path);
        });
    }
}
