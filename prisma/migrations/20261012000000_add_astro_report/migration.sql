-- Solo agrega una tabla nueva: no modifica ni borra nada existente.
CREATE TABLE "AstroReport" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "input" JSONB,
    "place" JSONB,
    "placeWarnings" JSONB,
    "chartJson" JSONB,
    "sections" JSONB,
    "usage" JSONB,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstroReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AstroReport_bookingId_key" ON "AstroReport"("bookingId");
CREATE INDEX "AstroReport_status_idx" ON "AstroReport"("status");

ALTER TABLE "AstroReport" ADD CONSTRAINT "AstroReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
