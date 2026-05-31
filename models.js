// ══════════════════════════════════════════════════
//   A.R. Library — Mongoose Models (MongoDB)
// ══════════════════════════════════════════════════
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Member ────────────────────────────────────────
const MemberSchema = new Schema({
  id:         { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  phone:      { type: String, default: '' },
  cls:        { type: String, default: '' },
  shift:      { type: String, default: '' },
  plan:       { type: String, default: '' },
  category:   { type: String, default: '' },
  from:       { type: String, default: null },   // YYYY-MM-DD string
  to:         { type: String, default: null },
  dob:        { type: String, default: null },
  feeStatus:  { type: String, default: 'Due' },  // Paid / Due / Expired
  dueAmount:  { type: Number, default: 0 },
  seat:       { type: String, default: null },
  color:      { type: String, default: '#3b82f6' },
  addr:       { type: String, default: '' },
  guardian:   { type: String, default: '' },
  gphone:     { type: String, default: '' },
  aadhar:     { type: String, default: '' },
  aadharImg:  { type: String, default: null },   // base64
  photo:      { type: String, default: null },   // base64
  createdAt:  { type: Date, default: Date.now },
});
MemberSchema.index({ feeStatus: 1 });
MemberSchema.index({ seat: 1 });

// ── Fee Record ────────────────────────────────────
const FeeRecordSchema = new Schema({
  id:         { type: String, required: true, unique: true },
  memberId:   { type: String, default: '' },
  memberName: { type: String, default: '' },
  plan:       { type: String, default: '' },
  shift:      { type: String, default: '' },
  category:   { type: String, default: '' },
  amount:     { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount:  { type: Number, default: 0 },
  date:       { type: String, default: null },   // YYYY-MM-DD
  month:      { type: String, default: '' },
  mode:       { type: String, default: 'Cash' },
  notes:      { type: String, default: '' },
  status:     { type: String, default: 'Paid' }, // Paid / Partial / Due
  createdAt:  { type: Date, default: Date.now },
});

// ── Fee Structure ─────────────────────────────────
const FeeStructureSchema = new Schema({
  plan:   { type: String, required: true },
  shift:  { type: String, required: true },
  amount: { type: Number, default: 0 },
});
FeeStructureSchema.index({ plan: 1, shift: 1 }, { unique: true });

// ── Attendance ────────────────────────────────────
const AttendanceSchema = new Schema({
  memberId:   { type: String, default: '' },
  memberName: { type: String, default: '' },
  date:       { type: String, default: null },  // YYYY-MM-DD
  shift:      { type: String, default: '' },
  seat:       { type: String, default: null },
  in:         { type: String, default: null },  // HH:MM
  out:        { type: String, default: null },
  present:    { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now },
});
AttendanceSchema.index({ date: 1, memberId: 1 });

// ── Notice ────────────────────────────────────────
const NoticeSchema = new Schema({
  title:    { type: String, default: '' },
  type:     { type: String, default: 'info' }, // info / warn / success / danger
  body:     { type: String, default: '' },
  date:     { type: String, default: null },
  createdAt:{ type: Date, default: Date.now },
});

// ── Expense ───────────────────────────────────────
const ExpenseSchema = new Schema({
  id:       { type: String, required: true, unique: true },
  cat:      { type: String, default: 'other' },
  desc:     { type: String, default: '' },
  amount:   { type: Number, default: 0 },
  date:     { type: String, default: null },
  mode:     { type: String, default: 'Cash' },
  notes:    { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now },
});

// ── Employee ──────────────────────────────────────
const EmployeeSchema = new Schema({
  id:       { type: String, required: true, unique: true },
  name:     { type: String, default: '' },
  role:     { type: String, default: '' },
  phone:    { type: String, default: '' },
  salary:   { type: Number, default: 0 },
  join:     { type: String, default: null },  // YYYY-MM-DD
  addr:     { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now },
});

// ── Salary Record ─────────────────────────────────
const SalaryRecordSchema = new Schema({
  id:       { type: String, required: true, unique: true },
  empId:    { type: String, default: '' },
  empName:  { type: String, default: '' },
  month:    { type: String, default: '' },
  amount:   { type: Number, default: 0 },
  date:     { type: String, default: null },
  mode:     { type: String, default: 'Cash' },
  notes:    { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now },
});

// ── Emp Credentials ───────────────────────────────
const EmpCredSchema = new Schema({
  empId:    { type: String, default: '' },
  name:     { type: String, default: '' },
  loginId:  { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt:{ type: Date, default: Date.now },
});

// ── Settings ──────────────────────────────────────
const SettingSchema = new Schema({
  key:      { type: String, required: true, unique: true },
  value:    { type: Schema.Types.Mixed },
  updatedAt:{ type: Date, default: Date.now },
});

// ── Locker ────────────────────────────────────────
const LockerSchema = new Schema({
  no:         { type: Number, required: true, unique: true },
  memberId:   { type: String, default: '' },
  memberName: { type: String, default: '' },
  fee:        { type: Number, default: 0 },
  from:       { type: String, default: null },
  to:         { type: String, default: null },
  notes:      { type: String, default: '' },
  assignedAt: { type: Date, default: Date.now },
});

// ── Enquiry ───────────────────────────────────────
const EnquirySchema = new Schema({
  id:       { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  phone:    { type: String, default: '' },
  address:  { type: String, default: '' },
  shift:    { type: String, default: '' },
  cls:      { type: String, default: '' },
  date:     { type: String, default: null },
  status:   { type: String, default: 'Pending' },
  notes:    { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now },
});

// ── Recycle Bin ───────────────────────────────────
const RecycleBinSchema = new Schema({
  id:        { type: String, required: true, unique: true },
  type:      { type: String, required: true },
  label:     { type: String, default: '' },
  data:      { type: Schema.Types.Mixed },
  deletedAt: { type: Number, default: () => Date.now() },
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Member:       mongoose.model('Member',       MemberSchema),
  FeeRecord:    mongoose.model('FeeRecord',    FeeRecordSchema),
  FeeStructure: mongoose.model('FeeStructure', FeeStructureSchema),
  Attendance:   mongoose.model('Attendance',   AttendanceSchema),
  Notice:       mongoose.model('Notice',       NoticeSchema),
  Expense:      mongoose.model('Expense',      ExpenseSchema),
  Employee:     mongoose.model('Employee',     EmployeeSchema),
  SalaryRecord: mongoose.model('SalaryRecord', SalaryRecordSchema),
  EmpCred:      mongoose.model('EmpCred',      EmpCredSchema),
  Setting:      mongoose.model('Setting',      SettingSchema),
  Locker:       mongoose.model('Locker',       LockerSchema),
  Enquiry:      mongoose.model('Enquiry',      EnquirySchema),
  RecycleBin:   mongoose.model('RecycleBin',   RecycleBinSchema),
};
