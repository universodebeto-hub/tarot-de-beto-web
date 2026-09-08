-- Permite crear cuentas de cliente "sin reclamar" (creadas por el admin a
-- mano desde una reserva de invitado, sin contraseña propia todavía).
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
