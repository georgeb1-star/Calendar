import { BookingStatus } from '@prisma/client';

const MAX_ADVANCE_DAYS = 7;
const EMPLOYEE_MAX_HOURS = 3;

export interface BookingValidationInput {
  startTime: Date;
  endTime: Date;
  role: 'EMPLOYEE' | 'ADMIN';
  companyName: string;
  title: string;
}

export interface BookingValidationResult {
  status: BookingStatus;
  durationHours: number;
  formattedTitle: string;
}

export const bookingRulesService = {
  validate(input: BookingValidationInput): BookingValidationResult {
    const now = new Date();
    const { startTime, endTime, role, companyName, title } = input;

    // No past bookings
    if (startTime <= now) {
      throw new Error('Booking must be in the future');
    }

    // 7-day advance limit
    const maxAdvance = new Date(now.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
    if (startTime > maxAdvance) {
      throw new Error('Bookings cannot be made more than 7 days in advance');
    }

    // End must be after start
    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 0) {
      throw new Error('Booking duration must be positive');
    }

    // Max duration: 8 hours total cap
    if (durationHours > 8) {
      throw new Error('Booking cannot exceed 8 hours');
    }

    // Determine status
    let status: BookingStatus;
    if (role === 'ADMIN' || durationHours <= EMPLOYEE_MAX_HOURS) {
      status = 'ACTIVE';
    } else {
      status = 'PENDING_APPROVAL';
    }

    // Format title with company prefix
    const formattedTitle = `[${companyName}] ${title}`;

    return { status, durationHours, formattedTitle };
  },
};
