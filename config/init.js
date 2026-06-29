const { getDb, saveDb } = require('./db');
const bcrypt = require('bcryptjs');

async function initDb() {
  const db = await getDb();

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration_days INTEGER NOT NULL,
    image_url TEXT,
    itinerary TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    travel_date TEXT NOT NULL,
    num_travelers INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'pending',
    transaction_ref TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    total_amount REAL NOT NULL,
    generated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_name TEXT NOT NULL,
    plate_number TEXT NOT NULL UNIQUE,
    owner_name TEXT NOT NULL,
    contact TEXT,
    capacity INTEGER DEFAULT 4,
    is_active INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS associates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'driver',
    contact TEXT,
    is_available INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS booking_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    associate_id INTEGER,
    assigned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (associate_id) REFERENCES associates(id)
  )`);

  // Seed admin user
  const adminCheck = db.exec(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  if (!adminCheck.length || !adminCheck[0].values.length) {
    const hash = await bcrypt.hash('admin123', 10);
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`,
      ['Admin', 'admin@travel.com', hash, 'admin']);

    // Seed packages
    const packages = [
      ['Sundarban Adventure', 'Explore the dense mangrove forests and spot Royal Bengal Tigers on this thrilling wildlife expedition.', 4500, 3, '/images/sundarban.jpg', 'Day 1: Arrival & boat safari\nDay 2: Forest trek & wildlife watch\nDay 3: Village tour & departure'],
      ['Darjeeling Hill Escape', 'Breathtaking Himalayan views, world-famous tea gardens, and the iconic toy train experience.', 6800, 4, '/images/darjeeling.jpg', 'Day 1: Arrival, Tiger Hill sunrise\nDay 2: Tea garden tour & toy train\nDay 3: Monastery visits\nDay 4: Shopping & departure'],
      ['Puri Beach Retreat', 'Golden sandy beaches, the sacred Jagannath Temple, and fresh Odia seafood await you.', 5200, 5, '/images/puri.jpg', 'Day 1: Arrival & beach\nDay 2: Jagannath Temple visit\nDay 3: Konark Sun Temple\nDay 4: Beach leisure\nDay 5: Departure'],
      ['Sikkim Monsoon Magic', 'Lush green valleys, cascading waterfalls and vibrant Buddhist monasteries in the clouds.', 8900, 6, '/images/sikkim.jpg', 'Day 1: Gangtok arrival\nDay 2: Rumtek Monastery\nDay 3: Tsomgo Lake\nDay 4: Pelling\nDay 5: Kanchenjunga viewpoint\nDay 6: Departure'],
      ['Rajasthan Royal Tour', 'Majestic forts, vibrant bazaars, camel safaris and the golden sands of the Thar desert.', 12500, 7, '/images/rajasthan.jpg', 'Day 1: Jaipur - City Palace\nDay 2: Amber Fort\nDay 3: Jodhpur - Mehrangarh\nDay 4: Jaisalmer Fort\nDay 5: Camel safari\nDay 6: Udaipur - Lake Palace\nDay 7: Departure'],
    ];
    for (const p of packages) {
      db.run(`INSERT INTO packages (name, description, price, duration_days, image_url, itinerary) VALUES (?,?,?,?,?,?)`, p);
    }

    // Seed vehicles
    db.run(`INSERT INTO vehicles (vehicle_name, plate_number, owner_name, contact, capacity) VALUES (?,?,?,?,?)`,
      ['Toyota Innova', 'WB-01-AB-1234', 'Ramesh Kumar', '9800012345', 7]);
    db.run(`INSERT INTO vehicles (vehicle_name, plate_number, owner_name, contact, capacity) VALUES (?,?,?,?,?)`,
      ['Tempo Traveller', 'WB-02-CD-5678', 'Suresh Das', '9800054321', 12]);

    // Seed associates
    db.run(`INSERT INTO associates (name, role, contact) VALUES (?,?,?)`, ['Arjun Singh', 'driver', '9700011111']);
    db.run(`INSERT INTO associates (name, role, contact) VALUES (?,?,?)`, ['Meena Sharma', 'guide', '9700022222']);

    // Seed a demo client
    const clientHash = await bcrypt.hash('client123', 10);
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`,
      ['Demo Client', 'client@travel.com', clientHash, 'client']);

    saveDb();
    console.log('✅ Database seeded');
  }

  saveDb();
  console.log('✅ Database ready');
}

module.exports = { initDb };
