/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "reservation_type" AS ENUM ('LOADING', 'UNLOADING');

-- CreateEnum
CREATE TYPE "recurrence_type" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'USER_REGISTERED';
ALTER TYPE "notification_type" ADD VALUE 'USER_APPROVED';
ALTER TYPE "notification_type" ADD VALUE 'USER_REJECTED';

-- DropForeignKey
ALTER TABLE "gate" DROP CONSTRAINT "gate_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_warehouseId_fkey";

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "canManageSuppliers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gate" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reservation" ADD COLUMN     "recurringReservationId" TEXT,
ADD COLUMN     "type" "reservation_type" NOT NULL DEFAULT 'UNLOADING';

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" DROP COLUMN "warehouseId",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registrationMessage" TEXT;

-- AlterTable
ALTER TABLE "warehouse" ADD COLUMN     "country" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "gate_block" (
    "id" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_reservation" (
    "id" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "reservation_type" NOT NULL DEFAULT 'UNLOADING',
    "recurrenceType" "recurrence_type" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "timeOfDay" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "weekDays" TEXT,
    "dayOfMonth" INTEGER,
    "vehicleType" "vehicle_type" NOT NULL,
    "licensePlate" TEXT,
    "driverName" TEXT,
    "driverContact" TEXT,
    "notes" TEXT,
    "itemsTemplate" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_status_change" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "status" "reservation_status" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "reservation_status_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_advice" (
    "id" TEXT NOT NULL,
    "reservationVersionId" TEXT NOT NULL,
    "adviceNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "reservation_advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_attachment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_warehouse" (
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "user_warehouse_pkey" PRIMARY KEY ("userId","warehouseId")
);

-- CreateIndex
CREATE INDEX "gate_block_gateId_idx" ON "gate_block"("gateId");

-- CreateIndex
CREATE INDEX "gate_block_startTime_endTime_idx" ON "gate_block"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "recurring_reservation_gateId_idx" ON "recurring_reservation"("gateId");

-- CreateIndex
CREATE INDEX "recurring_reservation_isActive_idx" ON "recurring_reservation"("isActive");

-- CreateIndex
CREATE INDEX "reservation_status_change_reservationId_idx" ON "reservation_status_change"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_attachment_reservationId_idx" ON "reservation_attachment"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_recurringReservationId_idx" ON "reservation"("recurringReservationId");

-- AddForeignKey
ALTER TABLE "gate" ADD CONSTRAINT "gate_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_block" ADD CONSTRAINT "gate_block_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_block" ADD CONSTRAINT "gate_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_reservation" ADD CONSTRAINT "recurring_reservation_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_reservation" ADD CONSTRAINT "recurring_reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_reservation" ADD CONSTRAINT "recurring_reservation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_reservation" ADD CONSTRAINT "recurring_reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_recurringReservationId_fkey" FOREIGN KEY ("recurringReservationId") REFERENCES "recurring_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_change" ADD CONSTRAINT "reservation_status_change_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_change" ADD CONSTRAINT "reservation_status_change_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_advice" ADD CONSTRAINT "reservation_advice_reservationVersionId_fkey" FOREIGN KEY ("reservationVersionId") REFERENCES "reservation_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_attachment" ADD CONSTRAINT "reservation_attachment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_attachment" ADD CONSTRAINT "reservation_attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warehouse" ADD CONSTRAINT "user_warehouse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warehouse" ADD CONSTRAINT "user_warehouse_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
