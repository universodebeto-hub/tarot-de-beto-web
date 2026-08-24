-- Reemplaza el índice único parcial anterior (serviceId, startsAt) — que no
-- evitaba solapamientos entre reservas de servicios DISTINTOS — por un
-- EXCLUDE constraint de Postgres basado en solapamiento real de rangos de
-- tiempo. Alberto es el único proveedor: dos reservas activas
-- (PENDING_PAYMENT/CONFIRMED) nunca pueden solaparse en el tiempo, sin
-- importar el servicio.

-- Habilita el operador de rango necesario para el EXCLUDE constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP INDEX IF EXISTS "Booking_active_slot_unique";

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap_active"
  EXCLUDE USING gist (
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED'));
