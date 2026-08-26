-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYPAL', 'PAGO_MOVIL', 'ZELLE', 'BINANCE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "manualPaymentProofUrl" TEXT,
ADD COLUMN     "manualPaymentReference" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod";
