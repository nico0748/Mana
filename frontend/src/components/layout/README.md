# src/components/layout/

アプリ全体のページ構造・ナビゲーションを制御するレイアウトコンポーネントを格納するディレクトリ。

## ファイル

### `AppLayout.tsx`

認証済みユーザーが見るアプリのメインレイアウトコンポーネント。`PageSidebar` とメインコンテンツエリアで構成される。

**Props:**
| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `children` | `ReactNode` | メインコンテンツエリアに表示する要素 |

**機能:**
- `AppSettingsContext` から背景画像・不透明度・reduce-motion 設定を読み取り適用
- `reduce-motion` クラスを `<html>` に付け外し（CSS アニメーション抑制）
- モバイルでは `PageSidebar` をオーバーレイとして表示

**使用箇所:** `src/App.tsx`（`AuthGate` 内）

---

### `PageSidebar.tsx`

画面左側（モバイルはオーバーレイ）に表示されるナビゲーションサイドバー。

**表示内容:**
- アプリロゴ / タイトル
- ナビゲーションリンク（本棚 / 買い物リスト / MAP / ツール）
- ログイン中のユーザー名・メールアドレス
- ログアウトボタン

**機能:**
- `useAuth()` からログイン中のユーザー情報を取得して表示
- ログアウトボタンクリックで `signOut(auth)` を呼び出し
- PWA モバイル表示時のサイドバー開閉（ハンバーガーメニュー）

**依存:**
- `src/contexts/AuthContext.tsx` - `useAuth`
- `src/lib/firebase.ts` - `auth`（signOut 用）
- `react-router-dom` - `NavLink`（アクティブリンク強調）
