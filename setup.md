# 同人++ リリース工程

> このファイルは `.gitignore` により Git 管理対象外です。
> パスワードや秘密鍵などの機密情報をここに書いても安全です。

---

## 現在の状態と残タスク

```
✅ docker-compose.prod.yml  — 完成
✅ deploy.sh                — 完成
✅ nginx-host.conf          — 完成
✅ GitHub Actions           — 完成（deploy.yml）
✅ 旧アプリ名の統一          — 完成

⬜ フェーズ0: 変更をコミット・main へマージ  ← 次のアクション
⬜ フェーズ1: ConoHa VPS 契約
⬜ フェーズ2: ドメイン取得
⬜ フェーズ3: VPS 初期設定
⬜ フェーズ4: Docker + アプリ起動
⬜ フェーズ5: Nginx + SSL 設定
⬜ フェーズ6: GitHub Actions 設定
⬜ フェーズ7: 動作確認
⬜ フェーズ8: 運用設定（バックアップ等）
```

---

## 費用まとめ

| 項目 | 月額目安 |
|------|---------|
| ConoHa VPS 2GB | 約 ¥1,760 |
| ドメイン | 約 ¥125（年 ¥1,500 ÷ 12） |
| **合計** | **約 ¥1,885 / 月** |

---

## フェーズ 0 — ローカル（今すぐ）

### 未コミット変更をまとめてコミット

```bash
git add frontend/src/components/layout/AppLayout.tsx \
        frontend/src/pages/MapPage.tsx \
        frontend/src/hooks/useVenueRoute.ts \
        deploy.sh nginx-host.conf \
        .github/workflows/deploy.yml
git commit -m "refactor: 旧アプリ名 KuraMori を同人++ に統一"
```

### feature → main にマージ

```bash
git checkout main
git merge feature
git push origin main
```

> `main` への push で GitHub Actions が動くが、VPS 未設定なのでこの時点ではエラーになる（正常）。

---

## フェーズ 1 — ConoHa VPS 契約

**URL:** <https://www.conoha.jp/vps/>

| 項目 | 選択値 |
|------|--------|
| プラン | **メモリ 2GB**（約 ¥1,760 / 月） |
| OS | **Ubuntu 22.04 LTS** |
| 課金方式 | 時間課金 |
| SSH Key | 作成 or 既存を登録 |

契約後に発行される情報を以下に控えておく：

```
IP アドレス  : xxx.xxx.xxx.xxx
root パスワード: （初期設定後は使わない）
```

---

## フェーズ 2 — ドメイン取得

**推奨:** お名前.com（国内・日本語サポート）または Cloudflare（安価・DNS 管理が強力）

### DNS 設定

DNS 管理画面で A レコードを追加する：

| ホスト名 | タイプ | 値 |
|---------|-------|-----|
| `@` | A | VPS の IP アドレス |
| `www` | A | VPS の IP アドレス |

### 反映確認

```bash
dig yourdomain.com +short
# VPS の IP が返ってくれば完了（最大 24 時間、通常数分）
```

```
取得ドメイン: yourdomain.com
```

---

## フェーズ 3 — VPS 初期設定

### ローカル Mac で SSH 鍵を確認・生成

```bash
cat ~/.ssh/id_rsa.pub
# 出力がなければ生成する
ssh-keygen -t rsa -b 4096
```

### VPS（root）で初期設定

```bash
ssh root@xxx.xxx.xxx.xxx

# 一般ユーザーを作成して sudo 権限を付与
adduser doujin
usermod -aG sudo doujin

# SSH 公開鍵を設定（Mac で cat ~/.ssh/id_rsa.pub した内容を貼る）
mkdir -p /home/doujin/.ssh
nano /home/doujin/.ssh/authorized_keys
chmod 700 /home/doujin/.ssh
chmod 600 /home/doujin/.ssh/authorized_keys
chown -R doujin:doujin /home/doujin/.ssh

# root ログインを無効化
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# ファイアウォール（SSH・HTTP・HTTPS のみ開放）
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

以後は `ssh doujin@xxx.xxx.xxx.xxx` で接続する。

---

## フェーズ 4 — Docker + アプリ起動

### Docker インストール・リポジトリ取得

```bash
ssh doujin@xxx.xxx.xxx.xxx

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

