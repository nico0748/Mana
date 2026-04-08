# src/components/

再利用可能な React コンポーネントを役割ごとに分類して格納するディレクトリ。

## ディレクトリ構成

```
components/
├── ui/       # 汎用 UI プリミティブ（ボタン・インプット）
├── layout/   # ページレイアウト・サイドバー
├── books/    # 書籍機能に特化したコンポーネント
└── map/      # 会場マップ関連コンポーネント
```

## ファイル（直下）

### `Onboarding.tsx`

初回アクセス時に表示するオンボーディング画面。アプリの主要機能をスライド形式で紹介する。
完了後 `localStorage` に `ONBOARDING_KEY` を保存し、以降は表示しない。

**使用箇所:** `src/App.tsx`（`AuthGate` 内）

---

## サブディレクトリ

### [ui/](ui/README.md)
特定のビジネスロジックを持たない汎用 UI コンポーネント。

| コンポーネント | 説明 |
|---|---|
| `Button` | バリアント・サイズ・ローディング状態を持つボタン |
| `Input` | Tailwind スタイルのテキスト入力フィールド |

### [layout/](layout/README.md)
アプリ全体のページ構造とナビゲーションを制御するコンポーネント。

| コンポーネント | 説明 |
|---|---|
| `AppLayout` | サイドバー＋メインコンテンツのアプリレイアウト全体 |
| `PageSidebar` | ナビゲーション・ユーザー情報・ログアウト |

### [books/](books/README.md)
書籍管理機能の中核をなすコンポーネント群。

| コンポーネント | 説明 |
|---|---|
| `BookList` | 書籍一覧・検索・フィルタリング・ソートのメインページ |
| `BookItem` | 個別書籍カード表示 |
| `BookForm` | 書籍の新規追加・編集フォーム |
| `BookDetailModal` | 書籍詳細表示モーダル（閲覧・編集・削除） |
| `BarcodeScanner` | カメラを使った ISBN バーコードスキャナー |

### [map/](map/README.md)
会場マップ関連コンポーネント。

| コンポーネント | 説明 |
|---|---|
| `VenueSchematicMap` | ベクター形式の会場模式図コンポーネント |
| `TemplateImportModal` | 公式テンプレートデータのインポートモーダル |

## コンポーネント間の主な関係

```
AppLayout
└── PageSidebar     ← ナビゲーション
└── (children)      ← AnimatedRoutes
    └── BookList
        ├── BookForm        ← 新規追加モード
        ├── BookItem[]
        │   └── BookDetailModal
        │       └── BookForm  ← 編集モード
        └── BarcodeScanner
    └── MapPage
        ├── VenueSchematicMap
        └── TemplateImportModal
```
