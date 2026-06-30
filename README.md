# WonderVoyage – Travel Agency Booking System

A full-stack travel agency web app built with Node.js, Express, EJS, CSS and SQLite (sql.js).

## Features

**Client side**
- Browse travel packages with details & itinerary
- Register & login with JWT auth
- Book packages with live price calculation
- Track bookings & payment status on personal dashboard

**Admin panel**
- Dashboard with live stats (bookings, revenue, clients)
- Manage all bookings — confirm, cancel, filter by status
- Assign vehicles & associates to bookings
- Generate invoices
- Full CRUD for packages
- Manage customers, vehicles, associates

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# App runs at http://localhost:3000
```

## Demo Accounts

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Admin  | admin@travel.com       | admin123   |
| Client | client@travel.com      | client123  |

## Project Structure

```
travel-agency/
├── app.js                  # Entry point
├── config/
│   ├── db.js               # sql.js database connection
│   ├── init.js             # Schema creation & seed data
│   └── query.js            # Query helpers (all, get, run)
├── middleware/
│   └── auth.js             # JWT middleware
├── routes/
│   ├── auth.js             # Login, register, logout
│   ├── client.js           # Public & client routes
│   └── admin.js            # Admin panel routes
├── views/
│   ├── partials/           # Navbar, sidebar, header, footer
│   ├── auth/               # Login, register
│   ├── client/             # Home, packages, book, dashboard
│   └── admin/              # Dashboard, bookings, packages...
├── public/
│   └── css/style.css       # Complete stylesheet
└── data/
    └── travel.db           # SQLite database (auto-created)
```

## Environment Variables (optional)

Create a `.env` file:
```
PORT=3000
JWT_SECRET=your_secret_key_here
```
