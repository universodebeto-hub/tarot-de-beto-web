-- AlterTable
ALTER TABLE "User" ADD COLUMN "minutesBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "clientNotes" TEXT;

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN "walletClientId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "walletTarotistaId" TEXT;
