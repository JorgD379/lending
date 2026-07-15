const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
}

function createLeadRouter(deps) {
  const leadsDb = deps.leadsDb;
  const mailer = deps.mailer;
  const uploadDir = deps.uploadDir;
  const validSources = deps.validSources;

  const leadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Слишком много заявок. Попробуйте позже.' },
  });

  const router = express.Router();

  router.post('/lead', leadLimiter, upload.single('file'), async function (req, res) {
    const b = req.body || {};

    if (b.website) {
      return res.json({ ok: true });
    }

    const name = (b.name || '').trim();
    const email = (b.email || '').trim();
    const phone = (b.phone || '').trim();
    const company = (b.company || '').trim();
    const industry = (b.industry || '').trim();
    const message = (b.message || '').trim();
    const consent = b.consent === 'true' || b.consent === 'on' || b.consent === '1';
    const marketing = b.marketing === 'true' || b.marketing === 'on' || b.marketing === '1';
    const source = validSources.indexOf(b.source) !== -1 ? b.source : null;

    if (!name || (!email && !phone)) {
      return res.status(400).json({ ok: false, error: 'Укажите имя и email или телефон.' });
    }
    if (email && !isEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Некорректный email.' });
    }
    if (!consent) {
      return res.status(400).json({ ok: false, error: 'Необходимо согласие на обработку персональных данных.' });
    }

    const leadPayload = {
      source: source, name: name, email: email, phone: phone,
      company: company, industry: industry, message: message,
      consent: consent, marketing: marketing,
    };

    let leadId;
    try {
      leadId = leadsDb.insertLead(Object.assign({}, leadPayload, { ip: req.ip }));

      if (req.file) {
        const leadDir = path.join(uploadDir, String(leadId));
        fs.mkdirSync(leadDir, { recursive: true });
        fs.writeFileSync(path.join(leadDir, req.file.originalname), req.file.buffer);
        leadsDb.setAttachmentPath(leadId, path.join(String(leadId), req.file.originalname));
      }
    } catch (err) {
      console.error('[ERROR] failed to save lead:', err);
      return res.status(500).json({ ok: false, error: 'Не удалось сохранить заявку. Попробуйте позже или напишите на info@lab-itis.ru' });
    }

    try {
      const attachment = req.file ? { filename: req.file.originalname, buffer: req.file.buffer } : null;
      await mailer.sendLeadEmail(leadPayload, attachment);
      leadsDb.markEmailResult(leadId, true, null);
    } catch (err) {
      console.error('[WARN] failed to send lead email:', err.message);
      leadsDb.markEmailResult(leadId, false, err.message);
    }

    res.json({ ok: true });
  });

  return router;
}

module.exports = { createLeadRouter: createLeadRouter };
