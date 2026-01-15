---
description: Obsidianプラグインのリリース手順
---
Obsidianプラグイン（Atomic Insightsなど）の新しいバージョンをリリースする際の標準手順です。

1. **バージョンの同期**
   - `package.json` の `version` を更新します。
   - `manifest.json` の `version` も同じ値に更新します。

2. **ビルドの確認**
   - `npm run build` を実行し、エラーなく完了することを確認します。

3. **コミットとタグ付け**
   - 変更をコミットします（例: `git commit -m "chore: release v0.2.x"`）。
   - ワークフローのトリガー条件（通常は `v*`）に合わせたタグを作成します。
     - 例: `git tag v0.2.4`

4. **GitHubへのプッシュ**
   - メインブランチとタグをプッシュします。
     - `git push origin main --tags`

5. **デプロイ監視**
   - GitHub Actionsの実行状況を確認し、リリースが正常に作成されるまで見守ります。
     - `gh run list --limit 5`