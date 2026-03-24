-- Add InviteStatus enum and status field to BookingInvite
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
ALTER TABLE "BookingInvite" ADD COLUMN "status" "InviteStatus" NOT NULL DEFAULT 'PENDING';
