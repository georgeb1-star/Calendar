import prisma from '../lib/prisma';
import { PLAN_TOKENS } from '../config/plans';

type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const tokenService = {
  async getTodayRow(locationId: string, tx?: TxClient) {
    const client = tx ?? prisma;
    const date = getTodayDate();

    // Look up plan via location → company → subscription
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { company: { include: { subscription: true } } },
    });
    const sub = location?.company?.subscription;
    const tokensTotal = sub ? (PLAN_TOKENS[sub.plan] ?? 3) : 3;

    return client.locationDailyTokens.upsert({
      where: { locationId_date: { locationId, date } },
      create: { locationId, date, tokensTotal, tokensUsed: 0 },
      update: {},
    });
  },

  async getBalance(locationId: string) {
    const row = await tokenService.getTodayRow(locationId);
    return {
      tokensTotal: row.tokensTotal,
      tokensUsed: row.tokensUsed,
      tokensRemaining: row.tokensTotal - row.tokensUsed,
    };
  },

  async deductTokens(locationId: string, tokenCost: number, tx: TxClient) {
    const date = getTodayDate();

    // Look up plan for the correct tokensTotal
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { company: { include: { subscription: true } } },
    });
    const sub = location?.company?.subscription;
    const tokensTotal = sub ? (PLAN_TOKENS[sub.plan] ?? 3) : 3;

    // Ensure row exists
    await tx.locationDailyTokens.upsert({
      where: { locationId_date: { locationId, date } },
      create: { locationId, date, tokensTotal, tokensUsed: 0 },
      update: {},
    });

    // Lock row and read current values
    const rows = await tx.$queryRaw<Array<{ tokensTotal: number; tokensUsed: number }>>`
      SELECT "tokensTotal", "tokensUsed"
      FROM "LocationDailyTokens"
      WHERE "locationId" = ${locationId} AND "date" = ${date}
      FOR UPDATE
    `;

    if (!rows.length) throw new Error('Token row not found');
    const row = rows[0];
    const remaining = row.tokensTotal - row.tokensUsed;

    if (remaining < tokenCost) {
      throw new Error(
        `Insufficient tokens. ${tokenCost} required, ${remaining.toFixed(2)} remaining.`
      );
    }

    await tx.locationDailyTokens.update({
      where: { locationId_date: { locationId, date } },
      data: { tokensUsed: { increment: tokenCost } },
    });
  },

  // Deducts tokens but floors tokensUsed at tokensTotal (balance never goes below 0).
  // Used when an admin approves an over-limit booking.
  async deductTokensCapped(locationId: string, tokenCost: number, tx: TxClient) {
    if (tokenCost <= 0) return;
    const date = getTodayDate();

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { company: { include: { subscription: true } } },
    });
    const sub = location?.company?.subscription;
    const tokensTotal = sub ? (PLAN_TOKENS[sub.plan] ?? 3) : 3;

    await tx.locationDailyTokens.upsert({
      where: { locationId_date: { locationId, date } },
      create: { locationId, date, tokensTotal, tokensUsed: 0 },
      update: {},
    });

    const rows = await tx.$queryRaw<Array<{ tokensUsed: number; tokensTotal: number }>>`
      SELECT "tokensUsed", "tokensTotal"
      FROM "LocationDailyTokens"
      WHERE "locationId" = ${locationId} AND "date" = ${date}
      FOR UPDATE
    `;

    if (!rows.length) return;
    const newUsed = Math.min(rows[0].tokensUsed + tokenCost, rows[0].tokensTotal);

    await tx.locationDailyTokens.update({
      where: { locationId_date: { locationId, date } },
      data: { tokensUsed: newUsed },
    });
  },

  async refundTokens(locationId: string, tokenCost: number, tx: TxClient) {
    if (tokenCost <= 0) return;
    const date = getTodayDate();

    // Lock row
    const rows = await tx.$queryRaw<Array<{ tokensUsed: number }>>`
      SELECT "tokensUsed"
      FROM "LocationDailyTokens"
      WHERE "locationId" = ${locationId} AND "date" = ${date}
      FOR UPDATE
    `;

    if (!rows.length) return; // No row for today, nothing to refund

    const currentUsed = rows[0].tokensUsed;
    const newUsed = Math.max(0, currentUsed - tokenCost);

    await tx.locationDailyTokens.update({
      where: { locationId_date: { locationId, date } },
      data: { tokensUsed: newUsed },
    });
  },

  async adjustTokens(
    locationId: string,
    oldCost: number,
    newCost: number,
    tx: TxClient
  ) {
    const diff = newCost - oldCost;
    if (diff > 0) {
      await tokenService.deductTokens(locationId, diff, tx);
    } else if (diff < 0) {
      await tokenService.refundTokens(locationId, Math.abs(diff), tx);
    }
  },
};
