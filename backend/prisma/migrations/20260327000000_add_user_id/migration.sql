-- Add userId to all user-owned tables (nullable for backward compatibility)
ALTER TABLE "Book"         ADD COLUMN "userId" TEXT;
ALTER TABLE "DoujinEvent"  ADD COLUMN "userId" TEXT;
ALTER TABLE "Circle"       ADD COLUMN "userId" TEXT;
ALTER TABLE "VenueMap"     ADD COLUMN "userId" TEXT;
ALTER TABLE "Distribution" ADD COLUMN "userId" TEXT;
