const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.redirect('/login');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).render('client/error', { message: 'Access denied.' });
  next();
}

function clientOnly(req, res, next) {
  if (req.user?.role !== 'client') return res.redirect('/admin/dashboard');
  next();
}

module.exports = { authMiddleware, adminOnly, clientOnly };
