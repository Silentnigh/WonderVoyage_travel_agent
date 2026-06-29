const db = require('../config/db');
const { sendWhatsAppNotification } = require('../utils/whatsapp');

exports.getHome = async (req, res) => {
  const [packages] = await db.query('SELECT * FROM packages WHERE is_active = 1 LIMIT 6');
  res.render('client/home', { packages, user: req.user || null });
};

exports.getPackages = async (req, res) => {
  const [packages] = await db.query('SELECT * FROM packages WHERE is_active = 1');
  res.render('client/packages', { packages, user: req.user || null });
};

exports.getPackageDetail = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM packages WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!rows.length) return res.redirect('/packages');
  res.render('client/package-detail', { pkg: rows[0], user: req.user || null });
};

exports.getBookingForm = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM packages WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!rows.length) return res.redirect('/packages');
  res.render('client/booking-form', { pkg: rows[0], user: req.user, error: null, success: null });
};

exports.postBooking = async (req, res) => {
  const { package_id, travel_date, num_travelers, notes } = req.body;
  const [pkgRows] = await db.query('SELECT * FROM packages WHERE id = ?', [package_id]);
  if (!pkgRows.length) return res.redirect('/packages');
  const pkg = pkgRows[0];

  try {
    const [result] = await db.query(
      'INSERT INTO bookings (user_id, package_id, travel_date, num_travelers, notes, status, payment_status) VALUES (?, ?, ?, ?, ?, "pending", "unpaid")',
      [req.user.id, package_id, travel_date, num_travelers, notes || '']
    );
    await sendWhatsAppNotification(req.user.name, pkg.name, travel_date, num_travelers);
    res.redirect('/dashboard?booked=1');
  } catch (e) {
    res.render('client/booking-form', { pkg, user: req.user, error: 'Booking failed. Please try again.', success: null });
  }
};

exports.getDashboard = async (req, res) => {
  const [bookings] = await db.query(
    `SELECT b.*, p.name AS package_name, p.price, p.duration_days
     FROM bookings b JOIN packages p ON b.package_id = p.id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.render('client/dashboard', { user: req.user, bookings, booked: req.query.booked === '1' });
};

exports.getContact = (req, res) => res.render('client/contact', { user: req.user || null, success: null });
