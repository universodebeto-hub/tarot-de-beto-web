-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paidAt" TIMESTAMP(3);

-- Backfill: para reservas ya pagadas antes de este campo, usamos
-- updatedAt como la mejor aproximación disponible del momento real de pago
-- (no se guardó el timestamp exacto antes de esta migración).
UPDATE "Booking" SET "paidAt" = "updatedAt" WHERE "paymentStatus" = 'PAID' AND "paidAt" IS NULL;

-- AlterTable
ALTER TABLE "PaypalTransaction" ADD COLUMN "paypalFeeAmount" DECIMAL(10,2);
ALTER TABLE "PaypalTransaction" ADD COLUMN "netAmount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "BusinessExpense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessExpense_incurredAt_idx" ON "BusinessExpense"("incurredAt");
