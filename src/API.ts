import { MarkdownView } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { HybridScoringService } from './scoring/HybridScoringService';
import { ScoringResult } from './scoring/ScoringStrategy';

export interface RelatedNotesOptions {
    limit?: number;
}

export interface RelatedNotesSuccessResponse {
    status: 'success';
    source: string;
    timestamp: string;
    parameters: {
        limit: number;
        appliedWeights: {
            graph: number;
        };
    };
    results: Array<ScoringResult & { reasons?: string[] }>;
}

export interface RelatedNotesErrorResponse {
    status: 'error';
    message: string;
}

export type RelatedNotesResponse = RelatedNotesSuccessResponse | RelatedNotesErrorResponse;

export class AtomicInsightsAPI {
    private engine: HybridScoringService;

    constructor(private plugin: AtomicInsightsPlugin) {
        this.engine = new HybridScoringService(plugin.app, plugin.settings);
    }

    /**
     * 指定されたパスのノートに関連するノートの一覧をスコア順に取得する（非同期）
     * Uses calculateAsync() to yield to the event loop during heavy computation,
     * preventing CDP/CLI timeout issues.
     */
    async getRelatedNotes(path: string, options: RelatedNotesOptions = {}): Promise<RelatedNotesResponse> {
        try {
            const file = this.plugin.app.vault.getFileByPath(path);
            if (!file) {
                return {
                    status: "error",
                    message: `File not found: ${path}`
                };
            }

            const limit = options.limit ?? 20;
            const results = await this.engine.calculateAsync(path);

            const limitedResults = results.slice(0, limit);

            return {
                status: "success",
                source: path,
                timestamp: new Date().toISOString(),
                parameters: {
                    limit,
                    appliedWeights: {
                        graph: this.plugin.settings.weightGraph,
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
     * getRelatedNotes() の同期版。
     * Obsidian CLI の `eval` は setTimeout をまたぐ Promise を待てず空を返すため、
     * calculateAsync() を使う非同期版は CLI から結果を取り出せない。
     * CLI やスクリプトからはこの同期版を使う（非同期版は UI を止めないアプリ内描画用）。
     */
    getRelatedNotesSync(path: string, options: RelatedNotesOptions = {}): RelatedNotesResponse {
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
    async getActiveRelatedNotes(options: RelatedNotesOptions = {}): Promise<RelatedNotesResponse> {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) {
            return {
                status: "error",
                message: "No active markdown file found."
            };
        }
        return this.getRelatedNotes(activeView.file.path, options);
    }

    /**
     * getActiveRelatedNotes() の同期版（CLI/スクリプト向け）。
     */
    getActiveRelatedNotesSync(options: RelatedNotesOptions = {}): RelatedNotesResponse {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) {
            return {
                status: "error",
                message: "No active markdown file found."
            };
        }
        return this.getRelatedNotesSync(activeView.file.path, options);
    }
}