git clone https://github.com/nico0748/Mana.git ~/doujin-pp
cd ~/doujin-pp
```

### 本番環境変数を設定

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

`.env.prod` の記入例：

```bash
POSTGRES_DB=doujin_pp
POSTGRES_USER=doujin
# openssl rand -base64 32 で生成したパスワードを貼る
POSTGRES_PASSWORD=CHANGE_THIS
DATABASE_URL=postgresql://doujin:CHANGE_THIS@db:5432/doujin_pp
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### アプリを起動

```bash
bash deploy.sh

# 確認（frontend / backend / db が全て Up であれば OK）
docker compose -f docker-compose.prod.yml ps
```

> この時点で `http://xxx.xxx.xxx.xxx:8080` に直接アクセスするとアプリが表示される（まだ HTTPS なし）。

---

## フェーズ 5 — Nginx + SSL 設定

### Nginx・Certbot をインストール

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
sudo systemctl enable nginx && sudo systemctl start nginx
```

### SSL 証明書を取得（DNS が反映済みであること）

```bash
sudo certbot certonly --nginx -d yourdomain.com
```

### Nginx 設定を配置

```bash
sudo cp ~/doujin-pp/nginx-host.conf /etc/nginx/sites-available/doujin-pp

# yourdomain.com を実際のドメインに置換
sudo sed -i 's/yourdomain.com/実際のドメイン/g' /etc/nginx/sites-available/doujin-pp

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/doujin-pp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

✅ `https://yourdomain.com` でアプリが開けば完了。

### SSL 証明書の自動更新確認

```bash
sudo certbot renew --dry-run
# エラーが出なければ自動更新は有効
```

---

## フェーズ 6 — GitHub Actions 設定（自動デプロイ）

GitHub リポジトリの **Settings → Secrets and variables → Actions** に以下を登録：

| Secret 名 | 値 | 確認場所 |
|----------|---|---------|
| `VPS_HOST` | VPS の IP アドレス | ConoHa 管理画面 |
| `VPS_USER` | `doujin` | フェーズ 3 で設定 |
| `VPS_SSH_KEY` | 秘密鍵の中身 | ローカルで `cat ~/.ssh/id_rsa` |

```
VPS_HOST : xxx.xxx.xxx.xxx
VPS_USER : doujin
```

### 動作確認

```bash
# 空コミットで Actions をトリガー
git commit --allow-empty -m "test: GitHub Actions 動作確認"
git push origin main
```

GitHub → Actions タブで緑チェックになれば OK。

---

## フェーズ 7 — 動作確認チェックリスト

- [ ] `https://yourdomain.com` でアプリが開く
- [ ] `http://` アクセスが `https://` にリダイレクトされる
- [ ] 本棚・買い物リスト・MAP の各機能が動作する
- [ ] スマートフォンのブラウザで問題なく使える
- [ ] `main` push → GitHub Actions が自動デプロイされる
- [ ] DB ポートが外部に露出していない
  ```bash
  nc -zv xxx.xxx.xxx.xxx 5432
  # → Connection refused が正解
  ```

---

## フェーズ 8 — 運用設定（リリース後）

### DB バックアップ（毎日 3 時に自動実行）

```bash
mkdir -p ~/backups
crontab -e

# 以下を追記
0 3 * * * cd ~/doujin-pp && docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U doujin doujin_pp > ~/backups/$(date +\%Y\%m\%d).sql
```

### コンテナの再起動

```bash
cd ~/doujin-pp
docker compose -f docker-compose.prod.yml restart
```

---

## トラブルシューティング

### アプリが起動しない

```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs db
```

### Nginx のエラー

```bash
sudo nginx -t
sudo journalctl -u nginx -n 50
```

### DB に接続できない

```bash
docker compose -f docker-compose.prod.yml exec db psql -U doujin -d doujin_pp
```

---

*最終更新: 2026-03-25*
