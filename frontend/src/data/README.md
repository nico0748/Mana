# src/data/

静的マスターデータを格納するディレクトリ。コンパイル時に埋め込まれる読み取り専用データ。

## ファイル

### `tokyoBigSight.ts`

東京ビッグサイトの会場レイアウトデータ。`VenueLayout` 型で定義されており、各ホール・ブロック・スペースの配置情報を含む。

**主な内容:**
- 東ホール（東1〜東8）
- 西ホール（西1〜西4）
- 各ホールのブロック構成とスペース番号命名規則

**使用箇所:** `src/components/map/VenueSchematicMap.tsx`（会場模式図描画）、`src/pages/MapPage.tsx`（ホール選択）

---

### `templates.ts`

アプリ内蔵の公式テンプレートデータ一覧。即売会イベントのサークル配置テンプレートを定義する。

**型:** `src/types/template.ts` の `Template` 型に従う

**使用箇所:** `src/components/map/TemplateImportModal.tsx`、`src/pages/TemplatesPage.tsx`
