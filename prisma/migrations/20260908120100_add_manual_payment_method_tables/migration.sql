-- CreateTable
CREATE TABLE "ManualPaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodLogo" (
    "method" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,

    CONSTRAINT "PaymentMethodLogo_pkey" PRIMARY KEY ("method")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "manualPaymentMethodId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "manualPaymentMethodLabel" TEXT;
