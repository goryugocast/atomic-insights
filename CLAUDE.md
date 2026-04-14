# atomic-insights 開発メモ

## デプロイ

```bash
./deploy.sh
```

- ビルド（`npm run build`）+ Obsidian vault へのコピーを一括実行
- **コード変更後は必ずこれを実行してから完了とする**
- `deploy.sh` は `.gitignore` されている（個人パスが含まれるため）

## 開発フロー

```
コード変更 → npm test → コミット → ./deploy.sh
```

## ビルド

```bash
npm run build   # main.js を生成
```

TypeScript ソース（`src/`）を rollup でビルドして `main.js` を生成する。
`main.js` はビルド成果物だがリポジトリにコミットする（Obsidian の仕様）。

## テスト

```bash
npm test
```

## プロジェクト構成

| パス | 役割 |
|---|---|
| `src/RelatedNotesRenderer.ts` | 関連ノートのUI描画、クリックハンドラー |
| `src/Settings.ts` | 設定画面UI |
| `src/scoring/` | スコアリングロジック |
| `src/main.ts` | プラグインエントリーポイント |
| `src/API.ts` | `window.AtomicInsights` 公開API |
| `styles.css` | プラグインのスタイル |
| `docs/OBSIDIAN_CLI.md` | CLIからAPIを呼ぶ使用例 |
