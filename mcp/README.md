# 同人++ MCP サーバ

Claude（Claude Code / Claude Desktop）から同人++ の蔵書・買い物リスト・MAP を操作するための MCP サーバです。stdio で動きます。

## できること

アプリでできる操作はひととおり MCP から動かせます（28 ツール）。

### 即売会
| ツール | 説明 |
|---|---|
| `list_events` | 即売会を一覧する（色に付けた名前も返る） |
| `create_event` | 即売会を作成する |
| `update_event` | 名前・開催日・予算を変更する |
| `set_event_color_labels` | 色に名前を付ける（例: red = 代理購入） |
| `delete_event` | 即売会を削除する（サークルも巻き添えで消える） |

### サークル
| ツール | 説明 |
|---|---|
| `list_circles` | サークルを一覧する（色・購入状況で絞り込み可） |
| `add_circle` | サークルと購入予定の頒布物をまとめて追加する |
| `update_circle` | 名前・スペース・色・購入状況を変更する |
| `set_circles_color` | 複数サークルの色をまとめて変更する |
| `delete_circle` | サークルを削除する（頒布物も巻き添えで消える） |

### 頒布物（購入予定）
| ツール | 説明 |
|---|---|
| `list_circle_items` | 頒布物を一覧する（合計金額つき） |
| `add_circle_items` | 既存サークルに頒布物を追加する |
| `update_circle_item` | タイトル・価格・数量・購入状況を変更する |
| `set_items_status` | 複数の購入状況をまとめて変更する |
| `delete_circle_item` | 頒布物を削除する |

### 蔵書
| ツール | 説明 |
|---|---|
| `search_book_cover` | タイトルから書影 URL 候補を検索する |
| `list_books` | 蔵書を検索・一覧する |
| `add_book` | 蔵書に追加する |
| `update_book` | 蔵書の情報・所持状況を変更する |
| `delete_book` | 蔵書から削除する |

### 会場マップ
| ツール | 説明 |
|---|---|
| `list_venue_maps` | ホールとページの構成、ページ別のピン数を返す |
| `get_venue_map` | 会場マップ画像を取得する（ページ指定可） |
| `set_circle_pin` | サークルの位置を設定する（ページ指定可） |
| `clear_circle_pin` | ピンを外す |
| `delete_venue_map` | 会場マップを削除する（ページ指定可） |

### アカウント・テンプレート
| ツール | 説明 |
|---|---|
| `get_account` | プラン・上限・使用数・残り枠を返す |
| `list_event_templates` | 公式テンプレートを一覧する |
| `import_event_template` | テンプレートを自分の即売会として取り込む |

### 対象外

- **管理者 API** — API キーでは叩けません（漏洩時の被害を自分のデータに留めるため）
- **API キー自体の発行・失効** — ブラウザで Firebase 認証を通した本人のみ
- **会場マップ画像の登録** — PDF / 画像のアップロードはアプリの MAP 画面から行ってください
- **頒布（Distribution）API** — 定義だけで UI から使われていない休眠 API のため

### 削除ツールについて

`delete_*` は取り消しができません。巻き添えで消えるもの（即売会 → サークル、サークル → 頒布物）は
実行結果に件数を返すので、影響を確認できます。実行前にユーザーへ確認するようツール説明にも書いてあります。

## セットアップ

### 1. API キーを発行する

> **現在、API キーの発行は管理者アカウントのみに限定されています。** MCP 連携の検証中のための
> 暫定措置です。管理者以外には 設定 に「連携」タブが表示されず、API も 403 を返します。

同人++ を開き、**設定 → 連携 → API キー** から発行します。
用途がわかる名前（例: `Claude Code`）を入れて「発行」を押すと、`mana_sk_…` で始まるキーが表示されます。

> **キーが表示されるのは発行直後の一度きりです。** サーバ側にはハッシュしか保存されないため、
> 控え忘れた場合は失効させて再発行してください。

発行されたキーでできるのは、そのユーザー自身のデータの読み書きだけです。
管理者アカウントで発行したキーであっても、**管理者 API は叩けず**、API キー自体の発行・失効もできません。

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
