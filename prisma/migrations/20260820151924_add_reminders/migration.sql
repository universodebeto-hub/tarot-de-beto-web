-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "remindersSentHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

