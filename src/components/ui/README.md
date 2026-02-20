# src/components/ui/

ビジネスロジックを持たない汎用UIプリミティブコンポーネントを格納するディレクトリ。アプリ内のどこからでも再利用できる部品として設計されている。

## ファイル

### `Button.tsx`

バリアントとサイズを持つ汎用ボタンコンポーネント。

**Props:**

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| `variant` | `'default' \| 'outline' \| 'ghost' \| 'destructive'` | `'default'` | ビジュアルスタイル |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | サイズ |
| `loading` | `boolean` | `false` | ローディング状態（スピナー表示・無効化） |
| `...props` | `ButtonHTMLAttributes` | - | 標準HTMLボタン属性 |

**バリアント:**
- `default`: 塗りつぶし（プライマリカラー）
- `outline`: ボーダーあり・背景透明
- `ghost`: ボーダーなし・ホバー時のみ背景表示
- `destructive`: 赤系（削除など危険な操作向け）

**使用例:**
```tsx
<Button variant="outline" size="sm" loading={isSubmitting} onClick={handleClick}>
  保存
</Button>
```

---

### `Input.tsx`

Tailwindスタイルを適用した標準テキスト入力フィールド。

**Props:** `InputHTMLAttributes<HTMLInputElement>`をそのままスプレッドして渡す。追加のPropsなし。

**使用例:**
```tsx
<Input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} />
```

---

### `Modal.tsx`

ポータル（`document.body`直下）に描画する汎用モーダルダイアログ。

**Props:**

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `isOpen` | `boolean` | `true`のときモーダルを表示 |
| `onClose` | `() => void` | バックドロップクリック・Escキー押下時に呼ばれる |
| `children` | `ReactNode` | モーダル内に表示するコンテンツ |

**機能:**
- `ReactDOM.createPortal`で`document.body`直下に描画（z-indexの干渉を回避）
- バックドロップ（半透明オーバーレイ）クリックで`onClose`呼び出し
- `Escape`キーで`onClose`呼び出し
- `isOpen: false`の場合は何も描画しない（`null`を返す）

**使用箇所:** `BarcodeScanner.tsx`（バーコードスキャナーモーダル）
