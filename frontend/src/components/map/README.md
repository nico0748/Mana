# src/components/map/

会場マップ関連のコンポーネントを格納するディレクトリ。

## ファイル

### `VenueSchematicMap.tsx`

ベクター形式の会場模式図コンポーネント。東京ビッグサイト等の会場レイアウトを SVG で描画する。

**機能:**
- `src/data/tokyoBigSight.ts` の `VenueLayout` データを元に SVG を描画
- ホール・ブロック・スペースのグリッドを可視化
- サークル配置状況をオーバーレイ表示
- タップ/クリックでスペースを選択・サークルを割り当て

**Props:**
| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `layout` | `VenueLayout` | 会場レイアウトデータ |
| `circles` | `Circle[]` | 配置済みサークル一覧 |
| `onSpaceSelect` | `(hall, block, number) => void` | スペース選択時のコールバック |

**使用箇所:** `src/pages/MapPage.tsx`

---

### `TemplateImportModal.tsx`

公式テンプレートデータ（即売会・ホール一覧）をアプリにインポートするモーダルコンポーネント。

**機能:**
- アプリ内蔵テンプレート一覧（`src/data/templates.ts`）から選択してインポート
- ファイル読み込み（JSON ファイルをアップロード）からインポート
- インポート前にプレビュー表示

**使用箇所:** `src/pages/MapPage.tsx`
