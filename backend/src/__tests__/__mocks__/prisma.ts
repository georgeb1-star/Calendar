import { jest } from '@jest/globals';

const mockPrisma = {
  booking: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  bookingInvite: {
    createMany: jest.fn(),
  },
  companyDailyTokens: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  recurringBooking: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  $queryRaw: jest.fn(),
};

export default mockPrisma;
