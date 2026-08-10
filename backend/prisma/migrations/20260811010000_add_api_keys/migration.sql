-- MCP サーバなど、ブラウザ外のクライアント向けの長期クレデンシャル。
-- 平文は保存せず SHA-256 ハッシュのみを持つ。
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("firebaseUid") ON DELETE CASCADE ON UPDATE CASCADE;
