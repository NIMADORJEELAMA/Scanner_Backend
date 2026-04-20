-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_orgId_name_idx" ON "Customer"("orgId", "name");

-- CreateIndex
CREATE INDEX "Customer_orgId_phone_idx" ON "Customer"("orgId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_orgId_key" ON "Customer"("phone", "orgId");
