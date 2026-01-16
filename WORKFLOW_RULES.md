# Atomic Insights Development Rules

このプロジェクト（Obsidian Plugin開発）における技術的知見とルールを記録します。

## 1. 自動更新機能の実装ルール

### ⚠️ Link Structure Updates dependent on Metadata
リンク構造（Backlinks, Outgoing links, Tagsなど）に依存する機能を「自動更新」させる場合、イベントトリガーには細心の注意を払うこと。

- **❌ DO NOT USE**: `workspace.on('editor-change')`
    - **理由**: このイベントは「文字が入力された瞬間」に発火する。この時点では、Obsidianの内部キャッシュ（metadataCache）はまだ更新されておらず、リンクの追加・削除（特にカット＆ペーストなど）が反映されていない「古いデータ」しか取得できない。
    - **結果**: ユーザーがリンクを削除しても、リストには残り続けるなどのバグが発生する。

- **✅ USE**: `metadataCache.on('changed')`
    - **理由**: Obsidianがファイル解析を終え、キャッシュデータ（`resolvedLinks`など）を更新したタイミングで発火する。
    - **実装**: キャッシュ更新は頻繁に起こる可能性があるため、必ず **Debounce（遅延実行）** を組み合わせる。
    
    ```typescript
    // Recommended Pattern
    this.registerEvent(
        this.app.metadataCache.on('changed', (_file) => {
            // Check if active view is relevant
            this.debouncedUpdate(); 
        })
    );
    ```

### 2. UI Consistency (Sidebars vs Footers)
- ObsidianのネイティブUI（サイドバー）とプラグイン独自のUI（フッターなど）は、可能な限りデザインとDOM構造を統一する。
- **Score Representation**: 数値の羅列ではなく、Visual Bar Graph（`width: %`）を使用する。
- **Interactions**: ホバープレビュー、Drag & Dropは基本的に両方でサポートする。
