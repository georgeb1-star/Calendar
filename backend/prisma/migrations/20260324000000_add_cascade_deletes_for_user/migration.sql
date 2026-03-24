-- Add onDelete: Cascade to Booking.userId so deleting a user removes their bookings
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add onDelete: Cascade to RecurringBooking.userId
ALTER TABLE "RecurringBooking" DROP CONSTRAINT IF EXISTS "RecurringBooking_userId_fkey";
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add onDelete: Cascade to BookingLog.bookingId so deleting a booking removes its logs
ALTER TABLE "BookingLog" DROP CONSTRAINT IF EXISTS "BookingLog_bookingId_fkey";
ALTER TABLE "BookingLog" ADD CONSTRAINT "BookingLog_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
