/**
 * Token service tests.
 * We mock the prisma singleton so no real DB is required.
 */

// Must be first — jest.mock is hoisted
jest.mock('../lib/prisma');

import prisma from '../lib/prisma';
import { tokenService } from '../services/token.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper: build a minimal tx-like client (same shape as mockPrisma)
function makeTx() {
  return mockPrisma as any;
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

describe('tokenService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no subscription → 3 tokens
    (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
  });

  // ─── getBalance ───────────────────────────────────────────────────────────

  describe('getBalance', () => {
    test('returns correct balance from today row', async () => {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({
        tokensTotal: 3,
        tokensUsed: 1,
      });
      const balance = await tokenService.getBalance('company-1');
      expect(balance).toEqual({ tokensTotal: 3, tokensUsed: 1, tokensRemaining: 2 });
    });

    test('shows zero remaining when all tokens used', async () => {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({
        tokensTotal: 3,
        tokensUsed: 3,
      });
      const balance = await tokenService.getBalance('company-1');
      expect(balance.tokensRemaining).toBe(0);
    });

    test('handles fractional token usage', async () => {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({
        tokensTotal: 3,
        tokensUsed: 1.5,
      });
      const balance = await tokenService.getBalance('company-1');
      expect(balance.tokensRemaining).toBeCloseTo(1.5);
    });
  });

  // ─── deductTokens ─────────────────────────────────────────────────────────

  describe('deductTokens', () => {
    function setupDeduct(tokensTotal: number, tokensUsed: number) {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({});
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ tokensTotal, tokensUsed }]);
      (mockPrisma.companyDailyTokens.update as jest.Mock).mockResolvedValue({});
    }

    test('deducts tokens when sufficient balance exists', async () => {
      setupDeduct(3, 0);
      await tokenService.deductTokens('company-1', 1, makeTx());
      expect(mockPrisma.companyDailyTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokensUsed: { increment: 1 } } })
      );
    });

    test('throws when insufficient tokens', async () => {
      setupDeduct(3, 2.5);
      await expect(tokenService.deductTokens('company-1', 1, makeTx()))
        .rejects.toThrow('Insufficient tokens');
    });

    test('allows deducting exact remaining balance', async () => {
      setupDeduct(3, 2);
      await expect(tokenService.deductTokens('company-1', 1, makeTx())).resolves.not.toThrow();
    });

    test('throws when attempting to deduct 0 tokens from empty balance', async () => {
      setupDeduct(3, 3);
      // Deducting 0 should not throw (0 <= 0 remaining = 0)
      await expect(tokenService.deductTokens('company-1', 0, makeTx())).resolves.not.toThrow();
    });

    test('throws if token row not found', async () => {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({});
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      await expect(tokenService.deductTokens('company-1', 1, makeTx()))
        .rejects.toThrow('Token row not found');
    });
  });

  // ─── refundTokens ─────────────────────────────────────────────────────────

  describe('refundTokens', () => {
    test('refunds tokens correctly', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ tokensUsed: 2 }]);
      (mockPrisma.companyDailyTokens.update as jest.Mock).mockResolvedValue({});
      await tokenService.refundTokens('company-1', 1, makeTx());
      expect(mockPrisma.companyDailyTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokensUsed: 1 } })
      );
    });

    test('clamps refund at zero (cannot go negative)', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ tokensUsed: 0.5 }]);
      (mockPrisma.companyDailyTokens.update as jest.Mock).mockResolvedValue({});
      await tokenService.refundTokens('company-1', 2, makeTx());
      expect(mockPrisma.companyDailyTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokensUsed: 0 } })
      );
    });

    test('skips refund if tokenCost is 0', async () => {
      await tokenService.refundTokens('company-1', 0, makeTx());
      expect(mockPrisma.companyDailyTokens.update).not.toHaveBeenCalled();
    });

    test('silently skips if no row exists for today (e.g. booking was yesterday)', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      await expect(tokenService.refundTokens('company-1', 1, makeTx())).resolves.not.toThrow();
    });
  });

  // ─── adjustTokens ─────────────────────────────────────────────────────────

  describe('adjustTokens', () => {
    test('deducts when new cost is higher', async () => {
      (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({});
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ tokensTotal: 5, tokensUsed: 1 }]);
      (mockPrisma.companyDailyTokens.update as jest.Mock).mockResolvedValue({});
      await tokenService.adjustTokens('company-1', 1, 2, makeTx());
      expect(mockPrisma.companyDailyTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokensUsed: { increment: 1 } } })
      );
    });

    test('refunds when new cost is lower', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ tokensUsed: 2 }]);
      (mockPrisma.companyDailyTokens.update as jest.Mock).mockResolvedValue({});
      await tokenService.adjustTokens('company-1', 2, 1, makeTx());
      expect(mockPrisma.companyDailyTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tokensUsed: 1 } })
      );
    });

    test('does nothing when cost is unchanged', async () => {
      await tokenService.adjustTokens('company-1', 1.5, 1.5, makeTx());
      expect(mockPrisma.companyDailyTokens.update).not.toHaveBeenCalled();
    });
  });
});
