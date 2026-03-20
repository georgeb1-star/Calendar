import { checkinService } from '../services/checkin.service';
import { bookingRepository } from '../repositories/booking.repository';

jest.mock('../repositories/booking.repository');
jest.mock('../repositories/user.repository');

const mockRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;

function makeBooking(overrides: Partial<any> = {}): any {
  const startTime = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
  return {
    id: 'booking-1',
    userId: 'user-1',
    status: 'ACTIVE',
    checkInTime: null,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
    ...overrides,
  };
}

describe('checkinService.checkIn', () => {
  beforeEach(() => {
    mockRepo.update.mockResolvedValue({ id: 'booking-1' } as any);
    mockRepo.addLog.mockResolvedValue({} as any);
  });

  test('throws if booking not found', async () => {
    mockRepo.findById.mockResolvedValue(null as any);
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('Booking not found');
  });

  test('throws if user does not own booking', async () => {
    mockRepo.findById.mockResolvedValue(makeBooking({ userId: 'other-user' }));
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('own bookings');
  });

  test('throws if booking is not ACTIVE', async () => {
    mockRepo.findById.mockResolvedValue(makeBooking({ status: 'CANCELLED' }));
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('active bookings');
  });

  test('throws if already checked in', async () => {
    mockRepo.findById.mockResolvedValue(makeBooking({ checkInTime: new Date() }));
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('Already checked in');
  });

  test('throws if check-in window has not opened (>10 min before start)', async () => {
    const startTime = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('10 minutes before');
  });

  test('throws if check-in window has closed (>15 min after start)', async () => {
    const startTime = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await expect(checkinService.checkIn('booking-1', 'user-1'))
      .rejects.toThrow('window has closed');
  });

  test('succeeds when checked in within window (at start time)', async () => {
    const startTime = new Date(); // exactly now = within [−10, +15] window
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await expect(checkinService.checkIn('booking-1', 'user-1')).resolves.not.toThrow();
    expect(mockRepo.update).toHaveBeenCalledWith('booking-1', expect.objectContaining({ checkInTime: expect.any(Date) }));
  });

  test('succeeds when checked in 9 min before start (just inside window)', async () => {
    const startTime = new Date(Date.now() + 9 * 60 * 1000);
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await expect(checkinService.checkIn('booking-1', 'user-1')).resolves.not.toThrow();
  });

  test('succeeds when checked in 14 min after start (just inside close)', async () => {
    const startTime = new Date(Date.now() - 14 * 60 * 1000);
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await expect(checkinService.checkIn('booking-1', 'user-1')).resolves.not.toThrow();
  });

  test('creates an audit log on successful check-in', async () => {
    const startTime = new Date();
    mockRepo.findById.mockResolvedValue(makeBooking({ startTime }));
    await checkinService.checkIn('booking-1', 'user-1');
    expect(mockRepo.addLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CHECKED_IN', actorId: 'user-1' })
    );
  });
});
