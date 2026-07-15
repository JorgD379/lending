/**
 * lab-itis-lead-mailer
 * Точка входа. Вся логика — в src/app.js и src/routes/*.
 * Запуск: см. README.md (деплой на VPS через systemd + nginx).
 */

const config = require('./src/config');
const { createApp } = require('./src/app');
const nodemailer = require('nodemailer');

if (!config.smtpUser || !config.smtpPass) {
  console.error('[FATAL] SMTP_USER / SMTP_PASS не заданы. Заполните server/.env — см. .env.example');
  process.exit(1);
}
if (!config.adminPasswordHash) {
  console.error('[FATAL] ADMIN_PASSWORD_HASH не задан. См. README.md, раздел «Пароль администратора».');
  process.exit(1);
}
if (!config.sessionSecret) {
  console.error('[FATAL] SESSION_SECRET не задан. Заполните .env случайной строкой (например: openssl rand -hex 32).');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: { user: config.smtpUser, pass: config.smtpPass },
});

transporter.verify()
  .then(function () { console.log('[OK] SMTP-подключение к', config.smtpHost, 'установлено'); })
  .catch(function (err) { console.error('[WARN] Не удалось проверить SMTP-подключение:', err.message); });

const app = createApp({ transporter: transporter });

app.listen(config.port, function () {
  console.log('[OK] lab-itis-lead-mailer слушает порт ' + config.port);
});
