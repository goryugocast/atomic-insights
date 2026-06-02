# atomic-insights 開発メモ

## デプロイ

```bash
./deploy.sh
```

- ビルド（`npm run build`）+ Obsidian vault へのコピーを一括実行
- コード変更後は必ずこれを実行してから完了とする
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

## このプラグインの実運用

GUI サイドバーだけでなく、LLM エージェント（Claude Code）が Obsidian CLI 経由で API を叩き、ノート整理を自動化するのが主要な使われ方。

### API の使われ方

`window.AtomicInsights.getRelatedNotesSync(path, {limit})` を `obsidian eval` から呼ぶと、Adamic Adar スコア付きの関連ノート一覧が JSON で返る。LLM はこの構造化データ（path / score / reasons / commonNeighbors）をそのまま読み、ノート間の構造的つながりを把握できる。LLM の意味的類似検索では拾えない「ニッチな共通リンクを介した、本人も気づいていない接続」を提供するのがこのプラグインの核。

### 実際に使っている moc-* スキル群（Obsidian Vault 側）

Vault の `.claude/skills/` に以下のスキルがあり、いずれも Atomic Insights の API 前提で動く:

| スキル | 役割 | API 利用 |
|---|---|---|
| `moc-related` | MOC に対して関連 Permanent ノートを機械抽出し、未掲載の候補を提示 | 直接 |
| `moc-build` | 新しい MOC をゼロから作る（関連ノート探索に API を使う） | 直接 |
| `moc-propose` | 新しい MOC 候補を提案する（API で関連クラスタを発見） | 直接 |
| `moc-densify` | 既存 MOC の論理的な穴を特定して埋める（内部で moc-related を呼ぶ） | 間接 |
| `moc-add` | ノートを既存 MOC に追加 | — |
| `moc-audit` | MOC を監査し、次に使うべきスキルを案内 | — |
| `moc-split` | 肥大化した MOC を分割して親子構造にする | — |

### API を変更するときの注意

上記スキル群が `getRelatedNotesSync` のレスポンス形状（`status`, `results[].path`, `results[].score`, `results[].reasons`, `results[].details.commonNeighbors`）に依存している。レスポンス構造を変える場合は後方互換を意識すること。

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
