# 同人++ MCP サーバ

Claude（Claude Code / Claude Desktop）から同人++ の蔵書・買い物リスト・MAP を操作するための MCP サーバです。stdio で動きます。

## できること

| ツール | 説明 |
|---|---|
| `list_events` | 登録済みの即売会を一覧する |
| `create_event` | 即売会を新規作成する |
| `search_book_cover` | タイトルから書影画像の URL 候補を検索する |
| `add_book` | 蔵書に本を追加する |
| `list_circles` | 即売会のサークル一覧（`circleId` 調べ用） |
| `add_circle` | サークルと購入予定の頒布物をまとめて追加する |
| `add_circle_items` | 既存サークルに頒布物を追加する |
| `get_venue_map` | 会場マップ画像を取得する |
| `set_circle_pin` | サークルの MAP 上の位置を設定する |

## セットアップ

### 1. API キーを発行する

同人++ を開き、**設定 → 連携 → API キー** から発行します。
用途がわかる名前（例: `Claude Code`）を入れて「発行」を押すと、`mana_sk_…` で始まるキーが表示されます。

> **キーが表示されるのは発行直後の一度きりです。** サーバ側にはハッシュしか保存されないため、
> 控え忘れた場合は失効させて再発行してください。

キーでできるのは自分のデータの読み書きだけです。管理者操作と、API キー自体の発行・失効はできません。

### 2. ビルド

```bash
cd mcp
npm install
npm run build
```

### 3. Claude Code に登録する

```bash
claude mcp add doujin-pp \
  --env MANA_API_KEY=mana_sk_ここに発行したキー \
  -- node /絶対パス/mana-library/mcp/dist/index.js
```

Claude Desktop の場合は `claude_desktop_config.json` に追記します。

```json
{
  "mcpServers": {
    "doujin-pp": {
      "command": "node",
      "args": ["/絶対パス/mana-library/mcp/dist/index.js"],
      "env": { "MANA_API_KEY": "mana_sk_ここに発行したキー" }
    }
  }
}
```

### 環境変数

| 変数 | 必須 | 既定値 | 説明 |
|---|---|---|---|
| `MANA_API_KEY` | ✅ | — | 設定 → 連携 で発行した API キー |
| `MANA_BASE_URL` | | `https://doujin-pp.com` | ローカル開発時は `http://localhost:3000` など |

## 使い方の例

### タイトルから書影を引いて蔵書に追加

> 「涼宮ハルヒの憂鬱」を表紙付きで蔵書に追加して

`search_book_cover` で候補を出し、`add_book` に `coverUrl` を渡して登録します。

**同人誌の書影について**: `search_book_cover` が引いているのは楽天ブックス / OpenBD / Google Books という
商業出版物のデータベースなので、同人誌はほぼヒットしません。同人誌の場合は X の投稿画像などから
URL を取り、`add_book` の `coverUrl` に直接指定してください。

### X のお品書きからサークルと購入予定を登録

> このサークルの新刊、冬コミの買い物リストに入れといて
> https://x.com/example_circle/status/...

**このサーバ自体は X を読めません**（X は無料 API を廃止しており、スクレイピングもブロックされています）。
実際には Claude がページを読み取り、サークル名・スペース・頒布物・価格を構造化して `add_circle` に
渡す流れになります。Claude 側でページを取得できない場合は、投稿本文を貼り付けてください。

`xUrl` を渡しておくと、アプリのサークルカードからその X を直接開けるようになります。

### MAP にサークルを配置

> 東1 の地図を見て、A-12a のサークルにピンを打って

`get_venue_map` が会場マップ画像を返すので、Claude がそれを見てスペース番号の位置を判断し、
`set_circle_pin` に百分率（左上 0,0 / 右下 100,100）で座標を渡します。

**座標は Claude の目視判断なので、ずれることがあります。** アプリの MAP 画面の編集モードから
ドラッグで微調整できます。

## 開発

```bash
npm run dev    # tsx で直接起動
npm run build  # dist/ に出力
```

ログは stderr に出します（stdout は MCP の通信路なので、絶対に何も書かないこと）。
