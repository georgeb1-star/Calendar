import { bookingRulesService } from '../services/booking-rules.service';

function future(offsetMinutes: number): Date {
  return new Date(Date.now() + offsetMinutes * 60 * 1000);
}

function futureDate(offsetDays: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('bookingRulesService.validate', () => {
  const base = {
    role: 'EMPLOYEE' as const,
    locationName: 'Acme',
    title: 'Standup',
  };

  // ─── Time validation ────────────────────────────────────────────────────

  test('rejects a booking in the past', () => {
    expect(() =>
      bookingRulesService.validate({
        ...base,
        startTime: future(-60),
        endTime: future(-30),
      })
    ).toThrow('future');
  });

  test('rejects a booking starting exactly now (boundary)', () => {
    // startTime <= now should throw
    const now = new Date();
    expect(() =>
      bookingRulesService.validate({
        ...base,
        startTime: now,
        endTime: future(60),
      })
    ).toThrow('future');
  });

  test('rejects when end time is before start time', () => {
    expect(() =>
      bookingRulesService.validate({
        ...base,
        startTime: future(60),
        endTime: future(30),
      })
    ).toThrow('End time must be after start time');
  });

  test('rejects when start and end are identical', () => {
    const t = future(60);
    expect(() =>
      bookingRulesService.validate({ ...base, startTime: t, endTime: t })
    ).toThrow('End time must be after start time');
  });

  // ─── Advance booking limit ───────────────────────────────────────────────

  test('rejects booking more than 7 days in advance', () => {
    expect(() =>
      bookingRulesService.validate({
        ...base,
        startTime: futureDate(8),
        endTime: futureDate(8, 11),
      })
    ).toThrow('7 days');
  });

  test('accepts booking exactly 7 days in advance', () => {
    // 7 days = exactly at boundary — should pass
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 60000); // 1 min under
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    expect(() =>
      bookingRulesService.validate({ ...base, startTime: start, endTime: end })
    ).not.toThrow();
  });

  // ─── Duration cap ────────────────────────────────────────────────────────

  test('rejects booking exceeding 8 hours', () => {
    const start = futureDate(1, 8);
    const end = new Date(start.getTime() + 9 * 60 * 60 * 1000);
    expect(() =>
      bookingRulesService.validate({ ...base, startTime: start, endTime: end })
    ).toThrow('8 hours');
  });

  test('accepts booking of exactly 8 hours', () => {
    const start = futureDate(1, 8);
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
    expect(() =>
      bookingRulesService.validate({ ...base, startTime: start, endTime: end })
    ).not.toThrow();
  });

  // ─── Status assignment ───────────────────────────────────────────────────

  test('EMPLOYEE booking ≤3h gets ACTIVE status', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const result = bookingRulesService.validate({ ...base, startTime: start, endTime: end });
    expect(result.status).toBe('ACTIVE');
  });

  test('EMPLOYEE booking exactly 3h gets ACTIVE status (boundary)', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const result = bookingRulesService.validate({ ...base, startTime: start, endTime: end });
    expect(result.status).toBe('ACTIVE');
  });

  test('EMPLOYEE booking >3h gets PENDING_APPROVAL status', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000 + 1); // 1ms over
    const result = bookingRulesService.validate({ ...base, startTime: start, endTime: end });
    expect(result.status).toBe('PENDING_APPROVAL');
  });

  test('ADMIN booking >3h gets ACTIVE status (no approval needed)', () => {
    const start = futureDate(1, 9);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const result = bookingRulesService.validate({
      ...base,
      role: 'ADMIN',
      startTime: start,
      endTime: end,
    });
    expect(result.status).toBe('ACTIVE');
  });

  test('COMPANY_ADMIN booking >3h gets PENDING_APPROVAL (same as EMPLOYEE)', () => {
    const start = futureDate(1, 9);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const result = bookingRulesService.validate({
      ...base,
      role: 'COMPANY_ADMIN',
      startTime: start,
      endTime: end,
    });
    expect(result.status).toBe('PENDING_APPROVAL');
  });

  // ─── Title formatting ────────────────────────────────────────────────────

  test('prepends company name to title', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const result = bookingRulesService.validate({
      ...base,
      locationName: 'Townhouse',
      title: 'Weekly Sync',
      startTime: start,
      endTime: end,
    });
    expect(result.formattedTitle).toBe('[Townhouse] Weekly Sync');
  });

  // ─── Duration calculation ────────────────────────────────────────────────

  test('correctly calculates durationHours for 1.5h booking', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    const result = bookingRulesService.validate({ ...base, startTime: start, endTime: end });
    expect(result.durationHours).toBeCloseTo(1.5);
  });

  test('correctly calculates durationHours for 30min booking', () => {
    const start = futureDate(1, 10);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const result = bookingRulesService.validate({ ...base, startTime: start, endTime: end });
    expect(result.durationHours).toBeCloseTo(0.5);
  });
});
