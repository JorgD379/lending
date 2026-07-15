require('dotenv').config();
const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  smtpHost: process.env.SMTP_HOST || 'smtp.yandex.ru',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailTo: process.env.MAIL_TO || 'info@lab-itis.ru',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://lab-itis.ru,https://www.lab-itis.ru')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean),
  port: Number(process.env.PORT || 3001),
  dbPath: process.env.DB_PATH || path.join(ROOT, 'data', 'leads.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT, 'uploads'),
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  sessionSecret: process.env.SESSION_SECRET,
  cookieSecure: process.env.NODE_ENV !== 'test',
};
