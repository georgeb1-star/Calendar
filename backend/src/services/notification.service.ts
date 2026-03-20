import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'Townhouse Bookings <bookings@resend.dev>';

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
  if (!resend) {
    console.log('[Notification] (no RESEND_API_KEY) Would send email:', { to, subject });
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
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
  }) {
    const statusLabel = data.status.charAt(0) + data.status.slice(1).toLowerCase();
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Your booking has been received. Here are the details:</p>
      ${detailBox([
        { label: 'Booking', value: data.bookingTitle },
        { label: 'Room', value: data.roomName },
        { label: 'Start', value: formatTime(data.startTime) },
        { label: 'End', value: formatTime(data.endTime) },
        { label: 'Status', value: statusLabel },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">You'll receive another email once your booking is reviewed.</p>
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

  async sendReminder(data: {
    userEmail: string;
    userName: string;
    bookingTitle: string;
    roomName: string;
    startTime: Date;
  }) {
    const body = `
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">Hi ${data.userName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#3D3530;line-height:1.6;">This is a reminder that your booking starts in 30 minutes.</p>
      ${detailBox([
        { label: 'Booking', value: data.bookingTitle },
        { label: 'Room', value: data.roomName },
        { label: 'Start', value: formatTime(data.startTime) },
      ])}
      <p style="margin:0;font-size:13px;color:#9E9087;line-height:1.6;">Please remember to check in when you arrive.</p>
    `;
    await send(
      data.userEmail,
      `Reminder: ${data.bookingTitle} in 30 minutes`,
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
};
