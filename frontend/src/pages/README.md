# src/pages/

ルーティングのターゲットとなるページレベルのコンポーネントを格納するディレクトリ。`App.tsx` の `<Route>` に直接割り当てられるコンポーネントを置く。

## ファイル

### `LoginPage.tsx`

ユーザーのログイン・新規登録ページ。Firebase Authentication を使った認証を提供する。

**ルート:** 未ログイン時に `AuthGate` が表示（`/login` への明示的なルートはなし）

**認証方式:**
- Email / Password（`signInWithEmailAndPassword` / `createUserWithEmailAndPassword`）
- Google（`signInWithPopup` + `GoogleAuthProvider`）
- X / Twitter（`signInWithPopup` + `TwitterAuthProvider`）

**ソーシャルログイン初回登録フロー:**
1. `additionalUserInfo.isNewUser === true` を検出
2. `AuthContext` の `setPendingTerms(true)` を呼び出す
3. `App.tsx` の `AuthGate` が `SocialTermsModal` → `UsernameSetupModal` を順に表示

**エクスポート:**
- `LoginPage` — メインのログインフォームコンポーネント
- `SocialTermsModal` — ソーシャルログイン初回時の利用規約同意モーダル

---

### `ToolsPage.tsx`

設定・ツールページ。左カテゴリ＋右コンテンツの 2 ペインレイアウト。

**ルート:** `/tools`

**カテゴリ:**
| カテゴリ | 内容 |
|---|---|
| パーソナライズ | テーマ（ダーク/ライト）・フォントサイズ・背景画像・アニメーション削減・マーカーサイズ |
| データ管理 | 本棚・買い物リストのインポート/エクスポート（JSON・CSV・Excel） |
| アカウント | ユーザー名インライン編集・メールアドレス表示・ログアウト |
| サポート | 利用規約・プライバシーポリシー・フィードバック（Google フォーム） |

**依存:**
- `AppSettingsContext` - テーマ等の設定変更
- `useSync` - 本棚データのインポート/エクスポート
- `useAuth` - ユーザー情報・ログアウト

---

### `MapPage.tsx`

会場マップページ。マップ画像のアップロード・サークルピン配置・マーカー表示を担う。

**ルート:** `/map`

**主な機能:**
- PDF / 画像ファイルのアップロード（Cloudflare R2 または Base64 Data URL）
- 画像の回転・クロップ
- `imageToSvg` で SVG トレースを生成
- サークルピンをマップ上にドラッグ配置
- ピンクリックでサークル詳細ポップアップ（アイテム別ステータス表示・変更）
- マーカーサイズを `AppSettings.mapMarkerSize` で制御（small/normal/large）

---

### `ShoppingListPage.tsx`

買い物リスト（即売会・サークル・アイテム管理）ページ。

**ルート:** `/shopping`

**主な機能:**
- 即売会（DoujinEvent）の作成・編集・削除
- サークルの追加・編集・削除・購入ステータス管理
- サークル内アイテム（CircleItem）の追加・個別ステータス管理
- CSV / Excel インポート・エクスポート・テンプレートダウンロード
- X（Twitter）代理購入シェア（イベント単位・サークル単位）
- 予算管理（予算入力・合計金額・残高表示）

---

### `NavModePage.tsx`

会場内ルートナビモードページ。

**ルート:** `/shopping/nav`

**主な機能:**
- 買い物リストのサークルを巡回順に並べ表示
- `useVenueRoute` フックで最短経路を計算
- マップ上に経路を SVG パスで描画

---

### `LandingPage.tsx`

ログイン不要のアプリ紹介ページ。

**ルート:** `/about`（公開・認証不要）

**内容:**
- 機能紹介（実スクリーンショット画像使用）
- 公式テンプレートデータ（即売会・ホール JSON）のダウンロード
- FAQ

---

### `TemplatesPage.tsx`

公式テンプレートデータの閲覧・インポートページ。

**ルート:** `/templates`（公開・認証不要）

---

### `LineCallbackPage.tsx`

> **現在未使用。** LINE ソーシャルログイン用の OAuth コールバック受け取りページとして実装されたが、LINE 認証は削除済み。
