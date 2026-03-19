export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    company: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export interface CreateBookingRequest {
  title: string;
  roomId: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateBookingRequest {
  title?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface CreateRoomRequest {
  name: string;
  capacity: number;
  amenities?: string[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  companyId: string;
  role?: 'EMPLOYEE' | 'ADMIN';
}

export interface AnalyticsUtilisation {
  roomId: string;
  roomName: string;
  utilisationPercent: number;
  totalHours: number;
  bookedHours: number;
}

export interface AnalyticsCompanyHours {
  companyId: string;
  companyName: string;
  color: string;
  totalHours: number;
  bookingCount: number;
}

export interface AnalyticsPeakTime {
  hour: number;
  day: number; // 0 = Sunday, 6 = Saturday
  bookingCount: number;
}

export interface AnalyticsCancellations {
  totalBookings: number;
  cancelled: number;
  noShow: number;
  cancellationRate: number;
  noShowRate: number;
}
