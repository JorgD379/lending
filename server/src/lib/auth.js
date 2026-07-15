const bcrypt = require('bcryptjs');

function checkPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compareSync(password, passwordHash);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) {
    return next();
  }
  res.status(401).json({ ok: false, error: 'Требуется вход в панель.' });
}

module.exports = { checkPassword: checkPassword, requireAuth: requireAuth };
