#!/bin/bash
# ============================================================
# 同人++ 本番デプロイスクリプト
# 使い方: bash deploy.sh
# 前提: .env.prod が存在すること
# ============================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 同人++ デプロイ開始..."
cd "$APP_DIR"

# .env.prod の存在確認
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  echo "   cp .env.prod.example $ENV_FILE してから値を設定してください"
  exit 1
fi

# 最新コードを取得
echo "📦 最新コードを取得..."
git pull origin main

# ビルドして再起動（ダウンタイム最小化のため --no-deps でサービス単位で更新）
echo "🔨 Docker イメージをビルド..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

echo "♻️  コンテナを再起動..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate

# 古いイメージを削除
echo "🧹 未使用イメージを削除..."
docker image prune -f

# ヘルスチェック
echo "⏳ バックエンドの起動を待機..."
sleep 5
if docker compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
  echo "❌ コンテナが正常に起動しませんでした"
  docker compose -f "$COMPOSE_FILE" logs --tail=30
  exit 1
fi

echo "✅ デプロイ完了！"
docker compose -f "$COMPOSE_FILE" ps
