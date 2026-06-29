const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../config/query');
const SECRET = process.env.JWT_SECRET || 'travel_secret_key_2024';

router.get('/login', (req, res) => {
  if (req.cookies?.token) return res.redirect('/');
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('auth/login', { error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
});

router.get('/register', (req, res) => {
  if (req.cookies?.token) return res.redirect('/');
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.render('auth/register', { error: 'All fields required' });
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.render('auth/register', { error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  await run('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', [name, email, hash, 'client']);
  res.redirect('/auth/login?registered=1');
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
