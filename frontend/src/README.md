# src/

アプリケーションのソースコード全体を格納するディレクトリ。

## ディレクトリ構成

```
src/
├── main.tsx          # ReactアプリのDOMマウントエントリーポイント
├── App.tsx           # ルートコンポーネント・ルーティング定義
├── index.css         # グローバルスタイル（Tailwind CSS + ライトテーマ定義）
├── vite-env.d.ts     # Vite固有の環境変数型定義
├── contexts/         # React Context（認証・アプリ設定）
├── types/            # TypeScript型定義
├── lib/              # ユーティリティ・外部SDK・APIクライアント
├── data/             # 静的マスターデータ（会場レイアウト等）
├── hooks/            # カスタムReactフック
├── pages/            # ページレベルコンポーネント
└── components/       # 再利用可能なUIコンポーネント
```

## ファイル説明

### `main.tsx`
Reactアプリケーションのエントリーポイント。`ReactDOM.createRoot()`で`index.html`の`#root`要素にアプリをマウントする。

### `App.tsx`
ルートコンポーネント。以下のプロバイダーでアプリ全体をラップし、`BrowserRouter`内でルーティングを定義する。

```
QueryClientProvider    ← React Query（サーバー状態管理）
  AuthProvider         ← Firebase Authentication 状態
    AppSettingsProvider ← テーマ・フォント等のユーザー設定
      BrowserRouter
        /about         → LandingPage（公開・認証不要）
        /templates     → TemplatesPage（公開・認証不要）
        /*             → AuthGate（認証ガード）
                           未ログイン → LoginPage
                           初回ソーシャル → SocialTermsModal → UsernameSetupModal
                           ログイン済み → AppLayout > AnimatedRoutes
```

**AnimatedRoutes:**
| パス | コンポーネント |
|---|---|
| `/` | BookList（本棚） |
| `/shopping` | ShoppingListPage（買い物リスト） |
| `/shopping/nav` | NavModePage（ナビモード） |
| `/map` | MapPage（会場マップ） |
| `/tools` | ToolsPage（設定・ツール） |

### `index.css`
Tailwind CSSのベーススタイルに加え、以下のカスタムスタイルを定義する。

- マテリアルデザイン Ripple エフェクト（`.md-ripple`）
- スクロールバーカスタマイズ
- ライトテーマ定義（`[data-theme="light"]` セレクター）
  基軸色テラコッタ #c4622d を中心とした類似色調和（Analogous Harmony）パレット
- `.tools-panel-header`（設定パネルのスティッキーヘッダー）

### `vite-env.d.ts`
`import.meta.env`（Viteの環境変数）の型定義を提供するTypeScript宣言ファイル。

## サブディレクトリ

| ディレクトリ | 内容 |
|-------------|------|
| [types/](types/README.md) | アプリ全体で使用するTypeScript型定義 |
| [lib/](lib/README.md) | Firebase SDK・REST APIクライアント・ユーティリティ関数 |
| [contexts/](contexts/README.md) | Firebase Auth状態・アプリ設定をReact Contextで管理 |
| [data/](data/README.md) | 東京ビッグサイト等の静的会場データ・テンプレートデータ |
| [hooks/](hooks/README.md) | 書籍CRUD・インポートエクスポート・ルートナビを担うカスタムフック |
| [pages/](pages/README.md) | ルーティングのターゲットとなるページコンポーネント |
| [components/](components/README.md) | UI・レイアウト・書籍・マップ関連の再利用可能コンポーネント |

## データフロー概要

```
Firebase Auth     ──→ AuthContext       ──→ AuthGate（認証ガード）
React Query       ──→ useBooks 等       ──→ 各ページコンポーネント
lib/api.ts        ──→ Express REST API  ──→ Prisma → PostgreSQL
lib/bookApi.ts    ──→ OpenBD / Google Books（書籍情報検索）
AppSettingsContext ──→ localStorage     ──→ テーマ・フォントサイズ等
```
