-- CreateEnum
CREATE TYPE "AttentionRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "tarotistaId" TEXT;

-- CreateTable
CREATE TABLE "AttentionRequest" (
    "id" TEXT NOT NULL,
    "tarotistaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "serviceId" TEXT,
    "preferredTime" TEXT,
    "message" TEXT,
    "status" "AttentionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttentionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttentionRequest_tarotistaId_status_idx" ON "AttentionRequest"("tarotistaId", "status");

-- CreateIndex
CREATE INDEX "Booking_tarotistaId_idx" ON "Booking"("tarotistaId");

-- AddForeignKey
ALTER TABLE "AttentionRequest" ADD CONSTRAINT "AttentionRequest_tarotistaId_fkey" FOREIGN KEY ("tarotistaId") REFERENCES "Tarotista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionRequest" ADD CONSTRAINT "AttentionRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tarotistaId_fkey" FOREIGN KEY ("tarotistaId") REFERENCES "Tarotista"("id") ON DELETE SET NULL ON UPDATE CASCADE;
