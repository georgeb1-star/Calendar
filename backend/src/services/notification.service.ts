// Notification service stub — wire up Resend/SendGrid later

export const notificationService = {
  async sendBookingConfirmation(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }) {
    console.log('[Notification] Booking confirmation:', {
      to: data.userEmail,
      subject: `Booking ${data.status}: ${data.bookingTitle}`,
      body: `Your booking for ${data.roomName} from ${data.startTime.toISOString()} to ${data.endTime.toISOString()} is ${data.status}.`,
    });
  },

  async sendApprovalNotification(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    approved: boolean;
    reason?: string;
  }) {
    const action = data.approved ? 'APPROVED' : 'REJECTED';
    console.log('[Notification] Approval notification:', {
      to: data.userEmail,
      subject: `Booking ${action}: ${data.bookingTitle}`,
      body: data.reason ? `Reason: ${data.reason}` : undefined,
    });
  },

  async sendReminder(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
  }) {
    console.log('[Notification] Booking reminder:', {
      to: data.userEmail,
      subject: `Reminder: ${data.bookingTitle} in 15 minutes`,
      body: `Your booking for ${data.roomName} starts at ${data.startTime.toISOString()}.`,
    });
  },

  async sendNoShowAlert(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
  }) {
    console.log('[Notification] No-show alert:', {
      to: data.userEmail,
      subject: `No-show recorded: ${data.bookingTitle}`,
      body: `You did not check in for your booking at ${data.roomName} scheduled for ${data.startTime.toISOString()}.`,
    });
  },
};
