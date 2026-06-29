const express = require('express');
const router = express.Router();
const { all, get, run } = require('../config/query');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Home
router.get('/', optionalAuth, async (req, res) => {
  const packages = await all('SELECT * FROM packages WHERE is_active=1 ORDER BY id LIMIT 6');
  res.render('client/home', { user: req.user, packages });
});

// All packages
router.get('/packages', optionalAuth, async (req, res) => {
  const packages = await all('SELECT * FROM packages WHERE is_active=1 ORDER BY id');
  res.render('client/packages', { user: req.user, packages });
});

// Package detail
router.get('/packages/:id', optionalAuth, async (req, res) => {
  const pkg = await get('SELECT * FROM packages WHERE id=? AND is_active=1', [req.params.id]);
  if (!pkg) return res.redirect('/packages');
  res.render('client/package-detail', { user: req.user, pkg });
});

// Book a package
router.get('/book/:id', authMiddleware, async (req, res) => {
  const pkg = await get('SELECT * FROM packages WHERE id=? AND is_active=1', [req.params.id]);
  if (!pkg) return res.redirect('/packages');
  res.render('client/book', { user: req.user, pkg, error: null, success: null });
});

router.post('/book/:id', authMiddleware, async (req, res) => {
  const pkg = await get('SELECT * FROM packages WHERE id=? AND is_active=1', [req.params.id]);
  if (!pkg) return res.redirect('/packages');
  const { travel_date, num_travelers, notes } = req.body;
  if (!travel_date || !num_travelers) {
    return res.render('client/book', { user: req.user, pkg, error: 'Please fill all required fields', success: null });
  }
  const result = await run(
    'INSERT INTO bookings (user_id, package_id, travel_date, num_travelers, notes) VALUES (?,?,?,?,?)',
    [req.user.id, pkg.id, travel_date, num_travelers, notes || '']
  );
  // Create payment record
  const amount = pkg.price * parseInt(num_travelers);
  await run('INSERT INTO payments (booking_id, amount) VALUES (?,?)', [result.lastID, amount]);
  res.render('client/book', { user: req.user, pkg, error: null, success: `Booking submitted! Your booking ID is #${result.lastID}. We'll confirm shortly.` });
});

// My bookings (dashboard)
router.get('/dashboard', authMiddleware, async (req, res) => {
  const bookings = await all(
    `SELECT b.*, p.name as package_name, p.price, p.duration_days, pay.amount, pay.status as pay_status
     FROM bookings b
     JOIN packages p ON b.package_id = p.id
     LEFT JOIN payments pay ON pay.booking_id = b.id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.render('client/dashboard', { user: req.user, bookings });
});

// Contact page
router.get('/contact', optionalAuth, (req, res) => {
  res.render('client/contact', { user: req.user });
});

module.exports = router;
