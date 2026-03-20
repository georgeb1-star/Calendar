import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
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
  async getTodayRow(companyId: string, tx?: TxClient) {
    const client = tx ?? prisma;
    const date = getTodayDate();
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    const tokensTotal = sub ? (PLAN_TOKENS[sub.plan] ?? 3) : 3;
    return client.companyDailyTokens.upsert({
      where: { companyId_date: { companyId, date } },
      create: { companyId, date, tokensTotal, tokensUsed: 0 },
      update: {},
    });
  },

  async getBalance(companyId: string) {
    const row = await tokenService.getTodayRow(companyId);
    return {
      tokensTotal: row.tokensTotal,
      tokensUsed: row.tokensUsed,
      tokensRemaining: row.tokensTotal - row.tokensUsed,
    };
  },

  async deductTokens(companyId: string, tokenCost: number, tx: TxClient) {
    const date = getTodayDate();

    // Ensure row exists
    await tx.companyDailyTokens.upsert({
      where: { companyId_date: { companyId, date } },
      create: { companyId, date, tokensTotal: 3, tokensUsed: 0 },
      update: {},
    });

    // Lock row and read current values
    const rows = await tx.$queryRaw<Array<{ tokensTotal: number; tokensUsed: number }>>`
      SELECT "tokensTotal", "tokensUsed"
      FROM "CompanyDailyTokens"
      WHERE "companyId" = ${companyId} AND "date" = ${date}
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

    await tx.companyDailyTokens.update({
      where: { companyId_date: { companyId, date } },
      data: { tokensUsed: { increment: tokenCost } },
    });
  },

  async refundTokens(companyId: string, tokenCost: number, tx: TxClient) {
    if (tokenCost <= 0) return;
    const date = getTodayDate();

    // Lock row
    const rows = await tx.$queryRaw<Array<{ tokensUsed: number }>>`
      SELECT "tokensUsed"
      FROM "CompanyDailyTokens"
      WHERE "companyId" = ${companyId} AND "date" = ${date}
      FOR UPDATE
    `;

    if (!rows.length) return; // No row for today, nothing to refund

    const currentUsed = rows[0].tokensUsed;
    const newUsed = Math.max(0, currentUsed - tokenCost);

    await tx.companyDailyTokens.update({
      where: { companyId_date: { companyId, date } },
      data: { tokensUsed: newUsed },
    });
  },

  async adjustTokens(
    companyId: string,
    oldCost: number,
    newCost: number,
    tx: TxClient
  ) {
    const diff = newCost - oldCost;
    if (diff > 0) {
      await tokenService.deductTokens(companyId, diff, tx);
    } else if (diff < 0) {
      await tokenService.refundTokens(companyId, Math.abs(diff), tx);
    }
  },
};
