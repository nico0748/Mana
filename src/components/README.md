# src/components/

再利用可能なReactコンポーネントを役割ごとに分類して格納するディレクトリ。

## ディレクトリ構成

```
components/
├── ui/       # 汎用UIプリミティブ（ボタン・インプット・モーダル）
├── layout/   # ページレイアウト・認証ガード
└── books/    # 書籍機能に特化したコンポーネント
```

## サブディレクトリ

### [ui/](ui/README.md)
特定のビジネスロジックを持たない汎用UIコンポーネント。プロジェクト内のどこからでも再利用できる。

| コンポーネント | 説明 |
|---|---|
| `Button` | バリアント・サイズ・ローディング状態を持つボタン |
| `Input` | Tailwindスタイルのテキスト入力フィールド |
| `Modal` | ポータル描画・バックドロップ・Escキー対応のモーダルダイアログ |

### [layout/](layout/README.md)
アプリ全体のページ構造と認証フローを制御するコンポーネント。

| コンポーネント | 説明 |
|---|---|
| `AppLayout` | サイドバー＋メインコンテンツのアプリレイアウト全体 |
| `Sidebar` | ナビゲーション・ユーザー情報・ログアウト |
| `ProtectedRoute` | 未認証ユーザーを`/login`にリダイレクトする認証ガード |

### [books/](books/README.md)
書籍管理機能の中核をなすコンポーネント群。

| コンポーネント | 説明 |
|---|---|
| `BookList` | 書籍一覧・検索・フィルタリング・ソートのメインページ |
| `BookItem` | 個別書籍カード表示 |
| `BookForm` | 書籍の新規追加・編集フォーム |
| `BookDetailModal` | 書籍詳細表示モーダル（閲覧・編集・削除） |
| `BarcodeScanner` | カメラを使ったISBNバーコードスキャナー |

## コンポーネント間の関係

```
AppLayout
├── Sidebar
└── (children)
    └── BookList
        ├── BookForm        ← 新規追加モード
        ├── BookItem[]
        │   └── BookDetailModal
        │       └── BookForm  ← 編集モード
        └── BarcodeScanner
            └── ISBN → BookForm へフィードバック
```
