export type BookingStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  amenities: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  title: string;
  roomId: string;
  room?: Room;
  userId: string;
  companyId: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: BookingStatus;
  checkInTime?: string | null;
  isNoShow: boolean;
  notes?: string | null;
  isPaid: boolean;
  paymentStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingWithDetails extends Booking {
  room: Room;
  user: {
    id: string;
    name: string;
    email: string;
    companyId: string;
  };
  company: {
    id: string;
    name: string;
    color: string;
  };
}

export interface BookingLog {
  id: string;
  bookingId: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}
