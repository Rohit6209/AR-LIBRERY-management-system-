// server.js — A.R. Library Backend Server
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');

const app = express();

// ── Upload directory ──────────────────────────
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Security & Performance ────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// ── CORS ──────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || '*'
    : '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-admin-password','Authorization']
}));

// ── Body Parser ───────────────────────────────
// 10mb limit for base64 images (aadhar, photos)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  message: { success: false, message: '⚠️ Too many requests, try later.' }
});
app.use('/api/', limiter);

// ── Static files ──────────────────────────────
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────
app.use('/api/members',    require('./routes/members'));
app.use('/api/fees',       require('./routes/fees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/expenses',   require('./routes/expenses'));
app.use('/api/salary',     require('./routes/salary'));
app.use('/api/reports',    require('./routes/reports'));

// ── Health check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ A.R. Library Server is running',
    version: '2.6.0',
    time: new Date().toISOString()
  });
});

// ── Serve Frontend ────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: '🟡 API running. Put index.html in /public folder.' });
  }
});

// ── Error Handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

// ── Start ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🏛️  A.R. Library Server v2.6        ║');
  console.log(`║   🚀  http://localhost:${PORT}           ║`);
  console.log(`║   🌍  Mode: ${process.env.NODE_ENV || 'development'}               ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
