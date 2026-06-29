const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.getLogin = (req, res) => res.render('client/login', { error: null });
exports.getRegister = (req, res) => res.render('client/register', { error: null });

exports.postRegister = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.render('client/register', { error: 'Email already registered.' });
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "client")', [name, email, hash]);
    res.redirect('/login?registered=1');
  } catch (e) {
    res.render('client/register', { error: 'Registration failed. Try again.' });
  }
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.render('client/login', { error: 'Invalid email or password.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('client/login', { error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return user.role === 'admin' ? res.redirect('/admin/dashboard') : res.redirect('/dashboard');
  } catch (e) {
    res.render('client/login', { error: 'Login failed. Try again.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};
