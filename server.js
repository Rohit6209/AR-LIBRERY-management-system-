// server.js — A.R. Library Backend Server
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');
const mysql       = require('mysql2/promise');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Trust Proxy (for Render/Heroku) ───────────
app.set('trust proxy', 1);

// ── Rate Limiting ─────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: '⚠️ Too many requests, try later.' }
});
app.use('/api/', limiter);

// ── Static files ──────────────────────────────
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────
app.use('/api/members',    require('./members'));
app.use('/api/fees',       require('./fees'));
app.use('/api/attendance', require('./attendance'));
app.use('/api/notices',    require('./notices'));
app.use('/api/expenses',   require('./expenses'));
app.use('/api/salary',     require('./salary'));
app.use('/api/reports',    require('./reports'));

// ── Auto Setup DB on Startup ──────────────────
async function setupDatabase() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:               process.env.DB_HOST     || 'localhost',
      port:               Number(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'railway',
      multipleStatements: true
    });

    console.log('✅ MySQL connected for setup');

    const queries = [
      `CREATE TABLE IF NOT EXISTS fee_structure (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL,
        shift VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_plan_shift (plan_name, shift)
      )`,
      `CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15), guardian VARCHAR(100),
        gphone VARCHAR(15), cls VARCHAR(50),
        shift VARCHAR(60), plan VARCHAR(80),
        seat INT, addr TEXT, aadhar VARCHAR(20),
        aadhar_img TEXT, photo TEXT,
        color VARCHAR(20) DEFAULT '#3b82f6',
        fee_status ENUM('Paid','Due','Expired') DEFAULT 'Due',
        join_date DATE, valid_till DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS fee_records (
        id VARCHAR(20) PRIMARY KEY,
        member_id VARCHAR(20), member_name VARCHAR(100),
        plan VARCHAR(80), shift VARCHAR(60),
        amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2),
        due_amount DECIMAL(10,2) DEFAULT 0,
        date DATE, month VARCHAR(30),
        mode VARCHAR(20) DEFAULT 'Cash',
        status ENUM('Paid','Partial','Due') DEFAULT 'Paid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL, member_id VARCHAR(20),
        member_name VARCHAR(100), shift VARCHAR(60),
        seat INT, check_in TIME, check_out TIME,
        present TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_att (date, member_id),
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS notices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        type ENUM('info','warn','success','danger') DEFAULT 'info',
        body TEXT, date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(20) PRIMARY KEY,
        cat ENUM('rent','utility','maintenance','salary','other') DEFAULT 'other',
        description TEXT, amount DECIMAL(10,2) NOT NULL,
        date DATE, mode VARCHAR(20) DEFAULT 'Cash',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL, role VARCHAR(80),
        phone VARCHAR(15), salary DECIMAL(10,2) DEFAULT 0,
        join_date DATE, addr TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS salary_records (
        id VARCHAR(20) PRIMARY KEY,
        emp_id VARCHAR(20), emp_name VARCHAR(100),
        month VARCHAR(30), amount DECIMAL(10,2) NOT NULL,
        date DATE, mode VARCHAR(20) DEFAULT 'Cash',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE SET NULL
      )`,
      `INSERT IGNORE INTO fee_structure (plan_name, shift, amount) VALUES
        ('Half Day', 'Morning', 600),
        ('Half Day', 'Evening', 600),
        ('Half Day + Reserved Seat', 'Morning', 800),
        ('Half Day + Reserved Seat', 'Evening', 800),
        ('Full Day', 'Full Day', 1100),
        ('Full Day + Reserved Seat', 'Full Day', 1300),
        ('Silver Plan (3 Month)', 'Morning', 1500),
        ('Silver Plan (3 Month)', 'Evening', 1500),
        ('Silver Plan (3 Month)', 'Full Day', 2800),
        ('Gold Plan (6 Month)', 'Morning', 2500),
        ('Gold Plan (6 Month)', 'Evening', 2500),
        ('Gold Plan (6 Month)', 'Full Day', 5000)`,
      `INSERT IGNORE INTO notices (id, title, type, body, date) VALUES
        (1, 'Library Timing Notice', 'info',
        'Morning Shift 6:00 AM – 1:00 PM | Evening Shift 1:00 PM – 8:00 PM | Full Day 6:00 AM – 8:00 PM.',
        CURDATE())`
    ];

    for (const q of queries) {
      try { await conn.execute(q); }
      catch(e) { console.warn('⚠️ Table query warning:', e.message); }
    }

    console.log('✅ All tables ready!');
  } catch (err) {
    console.error('❌ DB Setup failed:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

// ── Manual Setup Route (GET /setup-db) ────────
app.get('/setup-db', async (req, res) => {
  await setupDatabase();
  res.json({ done: true, message: '✅ DB setup complete!' });
});

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

// ── Start Server ──────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🏛️  A.R. Library Server v2.6        ║');
  console.log(`║   🚀  http://localhost:${PORT}           ║`);
  console.log(`║   🌍  Mode: ${process.env.NODE_ENV || 'development'}               ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // Auto setup tables on every startup
  await setupDatabase();
});

module.exports = app;
    
