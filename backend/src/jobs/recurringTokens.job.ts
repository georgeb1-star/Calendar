import cron from 'node-cron';
import prisma from '../lib/prisma';
import { tokenService } from '../services/token.service';
import { notificationService } from '../services/notification.service';

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function startRecurringTokensJob() {
  cron.schedule('0 6 * * *', async () => {
    try {
      const { start, end } = getTodayRange();

      const bookings = await prisma.booking.findMany({
        where: {
          isPaid: false,
          status: 'ACTIVE',
          recurringId: { not: null },
          startTime: { gte: start, lte: end },
        },
        include: {
          user: true,
        },
      });

      if (bookings.length === 0) return;

      console.log(`[RecurringTokens Job] Processing ${bookings.length} booking(s)`);

      for (const booking of bookings) {
        try {
          await prisma.$transaction(async (tx) => {
            await tokenService.deductTokens(booking.companyId, booking.tokenCost, tx);
            await tx.booking.update({
              where: { id: booking.id },
              data: { isPaid: true },
            });
          });
        } catch (err) {
          console.error(`[RecurringTokens Job] Failed to deduct for booking ${booking.id}:`, err);
          // Notify the user about the failure
          notificationService.sendTokenDeductionFailed(booking.user, booking).catch(console.error);
        }
      }
    } catch (err) {
      console.error('[RecurringTokens Job] Error:', err);
    }
  });

  console.log('[RecurringTokens Job] Started — runs daily at 06:00');
}
