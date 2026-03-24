CREATE TABLE "RoomClosure" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomClosure_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RoomClosure" ADD CONSTRAINT "RoomClosure_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RoomClosure_roomId_date_key" ON "RoomClosure"("roomId", "date");
