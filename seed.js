require('dotenv').config();
const mongoose = require('mongoose');
const Room = mongoose.model('Room', new mongoose.Schema({ number: String, type: String, floor: Number, capacity: Number, price: Number, status: String }));
const Booking = mongoose.model('Booking', new mongoose.Schema({ guest: String, email: String, phone: String, room: mongoose.Schema.Types.ObjectId, checkIn: Date, checkOut: Date, guests: Number, status: String, paymentStatus: String, total: Number }));

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotelpro');
  await Booking.deleteMany({}); await Room.deleteMany({});
  const rooms = await Room.insertMany([
    { number: '101', type: 'Deluxe King', floor: 1, capacity: 2, price: 189, status: 'Available' },
    { number: '102', type: 'Twin Room', floor: 1, capacity: 2, price: 159, status: 'Available' },
    { number: '201', type: 'Executive Suite', floor: 2, capacity: 3, price: 289, status: 'Available' },
    { number: '202', type: 'Deluxe King', floor: 2, capacity: 2, price: 189, status: 'Available' },
    { number: '301', type: 'Family Suite', floor: 3, capacity: 4, price: 329, status: 'Available' },
    { number: '302', type: 'Twin Room', floor: 3, capacity: 2, price: 159, status: 'Maintenance' }
  ]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const inThree = new Date(today); inThree.setDate(today.getDate() + 3);
  await Booking.insertMany([
    { guest: 'Olivia Rhye', email: 'olivia@example.com', phone: '+1 555 0101', room: rooms[0]._id, checkIn: today, checkOut: inThree, guests: 2, status: 'Checked in', paymentStatus: 'Paid', total: 378 },
    { guest: 'Phoenix Baker', email: 'phoenix@example.com', phone: '+1 555 0102', room: rooms[2]._id, checkIn: tomorrow, checkOut: inThree, guests: 2, status: 'Confirmed', paymentStatus: 'Pending', total: 578 },
    { guest: 'Lana Steiner', email: 'lana@example.com', phone: '+1 555 0103', room: rooms[1]._id, checkIn: today, checkOut: tomorrow, guests: 1, status: 'Confirmed', paymentStatus: 'Paid', total: 159 },
    { guest: 'Demi Wilkinson', email: 'demi@example.com', phone: '+1 555 0104', room: rooms[4]._id, checkIn: inThree, checkOut: new Date(inThree.getTime() + 2 * 86400000), guests: 4, status: 'Confirmed', paymentStatus: 'Pending', total: 658 }
  ]);
  console.log('HotelPro sample rooms and bookings created.'); await mongoose.disconnect();
}
seed().catch(err => { console.error(err); process.exit(1); });
