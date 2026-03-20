import { Resend } from 'resend';

const TEST_MODE = !process.env.RESEND_API_KEY || process.env.EMAIL_TEST_MODE === 'true';
const resend = !TEST_MODE ? new Resend(process.env.RESEND_API_KEY!) : null;
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

function formatTime(date: Date) {
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F5F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F5F2;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#E8917A;padding:28px 32px;">
            <p style="margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#fff;font-weight:normal;">Townhouse</p>
            <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Meeting Room Booking</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px;">
            <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#1A1A1A;letter-spacing:0.02em;">${title}</h1>
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#F9F5F2;">
            <p style="margin:0;font-size:10px;color:#9E9087;letter-spacing:0.1em;text-transform:uppercase;">Townhouse Meeting Room Booking System</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailBox(rows: { label: string; value: string }[]) {
  const rowsHtml = rows
    .map(
      r => `<tr>
        <td style="padding:10px 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9E9087;width:120px;">${r.label}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1A1A1A;">${r.value}</td>
      </tr>`
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8DDD8;margin:0 0 24px;">
    ${rowsHtml}
  </table>`;
}

async function send(to: string, subject: string, html: string) {
  if (TEST_MODE) {
    console.log('\n📧 [Email - TEST MODE]');
    console.log(`   To:      ${to}`);
    console.log(`   From:    ${FROM}`);
    console.log(`   Subject: ${subject}`);
    console.log('─'.repeat(50));
    return;
  }
  await resend!.emails.send({ from: FROM, to, subject, html });
}

export const notificationService = {
  async sendBookingConfirmation(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
    endTime: Date;
    status: string;
    inviteeNames?: string[];
  }) {
    const statusLabel = data.status.charAt(0) + data.status.slice(1).toLowerCase();
    const rows: { label: string; value: string }[] = [
      { label: 'Booking', value: data.bookingTitle },
      { label: 'Room', value: data.roomName },
      { label: 'Start', value: formatTime(data.startTime) },
      { label: 'End', value: formatTime(data.endTime) },
      { label: 'Status', value: statusLabel },
    ];
    if (data.inviteeNames && data.inviteeNames.length > 0) {
      rows.push({ label: 'Invited', value: data.inviteeNames.join(', ') });
    }
    const statusNote = data.status === 'PENDING_APPROVAL'
      ? `<p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">You'll receive another email once your booking is reviewed.</p>`
      : '';
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Your booking has been received. Here are the details:</p>
      ${detailBox(rows)}
      ${statusNote}
    `;
    await send(
      data.userEmail,
      `Booking ${statusLabel}: ${data.bookingTitle}`,
      layout('Booking Confirmation', body)
    );
  },

  async sendApprovalNotification(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    approved: boolean;
    reason?: string;
  }) {
    const action = data.approved ? 'Approved' : 'Rejected';
    const intro = data.approved
      ? `Great news — your booking has been <strong>approved</strong>.`
      : `Unfortunately your booking has been <strong>rejected</strong>.`;
    const reasonRow = data.reason
      ? detailBox([
          { label: 'Booking', value: data.bookingTitle },
          { label: 'Decision', value: action },
          { label: 'Reason', value: data.reason },
        ])
      : detailBox([
          { label: 'Booking', value: data.bookingTitle },
          { label: 'Decision', value: action },
        ]);
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">${intro}</p>
      ${reasonRow}
    `;
    await send(
      data.userEmail,
      `Booking ${action}: ${data.bookingTitle}`,
      layout(`Booking ${action}`, body)
    );
  },

  async sendReminder(
    user: { email: string; name: string },
    booking: { title: string; room: { name: string }; startTime: Date; endTime: Date },
    cancelToken: string
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cancelUrl = `${frontendUrl}/cancel-booking?token=${cancelToken}`;
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${user.name},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">This is a reminder that your booking starts in 30 minutes.</p>
      ${detailBox([
        { label: 'Booking', value: booking.title },
        { label: 'Room', value: booking.room.name },
        { label: 'Start', value: formatTime(booking.startTime) },
        { label: 'End', value: formatTime(booking.endTime) },
      ])}
      <p style="margin:0 0 16px;font-size:13px;color:#3D3530;line-height:1.6;">Need to cancel? Use the button below:</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="background:#E8917A;padding:12px 24px;">
            <a href="${cancelUrl}" style="font-family:Georgia,serif;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:#fff;text-decoration:none;">Cancel Booking</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:12px;color:#9E9087;line-height:1.6;font-style:italic;">Note: cancellations made within 2 hours of the start time do not receive a token refund.</p>
    `;
    await send(
      user.email,
      `Reminder: ${booking.title} in 30 minutes`,
      layout('Booking Reminder', body)
    );
  },

  async sendNoShowAlert(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
  }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">We didn't receive a check-in for your booking and it has been marked as a no-show.</p>
      ${detailBox([
        { label: 'Booking', value: data.bookingTitle },
        { label: 'Room', value: data.roomName },
        { label: 'Scheduled', value: formatTime(data.startTime) },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">If you believe this is an error, please contact your administrator.</p>
    `;
    await send(
      data.userEmail,
      `No-show recorded: ${data.bookingTitle}`,
      layout('No-Show Recorded', body)
    );
  },

  async sendPendingApprovalRequest(data: {
    adminEmail: string;
    adminName: string;
    userName: string;
    userEmail: string;
    companyName: string;
  }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.adminName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">A new user has requested to join <strong>${data.companyName}</strong> and is awaiting your approval.</p>
      ${detailBox([
        { label: 'Name', value: data.userName },
        { label: 'Email', value: data.userEmail },
        { label: 'Company', value: data.companyName },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">Log in to the Townhouse admin panel and go to the Users tab to approve or reject this request.</p>
    `;
    await send(
      data.adminEmail,
      `New user awaiting approval: ${data.userName}`,
      layout('New User Request', body)
    );
  },

  async sendUserApproved(data: { userEmail: string; userName: string; companyName: string }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Your account for <strong>${data.companyName}</strong> has been <strong>approved</strong>. You can now log in and book meeting rooms.</p>
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">Welcome to Townhouse!</p>
    `;
    await send(
      data.userEmail,
      'Your account has been approved',
      layout('Account Approved', body)
    );
  },

  async sendUserRejected(data: { userEmail: string; userName: string; companyName: string }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Unfortunately your request to join <strong>${data.companyName}</strong> has been declined.</p>
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">If you believe this is an error, please contact your company administrator.</p>
    `;
    await send(
      data.userEmail,
      'Your account request was declined',
      layout('Account Request Declined', body)
    );
  },

  async sendSubscriptionReceipt(data: {
    userEmail: string;
    userName: string;
    plan: string;
    tokensPerDay: number;
    amount: string;
  }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Thank you for subscribing. Your plan has been activated.</p>
      ${detailBox([
        { label: 'Plan', value: data.plan },
        { label: 'Amount', value: data.amount + ' / month' },
        { label: 'Tokens', value: data.tokensPerDay + ' tokens per day' },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">You can manage your subscription at any time from the Billing page.</p>
    `;
    await send(
      data.userEmail,
      `Subscription activated: ${data.plan} Plan`,
      layout('Subscription Confirmed', body)
    );
  },

  async sendWelcomeEmail(data: { userEmail: string; userName: string }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Welcome to Townhouse! Your account has been created and you can now book meeting rooms.</p>
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">Sign in at any time to view room availability and make a booking.</p>
    `;
    await send(
      data.userEmail,
      'Welcome to Townhouse',
      layout('Welcome to Townhouse', body)
    );
  },

  async sendBookingInvite(
    invitee: { email: string; name: string },
    booking: { title: string; room: { name: string }; startTime: Date; endTime: Date },
    organiserName: string
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${invitee.name},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">You've been invited to a meeting by <strong>${organiserName}</strong>.</p>
      ${detailBox([
        { label: 'Meeting', value: booking.title },
        { label: 'Room', value: booking.room.name },
        { label: 'Start', value: formatTime(booking.startTime) },
        { label: 'End', value: formatTime(booking.endTime) },
        { label: 'Organiser', value: organiserName },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">This booking will appear in your My Bookings page. <a href="${frontendUrl}/my-bookings" style="color:#E8917A;">View your bookings</a></p>
    `;
    await send(
      invitee.email,
      `You've been invited: ${booking.title}`,
      layout('Meeting Invitation', body)
    );
  },

  async sendTokenDeductionFailed(
    user: { email: string; name: string },
    booking: { title: string; startTime: Date }
  ) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${user.name},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">We were unable to deduct tokens for your recurring booking today due to insufficient token balance.</p>
      ${detailBox([
        { label: 'Booking', value: booking.title },
        { label: 'Date', value: formatTime(booking.startTime) },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">Your booking is still active. Please contact your company administrator to resolve the token balance.</p>
    `;
    await send(
      user.email,
      `Token deduction failed: ${booking.title}`,
      layout('Token Deduction Failed', body)
    );
  },
};
