# src/contexts/

React Context を使ったグローバル状態管理のプロバイダーを格納するディレクトリ。

> **注意:** ルートに `src/context/` ディレクトリが残存しているが、現在は使用されていない。実際の Context ファイルはすべてこの `src/contexts/` 以下に配置する。

## ファイル

### `AuthContext.tsx`

Firebase Authentication の認証状態をアプリ全体で共有するための Context プロバイダー。

**エクスポート:**

#### `AuthProvider` コンポーネント
`App.tsx` でアプリ全体をラップして使用する。

- `onAuthStateChanged` でログイン状態の変化をリアルタイム監視
- ログイン状態が確定するまで `loading: true` を保持
- ソーシャルログイン初回登録時の利用規約同意フロー（`pendingTerms`）を管理

#### `useAuth()` カスタムフック

```typescript
const { user, loading, pendingTerms, setPendingTerms, refreshUser } = useAuth();
```

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `user` | `User \| null` | ログイン中の Firebase ユーザー |
| `loading` | `boolean` | 認証状態確認中は `true` |
| `pendingTerms` | `boolean` | ソーシャル初回登録で利用規約同意待ちの場合 `true` |
| `setPendingTerms` | `(v: boolean) => void` | 利用規約同意状態を更新する |
| `refreshUser` | `() => Promise<void>` | `currentUser.reload()` でユーザー情報を再取得する |

**利用規約同意フロー（ソーシャルログイン）:**
```
signInWithPopup → isNewUser === true
  → pendingTerms = true
  → App.tsx の AuthGate が SocialTermsModal を表示
  → 同意: pendingTerms = false → UsernameSetupModal へ
  → 非同意: user.delete() → pendingTerms 自動リセット
```

**使用箇所:**
- `src/App.tsx` - AuthGate（認証ガード・ソーシャルログインフロー）
- `src/pages/LoginPage.tsx` - ログイン済み判定・ソーシャルログイン後の pendingTerms 設定

---

### `AppSettingsContext.tsx`

ユーザーのアプリ設定を localStorage に永続化し、アプリ全体で共有するための Context プロバイダー。

**型定義:**

```typescript
export type Theme        = 'dark' | 'light';
export type FontSize     = 'normal' | 'large';
export type MapMarkerSize = 'small' | 'normal' | 'large';

export interface AppSettings {
  theme:                  Theme;
  backgroundImageDataUrl: string | null;
  backgroundOpacity:      number;        // 0–100
  fontSize:               FontSize;
  reduceMotion:           boolean;
  mapMarkerSize:          MapMarkerSize;
}
```

**デフォルト値:** `{ theme: 'dark', backgroundOpacity: 30, fontSize: 'normal', reduceMotion: false, mapMarkerSize: 'normal' }`

#### `AppSettingsProvider` コンポーネント
- `localStorage` から設定を読み込んで初期化
- `theme` 変更時: `<html>` の `data-theme="light"` 属性を付け外し
- `fontSize` 変更時: `document.documentElement.style.fontSize` を変更

#### `useAppSettings()` カスタムフック

```typescript
const { settings, update, reset } = useAppSettings();
```

| プロパティ | 説明 |
|-----------|------|
| `settings` | 現在の設定値 |
| `update(partial)` | 一部の設定を更新して localStorage に保存 |
| `reset()` | デフォルト値にリセット |

**使用箇所:**
- `src/pages/ToolsPage.tsx` - 設定 UI（テーマ・フォントサイズ・マーカーサイズ等の変更）
- `src/pages/MapPage.tsx` - マーカーサイズの読み取り
- `src/components/layout/AppLayout.tsx` - 背景画像・reduce-motion クラスの適用
