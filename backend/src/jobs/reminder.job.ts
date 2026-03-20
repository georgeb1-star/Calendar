import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { notificationService } from '../services/notification.service';

export function startReminderJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          reminderSentAt: null,
          startTime: { gte: windowStart, lte: windowEnd },
        },
        include: {
          user: true,
          room: true,
        },
      });

      if (bookings.length === 0) return;

      console.log(`[Reminder Job] Sending ${bookings.length} reminder(s)`);

      const secret = process.env.JWT_SECRET || 'secret';

      for (const booking of bookings) {
        const cancelToken = jwt.sign(
          { bookingId: booking.id, userId: booking.userId },
          secret,
          { expiresIn: '8h' }
        );

        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSentAt: now },
        });

        notificationService.sendReminder(booking.user, booking, cancelToken).catch(console.error);
      }
    } catch (err) {
      console.error('[Reminder Job] Error:', err);
    }
  });

  console.log('[Reminder Job] Started — checking every 5 minutes');
}
