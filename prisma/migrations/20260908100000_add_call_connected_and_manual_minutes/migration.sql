-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN "connectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "manualMinutesAdjustment" INTEGER NOT NULL DEFAULT 0;
