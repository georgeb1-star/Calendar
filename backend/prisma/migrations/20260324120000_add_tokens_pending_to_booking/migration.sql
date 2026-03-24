-- Add tokensPending flag to Booking
-- true  = booking created with insufficient tokens, tokens not yet deducted, deduct on approval
-- false = tokens already deducted at creation time (normal flow)
ALTER TABLE "Booking" ADD COLUMN "tokensPending" BOOLEAN NOT NULL DEFAULT false;
