# Atomic Insights

Obsidian でアトミックなノートを作成し、それらをリンクによって繋いでいくプロセスを支援するためのプラグインです。

## コンセプト

このプラグインは、ユーザー自身が構築したリンク構造を Adamic Adar アルゴリズムで分析し、さらに任意でメタデータや時間の文脈を加味して関連性の高いノートを提示します。単なるキーワードの一致ではなく、グラフ構造に基づいた客観的な繋がりを可視化することを目的としています。

### なぜ Adamic Adar なのか

二つのノートが「多くのノートからリンクされているページ」を共有していても、その関連性は偶然である可能性があります。一方で、もし「ごく一部のノートからしかリンクされていないページ」を共有しているならば、そこにはより強い独自の思考の繋がりがあると考えられます。

Adamic Adar は、こうした「希少な共通点」を重く評価するアルゴリズムです。精緻なナレッジベースを構築するほど、計算結果はあなた自身の思考の傾向をより正確に反映するようになります。

### ナレッジベースの成熟と計算の質について

本機能は、既存のノート間に一定以上のリンクが存在することを前提として動作します。そのため、使い始めの段階やリンクが少ない環境では、十分な結果が得られない場合があるかもしれません。

もし期待した関連性が表示されないときは、日々のノート作成において「物事をアトミックな単位で記録し、それらを適切に繋ぐ」というプロセスを継続してみてください。リンクという接続点が増えるに従い、計算の精度は向上します。これによって、自分自身でも意識していなかったノート同士の客観的な繋がりが、より精緻に提示されるようになっていきます。

## 主な機能

- Adamic Adar アルゴリズムによる関連ノートの計算
- 絵文字（ファイル名）、YAML frontmatter、日付近接、編集時刻近接（デイリーノート時のみ）による文脈スコア
- Graph vs Other の調整と、Other 内（絵文字/YAML/時間/編集時刻）の比率調整
- 指定したフォルダを除外する機能（**ロジック単位で意味が変わる**。詳細は [docs/SCORING.md](docs/SCORING.md)）
- サイドバー表示とノート下部のフッター表示
- リンクプレビュー（Cmd/Ctrl + ホバー）への対応
- クリックによるノート移動およびドラッグ＆ドロップによるリンク作成

## 使い方

1. コマンドパレットから Open Atomic Insights View を実行します。
2. 右サイドバーに表示されるビューが、現在開いているノートに合わせて自動更新されます。
3. リスト内の項目をクリックして移動、またはエディタにドラッグしてリンクを作成できます。
4. 設定画面の `1. Graph Topology` で、`Adamic Adar Score` と `Excluded Folders` を設定します。Excluded Folders はロジックごとに適用範囲が異なります（詳細は [docs/SCORING.md](docs/SCORING.md)）。
5. 設定画面で `Other (Non-Graph) Weight` と、Other 内（絵文字/YAML/時間/編集時刻）の比率を調整できます。

## 外部API

Atomic Insights は、プラグインの読み込み後に `window.AtomicInsights` として小さなランタイム API も公開します。Obsidian CLI ワークフロー、自動化スクリプト、開発者コンソールでの確認に便利です。

実際にターミナルから呼ぶ例は [docs/OBSIDIAN_CLI.md](docs/OBSIDIAN_CLI.md) にまとめています。

### 利用できるメソッド

- `getRelatedNotes(path, options)` は、指定したファイルパスに対する関連ノート一覧をスコア順で返します。
- `getActiveRelatedNotes(options)` は、現在アクティブな Markdown ノートに対する関連ノート一覧を返します。

### Options

- `limit` は返却件数の上限です。デフォルトは `20` です。

### 例

```js
const result = await window.AtomicInsights.getRelatedNotes(
  "Inbox/My Note.md",
  { limit: 10 }
);

if (result.status === "success") {
  console.table(result.results.map((item) => ({
    path: item.path,
    score: item.score,
    reasons: item.reasons?.join(", ") ?? ""
  })));
} else {
  console.error(result.message);
}
```

### エラーハンドリング

対象ファイルが存在しない場合や、アクティブな Markdown ノートがない場合は、次のような構造化されたエラーオブジェクトを返します。

```json
{
  "status": "error",
  "message": "File not found: Inbox/Missing Note.md"
}
```

## 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

## 謝辞とインスピレーション (Credits & Inspiration)

このプラグインは、@SkepticMystic 氏によるオリジナルの Graph Analysis プラグインから着想を得て、その機能を絞り込み、ゼロから再構築したものです。計算手法などは独自に選択していますが、中核となるコンセプトとワークフローのアイデアを与えてくれた原作者に深い敬意を表します。

## ライセンス

MIT
