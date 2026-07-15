const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { requireAuth, checkPassword } = require('../lib/auth');

function createAdminRouter(deps) {
  const leadsDb = deps.leadsDb;
  const mailer = deps.mailer;
  const uploadDir = deps.uploadDir;
  const adminPasswordHash = deps.adminPasswordHash;

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Слишком много попыток входа. Попробуйте позже.' },
  });

  const router = express.Router();

  router.post('/admin/login', loginLimiter, function (req, res) {
    const password = (req.body && req.body.password) || '';
    if (!checkPassword(password, adminPasswordHash)) {
      return res.status(401).json({ ok: false, error: 'Неверный пароль.' });
    }
    req.session.authed = true;
    res.json({ ok: true });
  });

  router.post('/admin/logout', function (req, res) {
    req.session.destroy(function () {
      res.json({ ok: true });
    });
  });

  router.get('/admin/leads', requireAuth, function (req, res) {
    const result = leadsDb.listLeads({
      status: req.query.status,
      source: req.query.source,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ ok: true, data: result });
  });

  router.get('/admin/leads/:id', requireAuth, function (req, res) {
    const lead = leadsDb.getLeadById(Number(req.params.id));
    if (!lead) return res.status(404).json({ ok: false, error: 'Заявка не найдена.' });
    res.json({ ok: true, data: lead });
  });

  router.patch('/admin/leads/:id/status', requireAuth, function (req, res) {
    const status = req.body && req.body.status;
    try {
      const updated = leadsDb.updateStatus(Number(req.params.id), status);
      if (!updated) return res.status(404).json({ ok: false, error: 'Заявка не найдена.' });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ ok: false, error: 'Некорректный статус.' });
    }
  });

  router.post('/admin/leads/:id/resend-email', requireAuth, async function (req, res) {
    const lead = leadsDb.getLeadById(Number(req.params.id));
    if (!lead) return res.status(404).json({ ok: false, error: 'Заявка не найдена.' });

    let attachment = null;
    if (lead.attachment_path) {
      const fullPath = path.join(uploadDir, lead.attachment_path);
      if (fs.existsSync(fullPath)) {
        attachment = { filename: path.basename(fullPath), buffer: fs.readFileSync(fullPath) };
      }
    }

    try {
      await mailer.sendLeadEmail(lead, attachment);
      leadsDb.markEmailResult(lead.id, true, null);
      res.json({ ok: true });
    } catch (err) {
      leadsDb.markEmailResult(lead.id, false, err.message);
      res.status(502).json({ ok: false, error: 'Не удалось отправить письмо: ' + err.message });
    }
  });

  router.get('/admin/leads/:id/attachment', requireAuth, function (req, res) {
    const lead = leadsDb.getLeadById(Number(req.params.id));
    if (!lead || !lead.attachment_path) return res.status(404).json({ ok: false, error: 'Файл не найден.' });
    const fullPath = path.join(uploadDir, lead.attachment_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ ok: false, error: 'Файл не найден.' });
    res.download(fullPath);
  });

  return router;
}

module.exports = { createAdminRouter: createAdminRouter };
