import { App, TFile } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';
import { IScoringStrategy, ScoringResult } from './ScoringStrategy';
import { buildExclusionFilter } from './exclusions';

export class MetadataScoreStrategy implements IScoringStrategy {
    app: App;
    settings: AtomicInsightsSettings;

    constructor(app: App, settings: AtomicInsightsSettings) {
        this.app = app;
        this.settings = settings;
    }

    calculate(sourcePath: string): ScoringResult[] {
        if (!this.settings.enableMetadataScore) {
            return [];
        }

        const enableEmoji = this.settings.enableEmojiScore;
        const enableYaml = this.settings.enableYamlScore;
        const isExcluded = buildExclusionFilter(this.settings);
        if (isExcluded(sourcePath)) {
            return [];
        }
        const targetKeys = this.settings.metadataKeys
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        // Map: VirtualNodeKey -> Set of FilePaths that have this metadata
        // VirtualNodeKey example: "emoji:🔥", "yaml:project:ks"
        const virtualNodes: Record<string, Set<string>> = {};

        // Helper to add connection
        const addConnection = (vNode: string, filePath: string) => {
            if (!virtualNodes[vNode]) {
                virtualNodes[vNode] = new Set();
            }
            virtualNodes[vNode].add(filePath);
        };

        const files = this.app.vault.getMarkdownFiles();

        // 1. Build Virtual Graph
        files.forEach((file: TFile) => {
            if (isExcluded(file.path)) return;
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return;

            // A. Emoji from Filename
            // Simple regex for emoji? Or just non-ascii?
            // User example: ks.YYMMDD_🌱TITLE.md
            // Let's look for specific unicode ranges or use a library. 
            // For now, simple approach: extract non-ascii characters that are likely emojis.
            // Or simpler: User said "files from filename (e.g. 🥁, 📚)".
            if (enableEmoji) {
                const match = file.basename.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
                if (match) {
                    const emoji = match[0];
                    addConnection(`emoji:${emoji}`, file.path);
                }
            }

            // B. YAML Keys
            if (enableYaml && cache.frontmatter) {
                targetKeys.forEach(key => {
                    const value = cache.frontmatter?.[key];
                    if (value) {
                        // Handle array or single value
                        if (Array.isArray(value)) {
                            value.forEach(v => addConnection(`yaml:${key}:${v}`, file.path));
                        } else {
                            addConnection(`yaml:${key}:${value}`, file.path);
                        }
                    }
                });
            }
        });

        // 2. Calculate Frequencies (Degrees of Virtual Nodes)
        const vNodeDegrees: Record<string, number> = {};
        for (const vNode in virtualNodes) {
            vNodeDegrees[vNode] = virtualNodes[vNode].size;
        }

        // 3. Adamic Adar on Virtual Nodes
        const sourceVNodes: string[] = [];
        // Find which vNodes the source has
        for (const vNode in virtualNodes) {
            if (virtualNodes[vNode].has(sourcePath)) {
                sourceVNodes.push(vNode);
            }
        }

        if (sourceVNodes.length === 0) {
            return [];
        }

        const resultsEmoji: Record<string, number> = {};
        const resultsYaml: Record<string, number> = {};

        sourceVNodes.forEach(vNode => {
            const degree = vNodeDegrees[vNode];
            if (degree <= 1) return; // Unique to self, no link

            const scoreContribution = 1 / Math.log(degree);

            // Add score to all neighbors in this virtual node
            virtualNodes[vNode].forEach(targetPath => {
                if (targetPath === sourcePath) return;

                const bucket = vNode.startsWith('emoji:') ? resultsEmoji : resultsYaml;
                if (!bucket[targetPath]) {
                    bucket[targetPath] = 0;
                }
                bucket[targetPath] += scoreContribution;
            });
        });

        const output: ScoringResult[] = [];

        Object.entries(resultsEmoji).forEach(([path, rawScore]) => {
            output.push({
                path,
                score: rawScore,
                reason: 'emoji'
            });
        });

        Object.entries(resultsYaml).forEach(([path, rawScore]) => {
            output.push({
                path,
                score: rawScore,
                reason: 'yaml'
            });
        });

        return output;
    }
}
