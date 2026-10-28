require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
const clientBuild = path.join(__dirname, 'public', 'dist');
app.use(express.static(clientBuild));
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Copy .env.example to .env and set a strong random value.');

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true }
}, { timestamps: true }));
const Room = mongoose.model('Room', new mongoose.Schema({
  number: { type: String, required: true, unique: true }, type: { type: String, required: true }, floor: Number,
  capacity: { type: Number, default: 2 }, price: { type: Number, required: true }, status: { type: String, enum: ['Available', 'Maintenance'], default: 'Available' }
}, { timestamps: true }));
const Booking = mongoose.model('Booking', new mongoose.Schema({
  guest: { type: String, required: true }, email: { type: String, required: true }, phone: String,
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true }, guests: { type: Number, default: 1 }, status: { type: String, enum: ['Confirmed', 'Checked in', 'Checked out', 'Cancelled'], default: 'Confirmed' },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' }, total: { type: Number, required: true }
}, { timestamps: true }));

const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).sub; next(); }
  catch { return res.status(401).json({ error: 'Your session expired. Please sign in again.' }); }
};
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email || !password || password.length < 8) return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account already exists for that email.' });
  const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { name: user.name, email: user.email } });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { name: user.name, email: user.email } });
}));

app.get('/api/rooms', auth, asyncRoute(async (_req, res) => res.json(await Room.find().sort({ number: 1 }))));
app.post('/api/rooms', auth, asyncRoute(async (req, res) => {
  const room = await Room.create(req.body); res.status(201).json(room);
}));
app.patch('/api/rooms/:id', auth, asyncRoute(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) return res.status(404).json({ error: 'Room not found.' }); res.json(room);
}));
app.get('/api/bookings', auth, asyncRoute(async (req, res) => {
  const query = {};
  if (req.query.search) query.$or = [{ guest: new RegExp(req.query.search, 'i') }, { email: new RegExp(req.query.search, 'i') }];
  if (req.query.status && req.query.status !== 'All statuses') query.status = req.query.status;
  res.json(await Booking.find(query).populate('room').sort({ checkIn: 1 }));
}));
app.post('/api/bookings', auth, asyncRoute(async (req, res) => {
  const { guest, email, room: roomId, checkIn, checkOut, guests = 1, phone = '' } = req.body;
  const start = new Date(checkIn), end = new Date(checkOut);
  if (!guest?.trim() || !email || !roomId || !Number.isFinite(+start) || !Number.isFinite(+end) || end <= start) return res.status(400).json({ error: 'Enter guest details, a room, and valid check-in and check-out dates.' });
  const room = await Room.findById(roomId);
  if (!room || room.status !== 'Available') return res.status(400).json({ error: 'That room is unavailable.' });
  const conflict = await Booking.exists({ room: roomId, status: { $in: ['Confirmed', 'Checked in'] }, checkIn: { $lt: end }, checkOut: { $gt: start } });
  if (conflict) return res.status(409).json({ error: 'That room is already booked for those dates.' });
  const nights = Math.ceil((end - start) / 86400000);
  const booking = await Booking.create({ guest: guest.trim(), email, phone, room: roomId, checkIn: start, checkOut: end, guests, total: nights * room.price });
  res.status(201).json(await booking.populate('room'));
}));
app.patch('/api/bookings/:id', auth, asyncRoute(async (req, res) => {
  const allowed = ['status', 'paymentStatus']; const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('room');
  if (!booking) return res.status(404).json({ error: 'Booking not found.' }); res.json(booking);
}));
app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(clientBuild, 'index.html')));
app.get('/api/summary', auth, asyncRoute(async (_req, res) => {
  const [rooms, active, arrivals, revenue] = await Promise.all([
    Room.countDocuments(), Booking.countDocuments({ status: { $in: ['Confirmed', 'Checked in'] } }),
    Booking.countDocuments({ status: 'Confirmed', checkIn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lt: new Date(new Date().setHours(24, 0, 0, 0)) } }),
    Booking.aggregate([{ $match: { paymentStatus: 'Paid', status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }])
  ]);
  res.json({ rooms, active, arrivals, revenue: revenue[0]?.total || 0 });
}));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((err, _req, res, _next) => {
  if (err.code === 11000) return res.status(409).json({ error: 'That room number or email is already in use.' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  console.error(err); res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotelpro')
  .then(() => app.listen(port, () => console.log(`HotelPro is running at http://localhost:${port}`)))
  .catch(err => { console.error('Could not connect to MongoDB:', err.message); process.exit(1); });
