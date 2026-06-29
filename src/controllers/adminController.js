const db = require('../config/db');

// Dashboard
exports.getDashboard = async (req, res) => {
  const [[{ total_bookings }]] = await db.query('SELECT COUNT(*) AS total_bookings FROM bookings');
  const [[{ pending }]] = await db.query('SELECT COUNT(*) AS pending FROM bookings WHERE status="pending"');
  const [[{ confirmed }]] = await db.query('SELECT COUNT(*) AS confirmed FROM bookings WHERE status="confirmed"');
  const [[{ revenue }]] = await db.query('SELECT COALESCE(SUM(p.amount),0) AS revenue FROM payments p WHERE p.status="completed"');
  const [[{ total_clients }]] = await db.query('SELECT COUNT(*) AS total_clients FROM users WHERE role="client"');
  const [recent] = await db.query(
    `SELECT b.*, u.name AS client_name, p.name AS package_name
     FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id
     ORDER BY b.created_at DESC LIMIT 8`
  );
  res.render('admin/dashboard', { user: req.user, stats: { total_bookings, pending, confirmed, revenue, total_clients }, recent });
};

// Bookings
exports.getBookings = async (req, res) => {
  const status = req.query.status || '';
  let q = `SELECT b.*, u.name AS client_name, p.name AS package_name FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id`;
  const params = [];
  if (status) { q += ' WHERE b.status = ?'; params.push(status); }
  q += ' ORDER BY b.created_at DESC';
  const [bookings] = await db.query(q, params);
  res.render('admin/bookings', { user: req.user, bookings, status });
};

exports.updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
  res.redirect('/admin/bookings');
};

exports.getBookingDetail = async (req, res) => {
  const [rows] = await db.query(
    `SELECT b.*, u.name AS client_name, u.email AS client_email, p.name AS package_name, p.price
     FROM bookings b JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id
     WHERE b.id = ?`, [req.params.id]
  );
  if (!rows.length) return res.redirect('/admin/bookings');
  const [vehicles] = await db.query('SELECT * FROM vehicles WHERE is_active=1');
  const [associates] = await db.query('SELECT * FROM associates WHERE is_available=1');
  const [assignments] = await db.query(
    `SELECT ba.*, v.vehicle_name, a.name AS associate_name FROM booking_assignments ba
     LEFT JOIN vehicles v ON ba.vehicle_id=v.id LEFT JOIN associates a ON ba.associate_id=a.id
     WHERE ba.booking_id = ?`, [req.params.id]
  );
  const [payment] = await db.query('SELECT * FROM payments WHERE booking_id = ?', [req.params.id]);
  const [invoice] = await db.query('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);
  res.render('admin/booking-detail', { user: req.user, booking: rows[0], vehicles, associates, assignments, payment: payment[0] || null, invoice: invoice[0] || null });
};

// Packages
exports.getPackages = async (req, res) => {
  const [packages] = await db.query('SELECT * FROM packages ORDER BY created_at DESC');
  res.render('admin/packages', { user: req.user, packages, success: req.query.success || null });
};

exports.getPackageForm = (req, res) => res.render('admin/package-form', { user: req.user, pkg: null, error: null });

exports.getEditPackage = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.redirect('/admin/packages');
  res.render('admin/package-form', { user: req.user, pkg: rows[0], error: null });
};

exports.postPackage = async (req, res) => {
  const { name, description, price, duration_days } = req.body;
  try {
    await db.query('INSERT INTO packages (name, description, price, duration_days) VALUES (?, ?, ?, ?)', [name, description, price, duration_days]);
    res.redirect('/admin/packages?success=1');
  } catch (e) {
    res.render('admin/package-form', { user: req.user, pkg: null, error: 'Failed to add package.' });
  }
};

exports.putPackage = async (req, res) => {
  const { name, description, price, duration_days, is_active } = req.body;
  await db.query('UPDATE packages SET name=?, description=?, price=?, duration_days=?, is_active=? WHERE id=?',
    [name, description, price, duration_days, is_active === 'on' ? 1 : 0, req.params.id]);
  res.redirect('/admin/packages?success=1');
};

exports.deletePackage = async (req, res) => {
  await db.query('UPDATE packages SET is_active=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/packages?success=1');
};

