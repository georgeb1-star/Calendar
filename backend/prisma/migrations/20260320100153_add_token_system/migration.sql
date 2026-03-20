-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "tokenCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanyDailyTokens" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "tokensTotal" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "tokensUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDailyTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDailyTokens_companyId_date_key" ON "CompanyDailyTokens"("companyId", "date");

-- AddForeignKey
ALTER TABLE "CompanyDailyTokens" ADD CONSTRAINT "CompanyDailyTokens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
