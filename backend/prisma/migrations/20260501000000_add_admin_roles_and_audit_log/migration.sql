-- AlterTable
ALTER TABLE "User" ADD COLUMN     "proOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUid" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUid_idx" ON "AdminAuditLog"("actorUid");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUid_idx" ON "AdminAuditLog"("targetUid");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
