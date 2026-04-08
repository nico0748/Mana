# src/components/ui/

ビジネスロジックを持たない汎用 UI プリミティブコンポーネントを格納するディレクトリ。アプリ内のどこからでも再利用できる部品として設計されている。

## ファイル

### `Button.tsx`

バリアントとサイズを持つ汎用ボタンコンポーネント。

**Props:**

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| `variant` | `'default' \| 'outline' \| 'ghost' \| 'destructive'` | `'default'` | ビジュアルスタイル |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | サイズ |
| `loading` | `boolean` | `false` | ローディング状態（スピナー表示・無効化） |
| `...props` | `ButtonHTMLAttributes` | - | 標準 HTML ボタン属性 |

**バリアント:**
- `default`: 塗りつぶし（プライマリカラー / ライトテーマはテラコッタ `#c4622d`）
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

Tailwind スタイルを適用した標準テキスト入力フィールド。

**Props:** `InputHTMLAttributes<HTMLInputElement>` をそのままスプレッドして渡す。追加の Props なし。

**使用例:**
```tsx
<Input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} />
```
