-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paypalCaptureId" TEXT,
ADD COLUMN     "paypalOrderId" TEXT;

-- CreateTable
CREATE TABLE "PaypalTransaction" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paypalOrderId" TEXT NOT NULL,
    "paypalCaptureId" TEXT,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaypalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaypalWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaypalWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaypalTransaction_paypalOrderId_key" ON "PaypalTransaction"("paypalOrderId");

-- CreateIndex
CREATE INDEX "PaypalTransaction_bookingId_idx" ON "PaypalTransaction"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PaypalWebhookEvent_eventId_key" ON "PaypalWebhookEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paypalOrderId_key" ON "Booking"("paypalOrderId");

-- AddForeignKey
ALTER TABLE "PaypalTransaction" ADD CONSTRAINT "PaypalTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

