-- CreateEnum
CREATE TYPE "TarotistaStatus" AS ENUM ('DISPONIBLE', 'EN_CONSULTA', 'EN_REPOSO', 'DESCONECTADO');

-- CreateTable
CREATE TABLE "Tarotista" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" TEXT,
    "status" "TarotistaStatus" NOT NULL DEFAULT 'DESCONECTADO',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarotista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tarotista_slug_key" ON "Tarotista"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tarotista_userId_key" ON "Tarotista"("userId");

-- CreateIndex
CREATE INDEX "Tarotista_active_sortOrder_idx" ON "Tarotista"("active", "sortOrder");

-- AddForeignKey
ALTER TABLE "Tarotista" ADD CONSTRAINT "Tarotista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
