-- CreateTable BlackoutDate
CREATE TABLE "BlackoutDate" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "BlackoutDate_locationId_date_key" ON "BlackoutDate"("locationId", "date");
