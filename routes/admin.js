const express = require('express');
const router = express.Router();
const { all, get, run } = require('../config/query');
const { adminOnly } = require('../middleware/auth');

router.use(adminOnly);

// Dashboard stats
router.get('/', async (req, res) => {
  const stats = {
    totalBookings: (await get('SELECT COUNT(*) as c FROM bookings')).c,
    pendingBookings: (await get("SELECT COUNT(*) as c FROM bookings WHERE status='pending'")).c,
    confirmedBookings: (await get("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'")).c,
    totalRevenue: (await get("SELECT COALESCE(SUM(amount),0) as c FROM payments WHERE status='completed'")).c,
    totalPackages: (await get('SELECT COUNT(*) as c FROM packages WHERE is_active=1')).c,
    totalClients: (await get("SELECT COUNT(*) as c FROM users WHERE role='client'")).c,
  };
  const recentBookings = await all(
    `SELECT b.*, u.name as client_name, p.name as package_name
     FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id
     ORDER BY b.created_at DESC LIMIT 8`
  );
  res.render('admin/dashboard', { user: req.user, stats, recentBookings });
});

// ─── BOOKINGS ───────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  const filter = req.query.status || 'all';
  let sql = `SELECT b.*, u.name as client_name, u.email as client_email, p.name as package_name, p.price,
             pay.amount, pay.status as pay_status
             FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id
             LEFT JOIN payments pay ON pay.booking_id=b.id`;
  if (filter !== 'all') sql += ` WHERE b.status='${filter}'`;
  sql += ' ORDER BY b.created_at DESC';
  const bookings = await all(sql);
  res.render('admin/bookings', { user: req.user, bookings, filter });
});

router.get('/bookings/:id', async (req, res) => {
  const booking = await get(
    `SELECT b.*, u.name as client_name, u.email as client_email, p.name as package_name, p.price, p.duration_days,
     pay.amount, pay.status as pay_status, pay.payment_method, pay.paid_at,
     inv.invoice_number, inv.generated_at as inv_date
     FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id
     LEFT JOIN payments pay ON pay.booking_id=b.id
     LEFT JOIN invoices inv ON inv.booking_id=b.id
     WHERE b.id=?`, [req.params.id]
  );
  if (!booking) return res.redirect('/admin/bookings');
  const assignment = await get(
    `SELECT ba.*, v.vehicle_name, v.plate_number, a.name as associate_name, a.role as associate_role
     FROM booking_assignments ba
     LEFT JOIN vehicles v ON ba.vehicle_id=v.id
     LEFT JOIN associates a ON ba.associate_id=a.id
     WHERE ba.booking_id=?`, [req.params.id]
  );
  const vehicles = await all('SELECT * FROM vehicles WHERE is_active=1');
  const associates = await all('SELECT * FROM associates WHERE is_available=1');
  res.render('admin/booking-detail', { user: req.user, booking, assignment, vehicles, associates });
});

