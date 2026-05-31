// ═══════════════════════════════════════════════════════════════
//   A.R. Library — Express + MongoDB Atlas Server  v2.0
//   MySQL se MongoDB mein migrate kiya gaya
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
require('./db');  // MongoDB connect

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const {
  Member, FeeRecord, FeeStructure, Attendance,
  Notice, Expense, Employee, SalaryRecord,
  EmpCred, Setting, Locker, Enquiry, RecycleBin
} = require('./models');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
const ok  = (res, data) => res.json({ ok: true, data });
const err = (res, e)    => {
  console.error(e.message);
  res.status(500).json({ ok: false, error: e.message });
};
const today = () => new Date().toISOString().slice(0, 10);

// ─── DEFAULT DATA SEED ────────────────────────────────────────
async function seedDefaults() {
  try {
    const count = await FeeStructure.countDocuments();
    if (count === 0) {
      const defaultFees = [
        { plan: 'Half Day',                    shift: 'Morning',  amount: 600  },
        { plan: 'Half Day',                    shift: 'Evening',  amount: 600  },
        { plan: 'Half Day',                    shift: 'Full Day', amount: 600  },
        { plan: 'Half Day + Reserved Seat',    shift: 'Morning',  amount: 800  },
        { plan: 'Half Day + Reserved Seat',    shift: 'Evening',  amount: 800  },
        { plan: 'Half Day + Reserved Seat',    shift: 'Full Day', amount: 800  },
        { plan: 'Full Day',                    shift: 'Morning',  amount: 1300 },
        { plan: 'Full Day',                    shift: 'Evening',  amount: 1300 },
        { plan: 'Full Day',                    shift: 'Full Day', amount: 1300 },
        { plan: 'Full Day + Reserved Seat',    shift: 'Morning',  amount: 1300 },
        { plan: 'Full Day + Reserved Seat',    shift: 'Evening',  amount: 1300 },
        { plan: 'Full Day + Reserved Seat',    shift: 'Full Day', amount: 1300 },
      ];
      await FeeStructure.insertMany(defaultFees, { ordered: false }).catch(() => {});
      console.log('✅ Default fee structure inserted');
    }

    const noticeCount = await Notice.countDocuments();
    if (noticeCount === 0) {
      await Notice.create({
        title: 'Library Timing Notice',
        type: 'info',
        body: 'Morning Shift 6:00 AM – 1:00 PM | Evening Shift 1:00 PM – 8:00 PM | Full Day 6:00 AM – 8:00 PM.',
        date: today(),
      });
      console.log('✅ Default notice inserted');
    }
  } catch (e) {
    console.error('⚠️ Seed error (ignorable):', e.message);
  }
}

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({ ok: true, db: 'MongoDB ' + (states[state] || 'unknown') });
  } catch (e) { err(res, e); }
});

// ═══ MEMBERS ══════════════════════════════════════════════════
app.get('/api/members', async (req, res) => {
  try {
    const rows = await Member.find().sort({ createdAt: -1 }).lean();
    // _id ko hatao, id rakho
    const clean = rows.map(({ _id, __v, ...r }) => r);
    ok(res, clean);
  } catch (e) { err(res, e); }
});

app.get('/api/members/seats/map', async (req, res) => {
  try {
    const rows = await Member.find(
      { seat: { $ne: null, $ne: '' } },
      { id: 1, name: 1, seat: 1, shift: 1, plan: 1, feeStatus: 1, _id: 0 }
    ).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const row = await Member.findOne({ id: req.params.id }, { _id: 0, __v: 0 }).lean();
    if (!row) return res.status(404).json({ ok: false, error: 'Member not found' });
    ok(res, row);
  } catch (e) { err(res, e); }
});

