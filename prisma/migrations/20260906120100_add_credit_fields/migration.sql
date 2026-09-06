-- AlterTable
ALTER TABLE "User" ADD COLUMN "canUseCredit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "creditPaid" BOOLEAN NOT NULL DEFAULT false;
