/*
  Warnings:

  - You are about to alter the column `amountCard` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `amountCash` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `amountDue` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `amountOnline` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "amountCard" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "amountCash" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "amountDue" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "amountOnline" SET DATA TYPE DOUBLE PRECISION;
