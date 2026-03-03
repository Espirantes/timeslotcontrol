/*
  Warnings:

  - You are about to drop the column `unitType` on the `reservation_item` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `reservation_item` table. All the data in the column will be lost.
  - Added the required column `transportUnitId` to the `reservation_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reservation_item" DROP COLUMN "unitType",
DROP COLUMN "weightKg",
ADD COLUMN     "goodsWeightKg" DECIMAL(10,2),
ADD COLUMN     "transportUnitId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "transport_unit_type";

-- CreateTable
CREATE TABLE "transport_unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "processingMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_unit_name_key" ON "transport_unit"("name");

-- AddForeignKey
ALTER TABLE "reservation_item" ADD CONSTRAINT "reservation_item_transportUnitId_fkey" FOREIGN KEY ("transportUnitId") REFERENCES "transport_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
