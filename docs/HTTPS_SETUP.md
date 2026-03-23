# ローカル HTTPS 開発環境セットアップガイド

## 概要

このドキュメントでは、スマートフォンのカメラ（ISBN バーコードスキャン機能）を開発環境で動作させるための HTTPS 設定手順を説明します。

### なぜ HTTPS が必要か

ブラウザの `getUserMedia()` API（カメラ・マイクへのアクセス）は **セキュアコンテキスト** でのみ動作します。

| アクセス元 | URL 例 | カメラ使用 |
|---|---|---|
| PC（localhost） | `http://localhost:5173` | ✅ 使用可（localhost は特例） |
| スマートフォン（HTTP） | `http://192.168.x.x:5173` | ❌ 使用不可 |
| スマートフォン（HTTPS） | `https://192.168.x.x:5173` | ✅ 使用可 |

### 採用したアプローチ

[mkcert](https://github.com/FiloSottile/mkcert) でローカル認証局（CA）を作成し、[vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) で Vite の開発サーバーを自動的に HTTPS 化します。

自己署名証明書（`@vitejs/plugin-basic-ssl` 等）とは異なり、mkcert の CA を各デバイスに一度インストールすれば **以降は警告なし** で HTTPS が使えます。

---

## 前提条件

- macOS（Homebrew インストール済み）
- Node.js 20.x 以上
- `vite-plugin-mkcert` が `package.json` の `devDependencies` に含まれていること（本プロジェクトでは設定済み）

---

## セットアップ手順

### Step 1：mkcert のインストール

```bash
brew install mkcert
```

インストール確認：

```bash
mkcert --version
# v1.4.4 以上が表示されれば OK
```

### Step 2：ローカル CA の作成

```bash
mkcert -install
```

> **注意：** このコマンドはシステムキーチェーンへの書き込みに `sudo` を要求します。
> パスワード入力を求められた場合は Mac のログインパスワードを入力してください。
>
> **`sudo` が使えない環境（CI・制限付きアカウント等）の場合：**
> 以下のコマンドでユーザーキーチェーンに登録することで代替できます（sudo 不要）。
> ただし、先に `mkcert -install` を一度実行して CA ファイルを生成しておく必要があります。
>
> ```bash
> # CA ファイルの生成だけ行う（失敗してもファイルは作成される）
> mkcert -install 2>/dev/null; true
>
> # ユーザーキーチェーンに登録
> security add-trusted-cert -d -r trustRoot \
>   -k "$HOME/Library/Keychains/login.keychain-db" \
>   "$(mkcert -CAROOT)/rootCA.pem"
> ```

CA ファイルの場所を確認します（後の手順で使用）：

```bash
mkcert -CAROOT
# 例: /Users/yourname/Library/Application Support/mkcert
```

### Step 3：依存パッケージのインストール

```bash
npm install
```

`vite-plugin-mkcert` は `devDependencies` に含まれているため、これだけで完了します。

### Step 4：開発サーバーの起動

```bash
npm run dev
```

正常に起動すると以下のように表示されます：

```
VITE v7.x.x  ready in xxx ms

  ➜  Local:   https://localhost:5173/
  ➜  Network: https://192.168.x.x:5173/   ← スマートフォンからはこちら
```

PC ブラウザで `https://localhost:5173` を開いて警告なしで表示されれば Mac 側の設定は完了です。

---

## スマートフォンへの CA インストール

### CA ファイルの場所

```bash
mkcert -CAROOT
# 表示されたパス内の rootCA.pem を使用する
# 例: /Users/yourname/Library/Application Support/mkcert/rootCA.pem
```

### iOS（iPhone / iPad）

#### 1. CA ファイルを転送する

**AirDrop（推奨）：**
Finder で `rootCA.pem` を右クリック → 共有 → AirDrop → 対象の iPhone を選択

iPhone 側で「承認」を選択すると「プロファイルがダウンロードされました」と通知が表示されます。

**その他の方法：** メール添付 / iCloud Drive 経由も可

#### 2. プロファイルをインストールする

1. **設定** アプリを開く
2. 画面上部に表示される「**プロファイルがダウンロードされました**」をタップ
3. 右上の「**インストール**」をタップ
4. パスコードを入力
5. 警告画面で「**インストール**」をタップ → 「完了」

#### 3. 証明書を信頼する（必須）

インストールしただけでは信頼されません。以下の手順が必要です：

1. **設定** → **一般** → **情報**
2. 最下部の「**証明書信頼設定**」をタップ
3. 「mkcert ...」の項目を **オン** にする
4. 確認ダイアログで「**続ける**」をタップ

#### 4. 動作確認

Safari で `https://192.168.x.x:5173` を開き、鍵アイコンが表示されれば完了です。

---

### Android（Chrome）

#### 1. CA ファイルを転送する

USB ケーブルまたはメール・Google Drive 経由で `rootCA.pem` を Android に転送します。

#### 2. CA 証明書をインストールする

Android のバージョンにより手順が異なります：

**Android 11 以降：**
1. **設定** → **セキュリティ** → **詳細設定** → **暗号化と認証情報**
2. **証明書のインストール** → **CA 証明書**
3. 「とにかくインストールする」をタップ
4. `rootCA.pem` を選択

**Android 10 以前：**
1. **設定** → **セキュリティ** → **ストレージからインストール**
2. `rootCA.pem` を選択
3. 証明書名を入力（例：`mkcert`）→ **OK**

#### 3. 動作確認

Chrome で `https://192.168.x.x:5173` を開き、鍵アイコンが表示されれば完了です。

---

## 動作確認チェックリスト

| 確認項目 | 確認方法 | 期待結果 |
|---|---|---|
| Mac CA 登録 | `security find-certificate -c "mkcert" ~/Library/Keychains/login.keychain-db` | 証明書情報が表示される |
| PC ブラウザ | `https://localhost:5173` を開く | 鍵アイコン表示・警告なし |
| スマートフォン接続 | `https://192.168.x.x:5173` を開く | 鍵アイコン表示・警告なし |
| カメラ起動 | アプリでバーコードスキャンボタンを押す | カメラ映像が表示される |

---

## トラブルシューティング

### 「接続がプライベートではありません」が PC で表示される

**原因：** mkcert CA がキーチェーンに登録されていない。

**対処：**
```bash
# 登録状態を確認
security find-certificate -c "mkcert" ~/Library/Keychains/login.keychain-db

# 未登録の場合、ユーザーキーチェーンに追加
security add-trusted-cert -d -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" \
  "$(mkcert -CAROOT)/rootCA.pem"
```

追加後、ブラウザを完全に再起動（Cmd+Q）してから再度アクセスしてください。

### スマートフォンで「接続がプライベートではありません」が表示される

**原因：** デバイスに CA がインストールされていない、または証明書信頼設定がオフ。

**対処：** [スマートフォンへの CA インストール](#スマートフォンへの-ca-インストール) セクションを再確認してください。iOS の場合は「証明書信頼設定」のオン忘れが最も多いミスです。

### カメラが起動しない（エラーメッセージが表示される）

| エラー内容 | 原因 | 対処 |
|---|---|---|
| カメラへのアクセスが拒否されました | ブラウザのカメラ許可が「ブロック」 | ブラウザのサイト設定でカメラを「許可」に変更 |
| HTTPS 接続でのみ利用できます | HTTP でアクセスしている | `https://` の URL でアクセスしているか確認 |
| カメラが他のアプリで使用中 | 他のアプリがカメラを占有 | カメラを使う他のアプリを閉じてから再試行 |

### `mkcert -install` でエラーが出て CA ファイルが作成されない

`mkcert -install` は失敗してもローカル CA ファイル自体は作成されます。以下で確認してください：

```bash
ls "$(mkcert -CAROOT)"
# rootCA.pem と rootCA-key.pem が存在すれば OK
```

存在しない場合は mkcert を再インストールしてください：
```bash
brew reinstall mkcert
mkcert -install 2>/dev/null; true
```

---

## 技術的な背景

### 構成要素

| ツール | 役割 |
|---|---|
| `mkcert` | ローカル認証局（CA）の作成・証明書の発行 |
| `vite-plugin-mkcert` | `npm run dev` 実行時に自動で mkcert 証明書を生成・Vite に適用 |
| macOS キーチェーン | 発行した CA を OS レベルで信頼済みにする |
| iOS 証明書信頼設定 | CA を iOS レベルで信頼済みにする |

### 証明書の有効期限

mkcert が発行する証明書の有効期限は **2 年間** です。期限切れになった場合は以下を実行して再生成してください：

```bash
# vite-plugin-mkcert のキャッシュを削除して再生成
rm -rf node_modules/.vite-plugin-mkcert
npm run dev  # 起動時に自動再生成される
```

### CA ファイルの管理に関する注意

`rootCA-key.pem`（CA の秘密鍵）は **絶対に共有・コミットしないでください**。`.gitignore` に以下が含まれていることを確認してください：

```
# mkcert の CA 秘密鍵は自動生成されるため管理不要
# $(mkcert -CAROOT) はプロジェクト外なので通常は問題ない
```

mkcert の CA ファイルはプロジェクトディレクトリ外（`~/Library/Application Support/mkcert/`）に保存されるため、通常は `.gitignore` の設定は不要です。
