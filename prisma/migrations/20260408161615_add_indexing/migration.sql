/*
  Warnings:

  - A unique constraint covering the columns `[id,orgId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_id_orgId_key" ON "Product"("id", "orgId");
