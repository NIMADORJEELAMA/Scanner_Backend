/*
  Warnings:

  - You are about to alter the column `amountCard` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amountCash` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amountDue` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amountOnline` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "amountCard" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountCash" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountDue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountOnline" SET DATA TYPE DECIMAL(10,2);
