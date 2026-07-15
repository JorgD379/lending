const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const config = require('./config');
const { createDb } = require('./db');
const { createMailer } = require('./lib/mailer');
const { createLeadRouter } = require('./routes/lead');
const { createAdminRouter } = require('./routes/admin');

const VALID_SOURCES = ['home-form', 'modal-simple', 'modal-complex', 'contacts'];
const ADMIN_STATIC_DIR = path.join(__dirname, '..', 'public', 'admin');

function createApp(deps) {
  deps = deps || {};
  const leadsDb = deps.leadsDb || createDb(config.dbPath);
  const mailer = deps.mailer || createMailer({
    transporter: deps.transporter,
    smtpUser: config.smtpUser,
    mailTo: config.mailTo,
  });
  const uploadDir = deps.uploadDir || config.uploadDir;

  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({
    origin: function (origin, cb) {
      if (!origin || config.allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
      cb(new Error('CORS: origin not allowed'));
    },
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    },
  }));

  app.use('/api', createLeadRouter({
    leadsDb: leadsDb,
    mailer: mailer,
    uploadDir: uploadDir,
    validSources: VALID_SOURCES,
  }));

  app.use('/api', createAdminRouter({
    leadsDb: leadsDb,
    mailer: mailer,
    uploadDir: uploadDir,
    adminPasswordHash: config.adminPasswordHash,
  }));

  // Статика админ-панели (логин + список заявок) — /admin/index.html и т.д.
  // /api/admin/* выше — это данные, этот express.static — только HTML/CSS/JS панели.
  app.use('/admin', express.static(ADMIN_STATIC_DIR));

  app.get('/api/health', function (_req, res) {
    res.json({ ok: true, service: 'lab-itis-lead-mailer' });
  });

  app.use(function (err, _req, res, _next) {
    if (err && /CORS/i.test(err.message)) {
      return res.status(403).json({ ok: false, error: 'Запрос заблокирован (CORS).' });
    }
    console.error('[ERROR]', err);
    res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера.' });
  });

  return app;
}

module.exports = { createApp: createApp, VALID_SOURCES: VALID_SOURCES };
