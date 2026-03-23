import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import bookingRoutes from './routes/booking.routes';
import roomRoutes from './routes/room.routes';
import adminRoutes from './routes/admin.routes';
import billingRoutes from './routes/billing.routes';
import webhookRoutes from './routes/webhook.routes';
import companyUsersRoutes from './routes/companyUsers.routes';
import locationRoutes from './routes/location.routes';
import globalAdminRoutes from './routes/global-admin.routes';
import { startNoShowJob } from './jobs/noshow.job';
import { startReminderJob } from './jobs/reminder.job';
import { startRecurringTokensJob } from './jobs/recurringTokens.job';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// Webhook route must be registered BEFORE express.json() to receive raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/company/users', companyUsersRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/global-admin', globalAdminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export function startServer() {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    startNoShowJob();
    startReminderJob();
    startRecurringTokensJob();
  });
}

// Start automatically unless imported by tests
if (require.main === module) {
  startServer();
}

export default app;
