-- captureOrderForBooking nunca guardó paymentMethod = 'PAYPAL' en la reserva
-- (bug preexistente, corregido en server/paypal-orders.ts) -- esto rellena
-- las reservas ya pagadas por PayPal antes de la corrección, usando
-- paypalCaptureId como prueba de que sí se capturó un pago real.
UPDATE "Booking" SET "paymentMethod" = 'PAYPAL' WHERE "paypalCaptureId" IS NOT NULL AND "paymentMethod" IS NULL;
