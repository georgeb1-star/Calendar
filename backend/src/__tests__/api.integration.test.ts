/**
 * API integration tests (supertest).
 * These mount the real Express app, mock all external I/O, and test HTTP
 * request/response contracts — status codes, response shapes, auth guards.
 */

jest.mock('../lib/prisma');
jest.mock('../repositories/booking.repository');
jest.mock('../repositories/user.repository');
jest.mock('../services/notification.service');
jest.mock('../services/token.service');
jest.mock('../services/checkin.service');
jest.mock('../jobs/noshow.job', () => ({ startNoShowJob: jest.fn() }));
jest.mock('../jobs/reminder.job', () => ({ startReminderJob: jest.fn() }));
jest.mock('../jobs/recurringTokens.job', () => ({ startRecurringTokensJob: jest.fn() }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../lib/prisma';
import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { tokenService } from '../services/token.service';
import { notificationService } from '../services/notification.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockTokenService = tokenService as jest.Mocked<typeof tokenService>;
const mockNotification = notificationService as jest.Mocked<typeof notificationService>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret'; // matches setup.ts → process.env.JWT_SECRET

function makeToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    { userId: 'user-1', companyId: 'company-1', role: 'EMPLOYEE', email: 'alice@acme.com', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function adminToken() {
  return makeToken({ userId: 'admin-1', role: 'ADMIN' });
}

function futureDate(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000);
}

const baseUser = {
  id: 'user-1', name: 'Alice', email: 'alice@acme.com',
  status: 'ACTIVE', companyId: 'company-1', role: 'EMPLOYEE',
  company: { id: 'company-1', name: 'Acme', color: '#000' },
} as any;

const baseBooking = {
  id: 'booking-1', title: '[Acme] Standup', roomId: 'room-1',
  userId: 'user-1', companyId: 'company-1',
  startTime: futureDate(60), endTime: futureDate(120),
  status: 'ACTIVE', tokenCost: 1, isPaid: true,
  room: { id: 'room-1', name: 'Room 1' },
  user: { id: 'user-1', name: 'Alice', email: 'alice@acme.com', companyId: 'company-1' },
  company: { id: 'company-1', name: 'Acme', color: '#000' },
} as any;

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRepo.findById.mockResolvedValue(baseUser);
  (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
  (mockPrisma.booking.create as jest.Mock).mockResolvedValue(baseBooking);
  (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([baseBooking]);
  (mockPrisma.booking.update as jest.Mock).mockResolvedValue({ ...baseBooking, status: 'CANCELLED' });
  (mockPrisma.bookingLog.create as jest.Mock).mockResolvedValue({});
  (mockPrisma.bookingInvite.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockPrisma));
  mockTokenService.deductTokens.mockResolvedValue(undefined);
  mockTokenService.refundTokens.mockResolvedValue(undefined);
  mockTokenService.adjustTokens.mockResolvedValue(undefined);
  mockTokenService.getBalance.mockResolvedValue({ tokensTotal: 3, tokensUsed: 1, tokensRemaining: 2 });
  mockBookingRepo.findAll.mockResolvedValue([baseBooking]);
  mockBookingRepo.findByUser.mockResolvedValue([baseBooking]);
  mockBookingRepo.findById.mockResolvedValue(baseBooking);
  mockBookingRepo.update.mockResolvedValue(baseBooking);
  mockBookingRepo.addLog.mockResolvedValue({} as any);
  mockNotification.sendBookingConfirmation.mockResolvedValue(undefined as any);
  mockNotification.sendApprovalNotification.mockResolvedValue(undefined as any);
  (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({ tokensTotal: 3, tokensUsed: 1 });
});

// ─── Health check ─────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('Auth guard', () => {
  test('GET /api/bookings/mine → 401 without token', async () => {
    const res = await request(app).get('/api/bookings/mine');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/No token/i);
  });

  test('GET /api/bookings/mine → 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid/i);
  });

  test('GET /api/bookings/mine → 401 with malformed header', async () => {
    const res = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', makeToken()); // missing "Bearer " prefix
    expect(res.status).toBe(401);
  });

  test('GET /api/bookings/mine → 200 with valid token', async () => {
    (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([baseBooking]);
    const res = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/bookings/mine ───────────────────────────────────────────────────

describe('GET /api/bookings/mine', () => {
  test('returns user bookings array', async () => {
    (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([baseBooking]);
    const res = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('booking-1');
  });
});

// ─── GET /api/bookings/invited ────────────────────────────────────────────────

describe('GET /api/bookings/invited', () => {
  test('returns invited bookings', async () => {
    (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([{ ...baseBooking, id: 'invite-booking' }]);
    const res = await request(app)
      .get('/api/bookings/invited')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('invite-booking');
  });
});

// ─── GET /api/bookings/colleagues ─────────────────────────────────────────────

describe('GET /api/bookings/colleagues', () => {
  test('returns active colleagues excluding self', async () => {
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'user-2', name: 'Bob', email: 'bob@acme.com' },
    ]);
    const res = await request(app)
      .get('/api/bookings/colleagues')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('user-2');
  });
});

// ─── GET /api/bookings/token-balance ──────────────────────────────────────────

describe('GET /api/bookings/token-balance', () => {
  test('returns token balance shape', async () => {
    (mockPrisma.companyDailyTokens.upsert as jest.Mock).mockResolvedValue({ tokensTotal: 3, tokensUsed: 1 });
    const res = await request(app)
      .get('/api/bookings/token-balance')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tokensTotal: 3, tokensUsed: 1, tokensRemaining: 2 });
  });
});

