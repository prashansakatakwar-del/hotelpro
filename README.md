# HotelPro

A MERN hotel operations MVP for managing rooms, reservations, guest details, arrivals, and payment status. Built with React, Express, MongoDB, and Mongoose.

## Demo video

Add the hosted demo video URL here after recording and uploading it.

## What’s included

- Account registration and sign-in with bcrypt password hashing and signed JWT sessions.
- Room inventory with availability and maintenance status.
- Reservation creation with date-overlap checks and automatic nightly totals.
- Reservation status updates for check-in, check-out, cancellation, and confirmation.
- Guest directory, today’s arrivals, property summary, and basic reports.
- Sample property inventory and reservations through the seed script.

## Run locally

### Requirements

- Node.js 18 or later
- MongoDB running locally, or a MongoDB connection string

### Setup

```sh
npm install
cp .env.example .env
```

Edit `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`. Then seed sample rooms and reservations:

```sh
npm run seed
npm run dev
```

Run `npm run dev`, open [http://localhost:5173](http://localhost:5173), and create an account from the sign-in screen. For production, run `npm run build` followed by `npm start`; Express serves the built React app at [http://localhost:3000](http://localhost:3000). The seed script resets the room and reservation collections before adding sample data; run it only when you are comfortable replacing those collections.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/summary` | Property counts and paid revenue |
| `GET`, `POST` | `/api/rooms` | List and add rooms |
| `PATCH` | `/api/rooms/:id` | Update room service status |
| `GET`, `POST` | `/api/bookings` | List and create reservations |
| `PATCH` | `/api/bookings/:id` | Update reservation or payment status |

All routes other than register and login require a bearer token. Booking and payment data are demonstration workflows: HotelPro records payment status but does not process card payments or connect to a payment provider.

## Suggested next steps

1. Add automated API and browser tests.
2. Add authorization roles for owners, managers, and front-desk staff.
3. Connect a payment provider and protect webhook routes.
4. Add persistent audit history, pagination, and reporting date ranges.
5. Deploy behind HTTPS and configure production secrets and database backups.
