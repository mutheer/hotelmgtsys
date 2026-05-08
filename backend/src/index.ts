import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes';
import roomsRoutes from './routes/rooms.routes';
import settingsRoutes from './routes/settings.routes';
import guestsRoutes from './routes/guests.routes';
import bookingsRoutes from './routes/bookings.routes';
import billingRoutes from './routes/billing.routes';
import housekeepingRoutes from './routes/housekeeping.routes';
import reportsRoutes from './routes/reports.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built React frontend in production (Electron app)
if (isProd) {
  // __dirname is dist/src in production; public/ is at dist/public
  const staticDir = path.join(__dirname, '..', 'public');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // Catch-all: serve index.html for any non-API path (React Router handles routing)
    app.use((_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
