import cron from 'node-cron';
import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from '../services/notification.service';

const SYSTEM_ACTOR_ID = 'system';

export function startNoShowJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const overdueBookings = await bookingRepository.findActiveBookingsPastCheckInWindow();

      if (overdueBookings.length === 0) return;

      console.log(`[NoShow Job] Processing ${overdueBookings.length} no-show booking(s)`);

      for (const booking of overdueBookings) {
        await bookingRepository.update(booking.id, {
          status: 'NO_SHOW',
          isNoShow: true,
        });

        await bookingRepository.addLog({
          bookingId: booking.id,
          action: 'NO_SHOW',
          actorId: SYSTEM_ACTOR_ID,
          metadata: { detectedAt: new Date().toISOString() },
        });

        // Notify user
        const user = await userRepository.findById(booking.userId);
        if (user) {
          notificationService.sendNoShowAlert({
            userEmail: user.email,
            userName: user.name,
            bookingTitle: booking.title,
            roomName: booking.roomId, // room name not eagerly loaded here
            startTime: booking.startTime,
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error('[NoShow Job] Error:', err);
    }
  });

  console.log('[NoShow Job] Started — checking every 5 minutes');
}