// Customers
exports.getCustomers = async (req, res) => {
  const [customers] = await db.query(
    `SELECT u.*, COUNT(b.id) AS total_bookings FROM users u
     LEFT JOIN bookings b ON u.id=b.user_id WHERE u.role='client'
     GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.render('admin/customers', { user: req.user, customers });
};

// Vehicles
exports.getVehicles = async (req, res) => {
  const [vehicles] = await db.query('SELECT * FROM vehicles ORDER BY created_at DESC');
  res.render('admin/vehicles', { user: req.user, vehicles, success: req.query.success || null });
};

exports.postVehicle = async (req, res) => {
  const { vehicle_name, plate_number, owner_name, contact, capacity } = req.body;
  await db.query('INSERT INTO vehicles (vehicle_name, plate_number, owner_name, contact, capacity) VALUES (?,?,?,?,?)',
    [vehicle_name, plate_number, owner_name, contact, capacity]);
  res.redirect('/admin/vehicles?success=1');
};

exports.deleteVehicle = async (req, res) => {
  await db.query('UPDATE vehicles SET is_active=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/vehicles?success=1');
};

// Associates
exports.getAssociates = async (req, res) => {
  const [associates] = await db.query('SELECT * FROM associates ORDER BY created_at DESC');
  res.render('admin/associates', { user: req.user, associates, success: req.query.success || null });
};

exports.postAssociate = async (req, res) => {
  const { name, role, contact } = req.body;
  await db.query('INSERT INTO associates (name, role, contact) VALUES (?,?,?)', [name, role, contact]);
  res.redirect('/admin/associates?success=1');
};

exports.deleteAssociate = async (req, res) => {
  await db.query('DELETE FROM associates WHERE id=?', [req.params.id]);
  res.redirect('/admin/associates?success=1');
};

// Assign vehicle + associate to booking
exports.postAssignment = async (req, res) => {
  const { vehicle_id, associate_id } = req.body;
  await db.query('INSERT INTO booking_assignments (booking_id, vehicle_id, associate_id) VALUES (?,?,?)',
    [req.params.id, vehicle_id || null, associate_id || null]);
  res.redirect('/admin/bookings/' + req.params.id);
};

// Payments
exports.getPayments = async (req, res) => {
  const [payments] = await db.query(
    `SELECT p.*, b.id AS booking_id, u.name AS client_name, pk.name AS package_name
     FROM payments p JOIN bookings b ON p.booking_id=b.id JOIN users u ON b.user_id=u.id JOIN packages pk ON b.package_id=pk.id
     ORDER BY p.created_at DESC`
  );
  res.render('admin/payments', { user: req.user, payments });
};

exports.postPayment = async (req, res) => {
  const { amount, payment_method } = req.body;
  const booking_id = req.params.id;
  await db.query(
    'INSERT INTO payments (booking_id, amount, payment_method, status, paid_at) VALUES (?,?,?,"completed",NOW()) ON DUPLICATE KEY UPDATE status="completed", paid_at=NOW()',
    [booking_id, amount, payment_method]
  );
  await db.query('UPDATE bookings SET payment_status="paid" WHERE id=?', [booking_id]);
  res.redirect('/admin/bookings/' + booking_id);
};

// Invoice generation
exports.generateInvoice = async (req, res) => {
  const booking_id = req.params.id;
  const [[booking]] = await db.query(
    `SELECT b.*, u.name AS client_name, p.name AS package_name, p.price FROM bookings b
     JOIN users u ON b.user_id=u.id JOIN packages p ON b.package_id=p.id WHERE b.id=?`, [booking_id]
  );
  if (!booking) return res.redirect('/admin/bookings');
  const invoice_number = 'INV-' + new Date().getFullYear() + '-' + String(booking_id).padStart(5, '0');
  const total = booking.price * (booking.num_travelers || 1);
  await db.query(
    'INSERT INTO invoices (booking_id, invoice_number, total_amount) VALUES (?,?,?) ON DUPLICATE KEY UPDATE invoice_number=VALUES(invoice_number), total_amount=VALUES(total_amount)',
    [booking_id, invoice_number, total]
  );
  res.redirect('/admin/bookings/' + booking_id);
};
