# Atomic Insights

個人のリンクグラフから構造的に関連するノートを発見し、AI エージェントにもそのデータを使ってノート整理を任せられるプラグインです。

## 仕組み

Vault 内のリンク構造を Adamic Adar アルゴリズムで分析し、任意でメタデータや時間の文脈を加味して、関連性の高いノートを提示します。

### なぜ Adamic Adar なのか

二つのノートが「多くのノートからリンクされているページ」を共有していても、その関連性は偶然である可能性があります。一方で、もし「ごく一部のノートからしかリンクされていないページ」を共有しているならば、そこにはより強い独自の思考の繋がりがあると考えられます。

Adamic Adar は、こうした「希少な共通点」を重く評価するアルゴリズムです。

具体的にいうと、数十のページにリンクしているデイリーノートはシグナルとして弱い——多くのノートがそこを経由するので、共有していてもほとんど意味がありません。一方、数個の具体的なアイデアだけにリンクしている丁寧に書かれたアトミックノートは強いシグナルです。二つのノートがそのような焦点の絞られた中間ノートを共有しているとき、Adamic Adar はそれを高く評価します。

プラグイン名の Atomic Insights が示す通り、洞察はアトミックなノートから生まれます。小さく焦点の絞られたノートを意図的なリンクで繋ぐほど、結果は鮮明になります。

### AI 単体では見えないもの

LLM は意味的に似たテキスト——似た言葉を使っているノート——を見つけるのは得意です。しかし、あなたの Vault の中で二つのノートが、他に3つしかリンクされていないニッチな中間ノートを介して繋がっていることは、LLM には分かりません。その構造的なシグナルはリンクグラフの中にしか存在せず、このプラグインがそれを取り出せる形にします。

## AI 連携

Atomic Insights はプラグイン読み込み後に `window.AtomicInsights` としてランタイム API を公開します。レスポンスは構造化 JSON（path, score, reasons, commonNeighbors）です。[Obsidian CLI](https://obsidian.md/blog/introducing-obsidian-cli/) と組み合わせることで、AI コーディングエージェントがターミナルからナレッジグラフを照会し、結果をもとに行動できます。

### これで何ができるか

AI エージェントは以下のことができます:

- Vault 内の任意のファイルに対して、スコア付きの関連ノート一覧を取得する。
- キーワードの重なりではなく、グラフ構造から浮かび上がるつながりを発見する。
- 構造化された出力（スコア・理由・共通リンク先）を使って、リンクの追加・ノートの整理・統合の判断を行う。

### 活用例

- デイリーノートやインデックスページから、キーワードの重なりではなくグラフの近さに基づいて関連ノートを提案する。
- 構造的に近いのにまだリンクされていないノートを発見する——統合やクロスリファレンスの候補になる。
- トピック周辺のグラフを照会してインデックスページ（Map of Content）を構築・維持する。

### 使用例

```bash
# API が利用可能か確認
obsidian eval code='typeof window.AtomicInsights'

# 特定ファイルの関連ノート上位5件を取得
obsidian eval code='JSON.stringify(window.AtomicInsights.getRelatedNotesSync("Path/To/Note.md", { limit: 5 }), null, 2)'
```

CLI の詳細（同期/非同期の使い分け、シェルスクリプト例、エラーハンドリング）は [docs/OBSIDIAN_CLI.md](docs/OBSIDIAN_CLI.md) を参照してください。

## GUI 機能

プラグインは Obsidian 上で直接関連ノートを確認できるビジュアルインターフェースも提供します:

- サイドバー表示とノート下部のフッター表示
- クリックによるノート移動、ドラッグ＆ドロップによる `[[Wikilink]]` 作成
- リンクプレビュー（Cmd/Ctrl + ホバー）への対応
- Graph vs Other の重み調整と、Other 内（絵文字/YAML/時間/編集時刻）の比率調整
- フォルダ除外設定（ロジック単位で適用範囲が異なる。詳細は [docs/SCORING.md](docs/SCORING.md)）

### はじめに

1. コマンドパレットから `Open Atomic Insights View` を実行します。
2. サイドバーのビューが、アクティブなノートに合わせて自動更新されます。
3. 設定画面で Vault の構造に合わせて重みを調整してください。

## ナレッジベースの成熟と計算の質

本プラグインはノート間のリンクの蓄積を前提に動作します。ナレッジベースが成熟するにつれて精度は向上しますが、初期段階やリンクが少ない環境では十分な結果が得られない場合があります。

期待した関連性が表示されないときは、「物事をアトミックな単位で記録し、適切に繋ぐ」というプロセスを継続してみてください。リンクの密度が増すほど、アルゴリズムの精度は向上します。

## API リファレンス

### メソッド

| メソッド | 使用場所 | 説明 |
|---|---|---|
| `getRelatedNotes(path, options)` | アプリ内（プラグイン、DataviewJS） | 関連ノートをスコア順で返す。非同期——UI をブロックしない。 |
| `getRelatedNotesSync(path, options)` | CLI（`obsidian eval`） | 同じ結果を同期で返す。CLI は cross-tick の Promise を待てないため必須。 |
| `getActiveRelatedNotes(options)` | アプリ内 | アクティブな Markdown ノートに対する関連ノート。 |
| `getActiveRelatedNotesSync(options)` | CLI | 同期版。ワークスペースにアクティブな Markdown ノートが必要。 |

### Options

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `limit` | number | 20 | 返却件数の上限 |

### レスポンス形状

```json
{
  "status": "success",
  "results": [
    {
      "path": "Brain/Permanent/Note.md",
      "score": 3.85,
      "reasons": ["graph", "time"],
      "details": {
        "commonNeighbors": ["Brain/MOC/Topic.md", "Brain/Permanent/Other.md"]
      }
    }
  ]
}
```

エラー時:

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

## 謝辞とインスピレーション

このプラグインは、@SkepticMystic 氏によるオリジナルの [Graph Analysis](https://github.com/SkepticMystic/graph-analysis) プラグインから着想を得て、ゼロから再構築したものです。計算手法は独自ですが、中核となるコンセプトとワークフローのアイデアを与えてくれた原作者に深い敬意を表します。

## ライセンス

MIT
