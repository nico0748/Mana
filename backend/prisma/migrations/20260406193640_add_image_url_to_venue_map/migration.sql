-- AlterTable
ALTER TABLE "Book" ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VenueMap" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "imageDataUrl" DROP NOT NULL;
