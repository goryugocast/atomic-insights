import { MarkdownView } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { HybridScoringService } from './scoring/HybridScoringService';

interface RelatedNotesOptions {
    limit?: number;
    includeContext?: boolean;
}

export class AtomicInsightsAPI {
    private engine: HybridScoringService;

    constructor(private plugin: AtomicInsightsPlugin) {
        this.engine = new HybridScoringService(plugin.app, plugin.settings);
    }

    /**
     * 指定されたパスのノートに関連するノートの一覧をスコア順に取得する（非同期）
     */
    async getRelatedNotes(path: string, options: RelatedNotesOptions = {}): Promise<any> {
        try {
            const file = this.plugin.app.vault.getFileByPath(path);
            if (!file) {
                return {
                    status: "error",
                    message: `File not found: ${path}`
                };
            }

            const limit = options.limit ?? 20;
            const results = this.engine.calculate(path);
            
            const limitedResults = results.slice(0, limit);

            return {
                status: "success",
                source: path,
                timestamp: new Date().toISOString(),
                parameters: {
                    limit,
                    appliedWeights: {
                        graph: this.plugin.settings.weightGraph,
                        // 他の重み付けも必要に応じて追加
                    }
                },
                results: limitedResults
            };
        } catch (error) {
            return {
                status: "error",
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 現在アクティブなノートの関連ノートを取得する（非同期、CLI/AI向けショートカット）
     */
    async getActiveRelatedNotes(options: RelatedNotesOptions = {}): Promise<any> {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) {
            return {
                status: "error",
                message: "No active markdown file found."
            };
        }
        return this.getRelatedNotes(activeView.file.path, options);
    }
}