// ─── POST /api/bookings ───────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  const createPayload = {
    title: 'Standup',
    roomId: 'room-1',
    startTime: futureDate(60).toISOString(),
    endTime: futureDate(120).toISOString(),
  };

  test('creates a booking and returns 201', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(createPayload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('booking-1');
  });

  test('returns 409 when room already booked', async () => {
    (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(baseBooking);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(createPayload);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already booked/i);
  });

  test('returns 400 when booking spans midnight', async () => {
    const start = new Date();
    start.setHours(23, 0, 0, 0);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(1, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...createPayload, startTime: start.toISOString(), endTime: end.toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/same calendar day/i);
  });

  test('returns 403 when user account is PENDING', async () => {
    mockUserRepo.findById.mockResolvedValue({ ...baseUser, status: 'PENDING' });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(createPayload);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending approval/i);
  });

  test('returns 400 when booking more than 7 days ahead', async () => {
    const farFuture = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const farEnd = new Date(farFuture.getTime() + 60 * 60 * 1000);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...createPayload, startTime: farFuture.toISOString(), endTime: farEnd.toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/7 days/i);
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).post('/api/bookings').send(createPayload);
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/bookings/:id ────────────────────────────────────────────────

describe('DELETE /api/bookings/:id', () => {
  beforeEach(() => {
    mockBookingRepo.findById.mockResolvedValue(baseBooking);
  });

  test('cancels own booking and returns 200', async () => {
    const res = await request(app)
      .delete('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });

  test('returns 403 when cancelling another user\'s booking', async () => {
    const res = await request(app)
      .delete('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${makeToken({ userId: 'user-99' })}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not authorized/i);
  });

  test('ADMIN can cancel any booking', async () => {
    const res = await request(app)
      .delete('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 if booking not found', async () => {
    mockBookingRepo.findById.mockResolvedValue(null as any);
    const res = await request(app)
      .delete('/api/bookings/nonexistent')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/bookings/:id ────────────────────────────────────────────────────

describe('PUT /api/bookings/:id', () => {
  beforeEach(() => {
    mockBookingRepo.findById.mockResolvedValue(baseBooking);
    (mockPrisma.booking.update as jest.Mock).mockResolvedValue(baseBooking);
    mockTokenService.adjustTokens.mockResolvedValue(undefined);
  });

  test('owner can update title and gets 200', async () => {
    const res = await request(app)
      .put('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
  });

  test('returns 403 when non-owner tries to update', async () => {
    const res = await request(app)
      .put('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${makeToken({ userId: 'user-99' })}`)
      .send({ title: 'Hack' });
    expect(res.status).toBe(403);
  });

  test('returns 409 when new time slot conflicts', async () => {
    (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({ id: 'conflict' });
    const res = await request(app)
      .put('/api/bookings/booking-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        startTime: futureDate(90).toISOString(),
        endTime: futureDate(150).toISOString(),
      });
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/bookings/cancel-from-email ─────────────────────────────────────

describe('POST /api/bookings/cancel-from-email', () => {
  test('cancels booking with valid JWT token', async () => {
    mockBookingRepo.findById.mockResolvedValue(baseBooking);
    const cancelToken = jwt.sign({ bookingId: 'booking-1', userId: 'user-1' }, JWT_SECRET, { expiresIn: '8h' });

    const res = await request(app)
      .post('/api/bookings/cancel-from-email')
      .send({ token: cancelToken });
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(true);
  });

  test('returns 401 with invalid/expired token', async () => {
    const res = await request(app)
      .post('/api/bookings/cancel-from-email')
      .send({ token: 'not-a-valid-jwt' });
    expect(res.status).toBe(401);
  });

  test('returns 400 with no token body', async () => {
    const res = await request(app)
      .post('/api/bookings/cancel-from-email')
      .send({});
    expect(res.status).toBe(400);
  });

  test('does not require Authorization header (public endpoint)', async () => {
    mockBookingRepo.findById.mockResolvedValue(baseBooking);
    const cancelToken = jwt.sign({ bookingId: 'booking-1', userId: 'user-1' }, JWT_SECRET, { expiresIn: '8h' });
    // No Authorization header
    const res = await request(app)
      .post('/api/bookings/cancel-from-email')
      .send({ token: cancelToken });
    expect(res.status).not.toBe(401);
  });
});

// ─── POST /api/bookings/:id/checkin ──────────────────────────────────────────

describe('POST /api/bookings/:id/checkin', () => {
  test('check-in succeeds for own booking', async () => {
    const { checkinService } = require('../services/checkin.service');
    (checkinService.checkIn as jest.Mock).mockResolvedValue({ id: 'booking-1', checkInTime: new Date() });

    const res = await request(app)
      .post('/api/bookings/booking-1/checkin')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });

  test('check-in outside window returns 400', async () => {
    const { checkinService } = require('../services/checkin.service');
    (checkinService.checkIn as jest.Mock).mockRejectedValue(new Error('10 minutes before'));

    const res = await request(app)
      .post('/api/bookings/booking-1/checkin')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/10 minutes before/i);
  });
});

// ─── GET /api/bookings (admin list) ──────────────────────────────────────────

describe('GET /api/bookings', () => {
  test('returns all bookings for ADMIN', async () => {
    (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([baseBooking]);
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