app.post('/api/members', async (req, res) => {
  try {
    const d = req.body;
    const doc = await Member.create({
      id: d.id, name: d.name, phone: d.phone || '',
      cls: d.cls || '', shift: d.shift || '', plan: d.plan || '',
      category: d.category || '', from: d.from || null, to: d.to || null,
      dob: d.dob || null, feeStatus: d.feeStatus || 'Due',
      dueAmount: d.dueAmount || 0, seat: d.seat || null,
      color: d.color || '#3b82f6', addr: d.addr || '',
      guardian: d.guardian || '', gphone: d.gphone || '',
      aadhar: d.aadhar || '', aadharImg: d.aadharImg || null,
      photo: d.photo || null,
    });
    ok(res, { id: doc.id });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ ok: false, error: 'Member ID already exists' });
    err(res, e);
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const d = req.body;
    const update = {
      name: d.name, phone: d.phone || '', cls: d.cls || '',
      shift: d.shift || '', plan: d.plan || '', category: d.category || '',
      from: d.from || null, to: d.to || null, dob: d.dob || null,
      feeStatus: d.feeStatus || 'Due',
      dueAmount: d.dueAmount !== undefined ? parseFloat(d.dueAmount) || 0 : 0,
      seat: d.seat || null, color: d.color || '#3b82f6', addr: d.addr || '',
      guardian: d.guardian || '', gphone: d.gphone || '', aadhar: d.aadhar || '',
    };
    if (d.aadharImg !== undefined) update.aadharImg = d.aadharImg;
    if (d.photo     !== undefined) update.photo     = d.photo;

    await Member.updateOne({ id: req.params.id }, { $set: update });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await Member.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

app.post('/api/members/auto-expire', async (req, res) => {
  try {
    const result = await Member.updateMany(
      { to: { $lt: today(), $ne: null }, feeStatus: { $ne: 'Expired' } },
      { $set: { feeStatus: 'Expired' } }
    );
    ok(res, { done: true, updated: result.modifiedCount });
  } catch (e) { err(res, e); }
});

// ═══ FEE STRUCTURE ════════════════════════════════════════════
app.get('/api/fees/structure/all', async (req, res) => {
  try {
    const rows = await FeeStructure.find({}, { _id: 0, __v: 0 }).sort({ plan: 1, shift: 1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.put('/api/fees/structure/update', async (req, res) => {
  try {
    const { plan, shift, amount } = req.body;
    await FeeStructure.findOneAndUpdate(
      { plan, shift },
      { plan, shift, amount },
      { upsert: true, new: true }
    );
    ok(res, { plan, shift, amount });
  } catch (e) { err(res, e); }
});

// ═══ FEES ═════════════════════════════════════════════════════
app.get('/api/fees', async (req, res) => {
  try {
    const filter = {};
    if (req.query.memberId) filter.memberId = req.query.memberId;
    if (req.query.month)    filter.month    = req.query.month;
    if (req.query.status)   filter.status   = req.query.status;
    const rows = await FeeRecord.find(filter, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/fees', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('REC-' + Date.now());
    const doc = await FeeRecord.create({
      id, memberId: d.memberId, memberName: d.memberName,
      plan: d.plan || '', shift: d.shift || '', category: d.category || '',
      amount: d.amount || 0, paidAmount: d.paidAmount || d.amount || 0,
      dueAmount: d.dueAmount || 0, date: d.date || today(),
      month: d.month || '', mode: d.mode || 'Cash',
      notes: d.notes || '', status: d.status || 'Paid',
    });
    ok(res, { id: doc.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/fees/:id', async (req, res) => {
  try {
    await FeeRecord.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

app.get('/api/fees/dues/list', async (req, res) => {
  try {
    const rows = await Member.find(
      { feeStatus: { $in: ['Due', 'Expired'] } },
      { _id: 0, __v: 0 }
    ).sort({ to: 1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// ═══ ATTENDANCE ═══════════════════════════════════════════════
app.get('/api/attendance', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date)     filter.date     = req.query.date;
    if (req.query.memberId) filter.memberId = req.query.memberId;
    const rows = await Attendance.find(filter, { _id: 0, __v: 0 }).sort({ date: -1, createdAt: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/attendance/checkin', async (req, res) => {
  try {
    const d = req.body;
    const nowTime = new Date().toTimeString().slice(0, 5);
    const doc = await Attendance.create({
      memberId: d.memberId, memberName: d.memberName,
      date: d.date || today(), shift: d.shift || '',
      seat: d.seat || null,
      in:  d.in  || nowTime,
      out: d.out || null,
      present: true,
    });
    ok(res, { id: doc._id });
  } catch (e) { err(res, e); }
});

app.post('/api/attendance/checkout', async (req, res) => {
  try {
    const d = req.body;
    const nowTime = new Date().toTimeString().slice(0, 5);
    await Attendance.findOneAndUpdate(
      { memberId: d.memberId, date: d.date || today(), out: null },
      { $set: { out: d.out || nowTime } },
      { sort: { createdAt: -1 } }
    );
    ok(res, { done: true });
  } catch (e) { err(res, e); }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

// ═══ NOTICES ══════════════════════════════════════════════════
app.get('/api/notices', async (req, res) => {
  try {
    const rows = await Notice.find({}, { __v: 0 }).sort({ createdAt: -1 }).lean();
    // _id ko id ke roop mein bhejo (frontend notice id use karta hai)
    const clean = rows.map(r => ({ ...r, id: r._id, _id: undefined }));
    ok(res, clean);
  } catch (e) { err(res, e); }
});

app.post('/api/notices', async (req, res) => {
  try {
    const d = req.body;
    const doc = await Notice.create({
      title: d.title, type: d.type || 'info',
      body: d.body || '', date: d.date || today(),
    });
    ok(res, { id: doc._id });
  } catch (e) { err(res, e); }
});

app.delete('/api/notices/:id', async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

// ═══ EXPENSES ════════════════════════════════════════════════
app.get('/api/expenses', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) {
      // month format: "May 2025" → filter karo
      filter.$expr = {
        $eq: [
          { $dateToString: { format: '%B %Y', date: { $dateFromString: { dateString: '$date' } } } },
          req.query.month
        ]
      };
    }
    const rows = await Expense.find(filter, { _id: 0, __v: 0 }).sort({ date: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('EXP-' + Date.now());
    const doc = await Expense.create({
      id, cat: d.cat || 'other', desc: d.desc || '',
      amount: d.amount || 0, date: d.date || today(),
      mode: d.mode || 'Cash', notes: d.notes || '',
    });
    ok(res, { id: doc.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await Expense.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

// ═══ EMPLOYEES ════════════════════════════════════════════════
app.get('/api/salary/employees', async (req, res) => {
  try {
    const rows = await Employee.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/salary/employees', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('EMP-' + Date.now());
    const doc = await Employee.create({
      id, name: d.name, role: d.role || '', phone: d.phone || '',
      salary: d.salary || 0, join: d.join || d.join_date || null, addr: d.addr || '',
    });
    ok(res, { id: doc.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/salary/employees/:id', async (req, res) => {
  try {
    await Employee.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

// ═══ EMP CREDENTIALS ═════════════════════════════════════════
app.get('/api/salary/emp-creds', async (req, res) => {
  try {
    const rows = await EmpCred.find({}, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/salary/emp-creds', async (req, res) => {
  try {
    const { creds } = req.body;
    if (!Array.isArray(creds)) return res.status(400).json({ ok: false, error: 'creds must be array' });
    await EmpCred.deleteMany({});
    for (const c of creds) {
      if (!c.loginId || !c.password) continue;
      await EmpCred.findOneAndUpdate(
        { loginId: c.loginId },
        { empId: c.empId || '', name: c.name || '', loginId: c.loginId, password: c.password },
        { upsert: true }
      );
    }
    ok(res, { saved: creds.length });
  } catch (e) { err(res, e); }
});

// ═══ SALARY ═══════════════════════════════════════════════════
app.get('/api/salary/records', async (req, res) => {
  try {
    const filter = {};
    if (req.query.empId) filter.empId = req.query.empId;
    if (req.query.month) filter.month = req.query.month;
    const rows = await SalaryRecord.find(filter, { _id: 0, __v: 0 }).sort({ date: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/salary/pay', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('SAL-' + Date.now());
    const doc = await SalaryRecord.create({
      id, empId: d.empId, empName: d.empName || '',
      month: d.month || '', amount: d.amount || 0,
      date: d.date || today(), mode: d.mode || 'Cash', notes: d.notes || '',
    });
    ok(res, { id: doc.id });
  } catch (e) { err(res, e); }
});

// ═══ REPORTS ══════════════════════════════════════════════════
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const todayStr = today();
    const [totalMembers, dueMembers, todayPresent, revenueResult, expenseResult] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ feeStatus: { $in: ['Due', 'Expired'] } }),
      Attendance.countDocuments({ date: todayStr, present: true }),
      FeeRecord.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    ok(res, {
      totalMembers,
      dueMembers,
      todayPresent,
      totalRevenue:  revenueResult[0]?.total || 0,
      totalExpenses: expenseResult[0]?.total || 0,
    });
  } catch (e) { err(res, e); }
});

app.get('/api/reports/pl', async (req, res) => {
  try {
    const filter = req.query.month
      ? { $expr: { $eq: [{ $dateToString: { format: '%B %Y', date: { $dateFromString: { dateString: '$date' } } } }, req.query.month] } }
      : {};

    const [rev, exp, sal] = await Promise.all([
      FeeRecord.aggregate([{ $match: filter }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: filter }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      SalaryRecord.aggregate([{ $match: filter }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    ]);
    const revenue  = rev[0]?.t || 0;
    const expenses = (exp[0]?.t || 0) + (sal[0]?.t || 0);
    ok(res, { revenue, expenses, profit: revenue - expenses });
  } catch (e) { err(res, e); }
});

app.get('/api/reports/backup', async (req, res) => {
  try {
    const [members, feeRecords, attendance, notices, expenses, employees, salaryRecords, feeStructure] = await Promise.all([
      Member.find({}, { _id: 0, __v: 0 }).lean(),
      FeeRecord.find({}, { _id: 0, __v: 0 }).lean(),
      Attendance.find({}, { _id: 0, __v: 0 }).lean(),
      Notice.find({}, { __v: 0 }).lean(),
      Expense.find({}, { _id: 0, __v: 0 }).lean(),
      Employee.find({}, { _id: 0, __v: 0 }).lean(),
      SalaryRecord.find({}, { _id: 0, __v: 0 }).lean(),
      FeeStructure.find({}, { _id: 0, __v: 0 }).lean(),
    ]);
    ok(res, { members, feeRecords, attendance, notices, expenses, employees, salaryRecords, feeStructure });
  } catch (e) { err(res, e); }
});

app.post('/api/reports/restore', async (req, res) => {
  try {
    const d = req.body;

    // _clearOnly: sirf delete karo, kuch insert mat karo
    if (d._clearOnly) {
      await Promise.all([
        Member.deleteMany({}), FeeRecord.deleteMany({}),
        Attendance.deleteMany({}), Notice.deleteMany({}),
        Expense.deleteMany({}), Employee.deleteMany({}),
        SalaryRecord.deleteMany({}), FeeStructure.deleteMany({}),
        Locker.deleteMany({}), Enquiry.deleteMany({}), EmpCred.deleteMany({}),
      ]);
      console.log('🗑️ Clear only done');
      return ok(res, { done: true });
    }

    // _chunkMode: sirf insert karo, delete mat karo
    if (!d._chunkMode) {
      // Normal full restore — pehle clear karo
      await Promise.all([
        Member.deleteMany({}), FeeRecord.deleteMany({}),
        Attendance.deleteMany({}), Notice.deleteMany({}),
        Expense.deleteMany({}), Employee.deleteMany({}),
        SalaryRecord.deleteMany({}), FeeStructure.deleteMany({}),
        Locker.deleteMany({}), Enquiry.deleteMany({}), EmpCred.deleteMany({}),
      ]);
    }

    console.log('🔄 Restore inserting — members:', d.members?.length || 0);

    // Insert karo
    if (d.members?.length)       await Member.insertMany(d.members, { ordered: false }).catch(() => {});
    if (d.feeRecords?.length)    await FeeRecord.insertMany(d.feeRecords, { ordered: false }).catch(() => {});
    if (d.attendance?.length)    await Attendance.insertMany(d.attendance, { ordered: false }).catch(() => {});
    if (d.notices?.length)       await Notice.insertMany(d.notices.map(({ id, ...n }) => n), { ordered: false }).catch(() => {});
    if (d.expenses?.length)      await Expense.insertMany(d.expenses, { ordered: false }).catch(() => {});
    if (d.employees?.length)     await Employee.insertMany(d.employees, { ordered: false }).catch(() => {});
    if (d.salaryRecords?.length) await SalaryRecord.insertMany(d.salaryRecords, { ordered: false }).catch(() => {});
    if (d.feeStructure?.length)  await FeeStructure.insertMany(d.feeStructure, { ordered: false }).catch(() => {});
    if (d.lockerData?.length)    await Locker.insertMany(d.lockerData, { ordered: false }).catch(() => {});
    if (d.enquiries?.length)     await Enquiry.insertMany(d.enquiries, { ordered: false }).catch(() => {});
    if (d.empCreds?.length)      await EmpCred.insertMany(d.empCreds, { ordered: false }).catch(() => {});

    console.log('✅ Restore chunk complete');
    ok(res, { done: true });
  } catch (e) { err(res, e); }
});

// ═══ LOCKERS ══════════════════════════════════════════════════
app.get('/api/lockers', async (req, res) => {
  try {
    const rows = await Locker.find({}, { _id: 0, __v: 0 }).sort({ no: 1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/lockers', async (req, res) => {
  try {
    const d = req.body;
    await Locker.findOneAndUpdate(
      { no: d.no },
      {
        no: d.no, memberId: d.memberId, memberName: d.memberName,
        fee: d.fee || 0, from: d.from || null, to: d.to || null,
        notes: d.notes || '', assignedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    ok(res, { no: d.no });
  } catch (e) { err(res, e); }
});

app.delete('/api/lockers/:no', async (req, res) => {
  try {
    await Locker.deleteOne({ no: parseInt(req.params.no) });
    ok(res, { no: req.params.no });
  } catch (e) { err(res, e); }
});

// ═══ ENQUIRIES ════════════════════════════════════════════════
app.get('/api/enquiries', async (req, res) => {
  try {
    const rows = await Enquiry.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
    ok(res, rows);
  } catch (e) { err(res, e); }
});

app.post('/api/enquiries', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || ('ENQ-' + Date.now());
    await Enquiry.findOneAndUpdate(
      { id },
      {
        id, name: d.name, phone: d.phone || '', address: d.address || '',
        shift: d.shift || '', cls: d.cls || '', date: d.date || null,
        status: d.status || 'Pending', notes: d.notes || '',
      },
      { upsert: true, new: true }
    );
    ok(res, { id });
  } catch (e) { err(res, e); }
});

app.put('/api/enquiries/:id', async (req, res) => {
  try {
    const d = req.body;
    await Enquiry.updateOne(
      { id: req.params.id },
      {
        $set: {
          name: d.name, phone: d.phone || '', address: d.address || '',
          shift: d.shift || '', cls: d.cls || '', date: d.date || null,
          status: d.status || 'Pending', notes: d.notes || '',
        }
      }
    );
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/enquiries/:id', async (req, res) => {
  try {
    await Enquiry.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

// ═══ SETTINGS ═════════════════════════════════════════════════
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await Setting.find({}, { _id: 0, __v: 0 }).lean();
    const data = {};
    rows.forEach(r => { data[r.key] = r.value; });
    ok(res, data);
  } catch (e) { err(res, e); }
});

app.put('/api/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date() },
        { upsert: true }
      );
    }
    ok(res, { done: true });
  } catch (e) { err(res, e); }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    const value = req.body.value;
    await Setting.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value, updatedAt: new Date() },
      { upsert: true }
    );
    ok(res, { key: req.params.key });
  } catch (e) { err(res, e); }
});

// ═══ SEED (data migration ke liye) ═══════════════════════════
app.post('/api/seed', async (req, res) => {
  if (req.headers['x-seed-token'] !== process.env.SEED_TOKEN) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    const d = req.body;
    await Promise.all([
      Member.deleteMany({}), FeeRecord.deleteMany({}),
      Attendance.deleteMany({}), Expense.deleteMany({}),
      Employee.deleteMany({}), FeeStructure.deleteMany({}),
    ]);
    if (d.members?.length)      await Member.insertMany(d.members, { ordered: false }).catch(() => {});
    if (d.feeRecords?.length)   await FeeRecord.insertMany(d.feeRecords, { ordered: false }).catch(() => {});
    if (d.attendance?.length)   await Attendance.insertMany(d.attendance, { ordered: false }).catch(() => {});
    if (d.expenses?.length)     await Expense.insertMany(d.expenses, { ordered: false }).catch(() => {});
    if (d.employees?.length)    await Employee.insertMany(d.employees, { ordered: false }).catch(() => {});
    if (d.feeStructure?.length) await FeeStructure.insertMany(d.feeStructure, { ordered: false }).catch(() => {});
    ok(res, { done: true, members: d.members?.length || 0 });
  } catch (e) { err(res, e); }
});

// ═══ RECYCLE BIN ══════════════════════════════════════════════
app.get('/api/bin', async (req, res) => {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // Auto-purge: 30 din purani items
    await RecycleBin.deleteMany({ deletedAt: { $lt: cutoff } });
    const rows = await RecycleBin.find(
      { deletedAt: { $gte: cutoff } },
      { _id: 0, __v: 0 }
    ).sort({ deletedAt: -1 }).lean();
    ok(res, rows.map(r => ({ ...r, deletedAt: r.deletedAt })));
  } catch (e) { err(res, e); }
});

app.post('/api/bin', async (req, res) => {
  try {
    const { id, type, label, data, deletedAt } = req.body;
    await RecycleBin.findOneAndUpdate(
      { id },
      { id, type, label: label || '', data, deletedAt: deletedAt || Date.now() },
      { upsert: true }
    );
    ok(res, { id });
  } catch (e) { err(res, e); }
});

app.delete('/api/bin/:id', async (req, res) => {
  try {
    await RecycleBin.deleteOne({ id: req.params.id });
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e); }
});

app.delete('/api/bin', async (req, res) => {
  try {
    await RecycleBin.deleteMany({});
    ok(res, { done: true });
  } catch (e) { err(res, e); }
});

// ── SERVE FRONTEND ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START SERVER ──────────────────────────────────────────────
const mongoose = require('mongoose');
let serverStarted = false;

function startServer() {
  if (serverStarted) return;
  serverStarted = true;
  app.listen(PORT, () => {
    console.log(`\n🚀 A.R. Library (MongoDB) running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
  });
}

mongoose.connection.once('open', async () => {
  await seedDefaults();
  startServer();
});

// Agar 10 second mein connect na ho toh bhi start karo
setTimeout(() => {
  startServer();
}, 10000);
