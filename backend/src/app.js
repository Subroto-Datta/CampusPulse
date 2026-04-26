const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// ─── Route modules ──────────────────────────────────────
const healthRoutes     = require('./modules/health/health.routes');
const authRoutes       = require('./modules/auth/auth.routes');
const entryRoutes      = require('./modules/entry/entry.routes');
const qrRoutes         = require('./modules/qr/qr.routes');
const facultyRoutes    = require('./modules/faculty/faculty.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const adminRoutes      = require('./modules/admin/admin.routes');
const studentsRoutes   = require('./modules/students/students.routes');
const reportsRoutes    = require('./modules/reports/reports.routes');

const app = express();

// ─── Global middleware ──────────────────────────────────
app.use(helmet());
const allowedOrigins = env.cors.origin.split(',').map(o => o.trim());
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────
app.use('/api/health',     healthRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/entry',      entryRoutes);
app.use('/api/qr',         qrRoutes);
app.use('/api/faculty',    facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/students',   studentsRoutes);
app.use('/api/reports',    reportsRoutes);

// ─── 404 catch-all ──────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Centralized error handler ──────────────────────────
app.use(errorHandler);

module.exports = app;
