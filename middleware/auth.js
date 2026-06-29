const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'travel_secret_key_2024';

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/auth/login');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
}

function adminOnly(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/auth/login');
  try {
    req.user = jwt.verify(token, SECRET);
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch {}
  }
  next();
}

module.exports = { authMiddleware, adminOnly, optionalAuth };
