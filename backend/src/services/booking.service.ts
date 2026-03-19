import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { bookingRulesService } from './booking-rules.service';
import { notificationService } from './notification.service';

export const bookingService = {
  async getAllBookings() {
    const bookings = await bookingRepository.findAll();
    // Public visibility: return company name + time, scrub private details for others
    return bookings;
  },

  async getUserBookings(userId: string) {
    return bookingRepository.findByUser(userId);
  },

  async createBooking(data: {
    title: string;
    roomId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    userId: string;
    companyId: string;
    role: 'EMPLOYEE' | 'ADMIN';
  }) {
    const user = await userRepository.findById(data.userId);
    if (!user) throw new Error('User not found');

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const conflict = await bookingRepository.findOverlapping(data.roomId, startTime, endTime);
    if (conflict) {
      throw new Error('This room is already booked during that time. Please choose a different time or room.');
    }

    const { status, durationHours, formattedTitle } = bookingRulesService.validate({
      startTime,
      endTime,
      role: data.role,
      companyName: user.company.name,
      title: data.title,
    });

    const booking = await bookingRepository.create({
      title: formattedTitle,
      roomId: data.roomId,
      userId: data.userId,
      companyId: data.companyId,
      startTime,
      endTime,
      durationHours,
      status,
      notes: data.notes,
    });

    await bookingRepository.addLog({
      bookingId: booking.id,
      action: 'CREATED',
      actorId: data.userId,
      metadata: { status, durationHours },
    });

    notificationService.sendBookingConfirmation({
      userEmail: user.email,
      userName: user.name,
      bookingTitle: formattedTitle,
      roomName: booking.room.name,
      startTime,
      endTime,
      status,
    }).catch(console.error);

    return booking;
  },

  async updateBooking(bookingId: string, data: {
    title?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    requestUserId: string;
    requestUserRole: 'EMPLOYEE' | 'ADMIN';
    requestCompanyId: string;
  }) {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    // Only own booking or admin
    if (existing.userId !== data.requestUserId && data.requestUserRole !== 'ADMIN') {
      throw new Error('Not authorized to edit this booking');
    }

    if (['CANCELLED', 'REJECTED', 'NO_SHOW', 'COMPLETED'].includes(existing.status)) {
      throw new Error('Cannot edit a closed booking');
    }

    const user = await userRepository.findById(existing.userId);
    if (!user) throw new Error('User not found');

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;

    if (data.startTime || data.endTime) {
      const conflict = await bookingRepository.findOverlapping(existing.roomId, startTime, endTime, bookingId);
      if (conflict) {
        throw new Error('This room is already booked during that time. Please choose a different time or room.');
      }
    }

    const rawTitle = data.title
      ? data.title.replace(/^\[.*?\]\s*/, '') // strip existing prefix if re-submitted
      : existing.title.replace(/^\[.*?\]\s*/, '');

    const { status, durationHours, formattedTitle } = bookingRulesService.validate({
      startTime,
      endTime,
      role: data.requestUserRole,
      companyName: user.company.name,
      title: rawTitle,
    });

    const updated = await bookingRepository.update(bookingId, {
      title: formattedTitle,
      startTime,
      endTime,
      durationHours,
      status,
      notes: data.notes,
    });

    await bookingRepository.addLog({
      bookingId,
      action: 'UPDATED',
      actorId: data.requestUserId,
    });

    return updated;
  },

  async cancelBooking(bookingId: string, requestUserId: string, requestUserRole: 'EMPLOYEE' | 'ADMIN') {
    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new Error('Booking not found');

    if (existing.userId !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new Error('Not authorized to cancel this booking');
    }

    if (['CANCELLED', 'REJECTED', 'NO_SHOW', 'COMPLETED'].includes(existing.status)) {
      throw new Error('Booking is already closed');
    }

    const updated = await bookingRepository.update(bookingId, { status: 'CANCELLED' });

    await bookingRepository.addLog({
      bookingId,
      action: 'CANCELLED',
      actorId: requestUserId,
    });

    return updated;
  },

  async approveBooking(bookingId: string, adminId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'PENDING_APPROVAL') throw new Error('Booking is not pending approval');

    const updated = await bookingRepository.update(bookingId, { status: 'ACTIVE' });

    await bookingRepository.addLog({
      bookingId,
      action: 'APPROVED',
      actorId: adminId,
    });

    const user = await userRepository.findById(booking.userId);
    if (user) {
      notificationService.sendApprovalNotification({
        userEmail: user.email,
        userName: user.name,
        bookingTitle: booking.title,
        approved: true,
      }).catch(console.error);
    }

    return updated;
  },

  async rejectBooking(bookingId: string, adminId: string, reason?: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'PENDING_APPROVAL') throw new Error('Booking is not pending approval');

    const updated = await bookingRepository.update(bookingId, { status: 'REJECTED' });

    await bookingRepository.addLog({
      bookingId,
      action: 'REJECTED',
      actorId: adminId,
      metadata: reason ? { reason } : undefined,
    });

    const user = await userRepository.findById(booking.userId);
    if (user) {
      notificationService.sendApprovalNotification({
        userEmail: user.email,
        userName: user.name,
        bookingTitle: booking.title,
        approved: false,
        reason,
      }).catch(console.error);
    }

    return updated;
  },

  getPendingBookings() {
    return bookingRepository.findPending();
  },
};
