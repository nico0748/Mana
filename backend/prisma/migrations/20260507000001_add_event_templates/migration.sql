-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT,
    "venueMaps" JSONB NOT NULL,
    "submittedByUid" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedByUid" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTemplate_status_createdAt_idx" ON "EventTemplate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EventTemplate_submittedByUid_idx" ON "EventTemplate"("submittedByUid");
