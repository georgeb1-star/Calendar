import { bookingRepository } from '../repositories/booking.repository';

const CHECK_IN_OPEN_MINUTES = 10; // minutes before start
const CHECK_IN_CLOSE_MINUTES = 15; // minutes after start

export const checkinService = {
  async checkIn(bookingId: string, userId: string) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You can only check in to your own bookings');
    }

    if (booking.status !== 'ACTIVE') {
      throw new Error('Can only check in to active bookings');
    }

    if (booking.checkInTime) {
      throw new Error('Already checked in');
    }

    const now = new Date();
    const startTime = booking.startTime;
    const openTime = new Date(startTime.getTime() - CHECK_IN_OPEN_MINUTES * 60 * 1000);
    const closeTime = new Date(startTime.getTime() + CHECK_IN_CLOSE_MINUTES * 60 * 1000);

    if (now < openTime) {
      throw new Error(`Check-in opens ${CHECK_IN_OPEN_MINUTES} minutes before the booking starts`);
    }

    if (now > closeTime) {
      throw new Error('Check-in window has closed');
    }

    const updated = await bookingRepository.update(bookingId, {
      checkInTime: now,
    });

    await bookingRepository.addLog({
      bookingId,
      action: 'CHECKED_IN',
      actorId: userId,
      metadata: { checkInTime: now.toISOString() },
    });

    return updated;
  },
};
