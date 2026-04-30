-- AlterTable
ALTER TABLE "CircleItem" ADD COLUMN     "onlineStatus" TEXT NOT NULL DEFAULT 'unchecked';
ALTER TABLE "CircleItem" ADD COLUMN     "addedToLibraryBookId" TEXT;