router.post('/bookings/:id/status', async (req, res) => {
  const { status } = req.body;
  await run('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id]);
  res.redirect('/admin/bookings/' + req.params.id);
});

router.post('/bookings/:id/payment', async (req, res) => {
  const { pay_status, payment_method } = req.body;
  const paid_at = pay_status === 'completed' ? new Date().toISOString() : null;
  await run('UPDATE payments SET status=?, payment_method=?, paid_at=? WHERE booking_id=?',
    [pay_status, payment_method, paid_at, req.params.id]);
  await run('UPDATE bookings SET payment_status=? WHERE id=?',
    [pay_status === 'completed' ? 'paid' : 'unpaid', req.params.id]);
  res.redirect('/admin/bookings/' + req.params.id);
});

router.post('/bookings/:id/assign', async (req, res) => {
  const { vehicle_id, associate_id } = req.body;
  const existing = await get('SELECT id FROM booking_assignments WHERE booking_id=?', [req.params.id]);
  if (existing) {
    await run('UPDATE booking_assignments SET vehicle_id=?, associate_id=? WHERE booking_id=?',
      [vehicle_id || null, associate_id || null, req.params.id]);
  } else {
    await run('INSERT INTO booking_assignments (booking_id, vehicle_id, associate_id) VALUES (?,?,?)',
      [req.params.id, vehicle_id || null, associate_id || null]);
  }
  res.redirect('/admin/bookings/' + req.params.id);
});

router.post('/bookings/:id/invoice', async (req, res) => {
  const booking = await get('SELECT * FROM bookings WHERE id=?', [req.params.id]);
  const payment = await get('SELECT * FROM payments WHERE booking_id=?', [req.params.id]);
  const existing = await get('SELECT id FROM invoices WHERE booking_id=?', [req.params.id]);
  if (!existing) {
    const invNum = 'INV-' + new Date().getFullYear() + '-' + String(req.params.id).padStart(5, '0');
    await run('INSERT INTO invoices (booking_id, invoice_number, total_amount) VALUES (?,?,?)',
      [req.params.id, invNum, payment?.amount || 0]);
  }
  res.redirect('/admin/bookings/' + req.params.id);
});

// ─── PACKAGES ───────────────────────────────────────────────
router.get('/packages', async (req, res) => {
  const packages = await all('SELECT * FROM packages ORDER BY id DESC');
  res.render('admin/packages', { user: req.user, packages });
});

router.get('/packages/new', (req, res) => {
  res.render('admin/package-form', { user: req.user, pkg: null, error: null });
});

router.post('/packages/new', async (req, res) => {
  const { name, description, price, duration_days, image_url, itinerary } = req.body;
  if (!name || !price || !duration_days) return res.render('admin/package-form', { user: req.user, pkg: null, error: 'Name, price, and duration are required' });
  await run('INSERT INTO packages (name, description, price, duration_days, image_url, itinerary) VALUES (?,?,?,?,?,?)',
    [name, description, price, duration_days, image_url || '', itinerary || '']);
  res.redirect('/admin/packages');
});

router.get('/packages/:id/edit', async (req, res) => {
  const pkg = await get('SELECT * FROM packages WHERE id=?', [req.params.id]);
  if (!pkg) return res.redirect('/admin/packages');
  res.render('admin/package-form', { user: req.user, pkg, error: null });
});

router.post('/packages/:id/edit', async (req, res) => {
  const { name, description, price, duration_days, image_url, itinerary, is_active } = req.body;
  await run('UPDATE packages SET name=?, description=?, price=?, duration_days=?, image_url=?, itinerary=?, is_active=? WHERE id=?',
    [name, description, price, duration_days, image_url || '', itinerary || '', is_active ? 1 : 0, req.params.id]);
  res.redirect('/admin/packages');
});

router.post('/packages/:id/delete', async (req, res) => {
  await run('UPDATE packages SET is_active=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/packages');
});

// ─── CUSTOMERS ──────────────────────────────────────────────
router.get('/customers', async (req, res) => {
  const customers = await all(
    `SELECT u.*, COUNT(b.id) as booking_count
     FROM users u LEFT JOIN bookings b ON b.user_id=u.id
     WHERE u.role='client' GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.render('admin/customers', { user: req.user, customers });
});

// ─── VEHICLES ───────────────────────────────────────────────
router.get('/vehicles', async (req, res) => {
  const vehicles = await all('SELECT * FROM vehicles ORDER BY id DESC');
  res.render('admin/vehicles', { user: req.user, vehicles, error: null });
});

router.post('/vehicles/add', async (req, res) => {
  const { vehicle_name, plate_number, owner_name, contact, capacity } = req.body;
  try {
    await run('INSERT INTO vehicles (vehicle_name, plate_number, owner_name, contact, capacity) VALUES (?,?,?,?,?)',
      [vehicle_name, plate_number, owner_name, contact, capacity || 4]);
  } catch (e) {}
  res.redirect('/admin/vehicles');
});

router.post('/vehicles/:id/delete', async (req, res) => {
  await run('UPDATE vehicles SET is_active=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/vehicles');
});

// ─── ASSOCIATES ─────────────────────────────────────────────
router.get('/associates', async (req, res) => {
  const associates = await all('SELECT * FROM associates ORDER BY id DESC');
  res.render('admin/associates', { user: req.user, associates });
});

router.post('/associates/add', async (req, res) => {
  const { name, role, contact } = req.body;
  await run('INSERT INTO associates (name, role, contact) VALUES (?,?,?)', [name, role || 'driver', contact]);
  res.redirect('/admin/associates');
});

router.post('/associates/:id/toggle', async (req, res) => {
  const a = await get('SELECT is_available FROM associates WHERE id=?', [req.params.id]);
  await run('UPDATE associates SET is_available=? WHERE id=?', [a.is_available ? 0 : 1, req.params.id]);
  res.redirect('/admin/associates');
});

module.exports = router;
