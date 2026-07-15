# Переезд на VPS + бэкенд для заявок (SQLite + админ-панель) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перестроить `server/` так, чтобы заявки с сайта писались в SQLite (не терялись, если email не ушёл) и были видны в защищённой админ-панели, подготовить сайт и конфиги к раздаче с одного VPS вместо GitHub Pages, добавить базовую SEO/perf-гигиену.

**Architecture:** Express-приложение собирается из независимых модулей с dependency injection (`db.js` — фабрика SQLite-хранилища, `lib/mailer.js` — фабрика отправки писем поверх nodemailer-транспорта, `lib/auth.js` — проверка пароля и middleware сессии, `routes/lead.js` и `routes/admin.js` — роутеры, получающие зависимости через фабрику). Это позволяет тестировать каждый роут с in-memory SQLite (`:memory:`) и поддельным mailer'ом, без реального SMTP. nginx на VPS раздаёт статику сайта напрямую и проксирует `/api/*` в этот процесс — CORS между фронтом и бэком больше не нужен, `LEAD_API_URL` на фронте становится относительным.

**Tech Stack:** Node.js (>=18) + Express, better-sqlite3, bcryptjs, express-session, express-rate-limit, multer, nodemailer, встроенный `node:test` + supertest для тестов бэкенда, nginx + certbot на VPS.

Спека: `docs/superpowers/specs/2026-07-13-vps-migration-backend-design.md`

---

## Карта файлов

```
server/
  package.json                — обновляется (новые зависимости, npm test)
  server.js                    — точка входа (переписывается, тонкая)
  .env.example                 — обновляется (новые переменные)
  README.md                    — переписывается под однодоменный VPS-деплой
  nginx-api.conf.example       — удаляется (был для отдельного поддомена)
  src/
    config.js                  — новый: чтение всех env-переменных в одном месте
    app.js                      — новый: сборка Express-приложения (DI)
    db.js                        — новый: фабрика SQLite-хранилища заявок
    lib/
      mailer.js                — новый: сборка письма + отправка через транспорт
      auth.js                   — новый: проверка пароля + middleware сессии
    routes/
      lead.js                   — новый: POST /api/lead (было в server.js)
      admin.js                  — новый: /api/admin/* (логин, список, статус, resend, файл)
  test/
    lead.test.js                — новый
    admin.test.js               — новый
  public/
    admin/
      index.html                — новый: страница логина + панель заявок
      admin.css                  — новый
      admin.js                    — новый
  deploy/
    nginx-site.conf.example     — новый: конфиг nginx для всего домена (статика + /api)
    backup-leads.sh              — новый: cron-скрипт бэкапа SQLite + вложений
    lab-itis-mailer.service     — переносится сюда из корня server/ (без изменений)

(в корне репозитория, не в server/)
CNAME                           — удаляется (артефакт GitHub Pages)
robots.txt                       — новый
sitemap.xml                      — новый
js/main.js                       — правка: LEAD_API_URL становится относительным '/api/lead'
```

---

## Task 1: Тестовый харнесс + характеризующий тест текущего /api/lead

Цель — прежде чем рефакторить `server.js`, зафиксировать тестом то, как эндпоинт ведёт себя сейчас (honeypot, валидация, лимит), чтобы рефакторинг в следующих задачах не сломал поведение незаметно.

**Files:**
- Modify: `server/package.json`
- Create: `server/test/lead.characterization.test.js`

- [ ] **Step 1: Добавить dev-зависимость supertest и npm-скрипт теста**

Открыть `server/package.json` и заменить блок `scripts`/`devDependencies`:

```json
{
  "name": "lab-itis-lead-mailer",
  "version": "1.0.0",
  "description": "Принимает заявки с форм lab-itis.ru, пишет их в SQLite и отправляет на почту через Яндекс SMTP",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test test/"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.3.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.0",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.14"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  }
}
```

Run: `cd server && npm install`
Expected: устанавливает новые зависимости без ошибок.

- [ ] **Step 2: Написать характеризующий тест для текущего сервера**

Создать `server/test/lead.characterization.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

function waitForServer(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise(function (resolve, reject) {
    (function attempt() {
      const req = http.get('http://127.0.0.1:' + port + '/api/health', function (res) {
        res.resume();
        resolve();
      });
      req.on('error', function () {
        if (Date.now() > deadline) return reject(new Error('server did not start in time'));
        setTimeout(attempt, 150);
      });
    })();
  });
}

test('characterization: current server rejects missing consent with 400', async function (t) {
  const env = Object.assign({}, process.env, {
    SMTP_HOST: 'localhost',
    SMTP_PORT: '2599',
    SMTP_USER: 'info@lab-itis.ru',
    SMTP_PASS: 'dummy',
    MAIL_TO: 'info@lab-itis.ru',
    ALLOWED_ORIGINS: 'https://lab-itis.ru',
    PORT: '3999',
  });

  const child = spawn('node', [path.join(__dirname, '..', 'server.js')], { env: env });
  t.after(function () { child.kill(); });

  await waitForServer(3999, 5000);

  const res = await fetch('http://127.0.0.1:3999/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'name=Test&email=test@example.com',
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.ok, false);
});
```

- [ ] **Step 3: Запустить тест на ТЕКУЩЕМ (нерефакторенном) server.js и убедиться, что он проходит**

Run: `cd server && npm test`
Expected: PASS (тест проходит на текущем коде — это baseline, который не должен сломаться в следующих задачах).

- [ ] **Step 4: Закоммитить**

```bash
cd server
git add package.json test/lead.characterization.test.js
git commit -m "test: add characterization test for current /api/lead behaviour"
```

---

## Task 2: config.js — единая точка чтения переменных окружения

**Files:**
- Create: `server/src/config.js`

- [ ] **Step 1: Написать config.js**

```js
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
```

- [ ] **Step 2: Проверить, что модуль загружается без ошибок**

Run: `cd server && node -e "console.log(require('./src/config').mailTo)"`
Expected: печатает `info@lab-itis.ru` (или значение из `.env`, если он уже существует), без исключений.

- [ ] **Step 3: Закоммитить**

```bash
cd server
git add src/config.js
git commit -m "feat: extract config.js for centralized env reading"
```

---

## Task 3: db.js — SQLite-хранилище заявок (TDD)

**Files:**
- Create: `server/src/db.js`
- Test: `server/test/db.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/test/db.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDb } = require('../src/db');

function freshDb() {
  return createDb(':memory:');
}

test('insertLead + getLeadById round-trip', function () {
  const db = freshDb();
  const id = db.insertLead({
    source: 'contacts',
    name: 'Иван Петров',
    email: 'ivan@zavod.ru',
    phone: '+79990001122',
    company: 'ООО Завод',
    industry: 'металлургия',
    message: 'Нужен контроль дефектов',
    consent: true,
    marketing: false,
    ip: '127.0.0.1',
  });

  const lead = db.getLeadById(id);

  assert.equal(lead.name, 'Иван Петров');
  assert.equal(lead.email, 'ivan@zavod.ru');
  assert.equal(lead.consent, 1);
  assert.equal(lead.marketing, 0);
  assert.equal(lead.status, 'new');
  assert.equal(lead.email_sent, 0);
});

test('listLeads filters by status and search query', function () {
  const db = freshDb();
  db.insertLead({ source: 'contacts', name: 'Alpha', email: 'a@test.ru', consent: true });
  const id2 = db.insertLead({ source: 'contacts', name: 'Beta', email: 'b@test.ru', consent: true });
  db.updateStatus(id2, 'won');

  const won = db.listLeads({ status: 'won' });
  assert.equal(won.total, 1);
  assert.equal(won.items[0].name, 'Beta');

  const bySearch = db.listLeads({ q: 'alpha' });
  assert.equal(bySearch.total, 1);
  assert.equal(bySearch.items[0].name, 'Alpha');
});

test('updateStatus rejects invalid status', function () {
  const db = freshDb();
  const id = db.insertLead({ source: 'contacts', name: 'Gamma', consent: true });
  assert.throws(function () { db.updateStatus(id, 'bogus'); });
});

test('setAttachmentPath and markEmailResult update the row', function () {
  const db = freshDb();
  const id = db.insertLead({ source: 'contacts', name: 'Delta', consent: true });

  db.setAttachmentPath(id, String(id) + '/tz.pdf');
  db.markEmailResult(id, false, 'connection refused');

  const lead = db.getLeadById(id);
  assert.equal(lead.attachment_path, String(id) + '/tz.pdf');
  assert.equal(lead.email_sent, 0);
  assert.equal(lead.email_error, 'connection refused');
});
```

- [ ] **Step 2: Убедиться, что тест падает (модуля ещё нет)**

Run: `cd server && node --test test/db.test.js`
Expected: FAIL с ошибкой `Cannot find module '../src/db'`.

- [ ] **Step 3: Реализовать db.js**

Создать `server/src/db.js`:

```js
const Database = require('better-sqlite3');

const VALID_STATUSES = ['new', 'in_progress', 'won', 'lost'];

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS leads (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
  '  created_at TEXT NOT NULL,',
  '  source TEXT,',
  '  name TEXT NOT NULL,',
  '  email TEXT,',
  '  phone TEXT,',
  '  company TEXT,',
  '  industry TEXT,',
  '  message TEXT,',
  '  consent INTEGER NOT NULL DEFAULT 0,',
  '  marketing INTEGER NOT NULL DEFAULT 0,',
  '  attachment_path TEXT,',
  '  ip TEXT,',
  "  status TEXT NOT NULL DEFAULT 'new',",
  '  email_sent INTEGER NOT NULL DEFAULT 0,',
  '  email_error TEXT',
  ')',
].join('\n');

function createDb(filePath) {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  const insertStmt = db.prepare(
    'INSERT INTO leads ' +
    '(created_at, source, name, email, phone, company, industry, message, consent, marketing, ip, status, email_sent) ' +
    "VALUES (@created_at, @source, @name, @email, @phone, @company, @industry, @message, @consent, @marketing, @ip, 'new', 0)"
  );

  function insertLead(lead) {
    const info = insertStmt.run({
      created_at: new Date().toISOString(),
      source: lead.source || null,
      name: lead.name,
      email: lead.email || null,
      phone: lead.phone || null,
      company: lead.company || null,
      industry: lead.industry || null,
      message: lead.message || null,
      consent: lead.consent ? 1 : 0,
      marketing: lead.marketing ? 1 : 0,
      ip: lead.ip || null,
    });
    return info.lastInsertRowid;
  }

  function setAttachmentPath(id, attachmentPath) {
    db.prepare('UPDATE leads SET attachment_path = ? WHERE id = ?').run(attachmentPath, id);
  }

  function markEmailResult(id, sent, errorMessage) {
    db.prepare('UPDATE leads SET email_sent = ?, email_error = ? WHERE id = ?')
      .run(sent ? 1 : 0, errorMessage || null, id);
  }

  function getLeadById(id) {
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  }

  function listLeads(filters) {
    filters = filters || {};
    const clauses = [];
    const params = {};

    if (filters.status) {
      clauses.push('status = @status');
      params.status = filters.status;
    }
    if (filters.source) {
      clauses.push('source = @source');
      params.source = filters.source;
    }
    if (filters.q) {
      clauses.push('(name LIKE @q OR email LIKE @q OR phone LIKE @q OR company LIKE @q)');
      params.q = '%' + filters.q + '%';
    }

    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) AS c FROM leads ' + where).get(params).c;
    const items = db.prepare(
      'SELECT * FROM leads ' + where + ' ORDER BY id DESC LIMIT @limit OFFSET @offset'
    ).all(Object.assign({}, params, { limit: pageSize, offset: offset }));

    return { items: items, total: total, page: page, pageSize: pageSize };
  }

  function updateStatus(id, status) {
    if (VALID_STATUSES.indexOf(status) === -1) {
      throw new Error('invalid status: ' + status);
    }
    const info = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
    return info.changes > 0;
  }

  return {
    raw: db,
    insertLead: insertLead,
    setAttachmentPath: setAttachmentPath,
    markEmailResult: markEmailResult,
    getLeadById: getLeadById,
    listLeads: listLeads,
    updateStatus: updateStatus,
  };
}

module.exports = { createDb: createDb, VALID_STATUSES: VALID_STATUSES };
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/db.test.js`
Expected: PASS (4 теста, 0 ошибок).

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add src/db.js test/db.test.js
git commit -m "feat: add SQLite leads store with TDD coverage"
```

---

## Task 4: lib/mailer.js — сборка письма + отправка (TDD)

**Files:**
- Create: `server/src/lib/mailer.js`
- Test: `server/test/mailer.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/test/mailer.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMailer, buildLeadEmail, sourceLabel } = require('../src/lib/mailer');

test('sourceLabel returns human label for known sources, fallback for unknown', function () {
  assert.equal(sourceLabel('contacts'), 'Страница «Контакты»');
  assert.equal(sourceLabel('unknown-thing'), 'Форма на сайте (источник не указан)');
});

test('buildLeadEmail includes reply-to only for valid email', function () {
  const withEmail = buildLeadEmail(
    { source: 'contacts', name: 'Иван', email: 'ivan@zavod.ru', marketing: false },
    'info@lab-itis.ru',
    'info@lab-itis.ru'
  );
  assert.equal(withEmail.replyTo, 'ivan@zavod.ru');
  assert.match(withEmail.subject, /Страница «Контакты»/);

  const withoutEmail = buildLeadEmail(
    { source: 'contacts', name: 'Иван', email: '', marketing: false },
    'info@lab-itis.ru',
    'info@lab-itis.ru'
  );
  assert.equal(withoutEmail.replyTo, undefined);
});

test('createMailer.sendLeadEmail calls transporter.sendMail with attachment', async function () {
  const calls = [];
  const fakeTransporter = {
    sendMail: async function (mail) {
      calls.push(mail);
      return { messageId: 'fake-id' };
    },
  };

  const mailer = createMailer({ transporter: fakeTransporter, smtpUser: 'info@lab-itis.ru', mailTo: 'info@lab-itis.ru' });

  await mailer.sendLeadEmail(
    { source: 'modal-complex', name: 'Иван', email: 'ivan@zavod.ru', marketing: true },
    { filename: 'tz.pdf', buffer: Buffer.from('hello') }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].attachments[0].filename, 'tz.pdf');
  assert.equal(calls[0].to, 'info@lab-itis.ru');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd server && node --test test/mailer.test.js`
Expected: FAIL с `Cannot find module '../src/lib/mailer'`.

- [ ] **Step 3: Реализовать mailer.js**

Создать `server/src/lib/mailer.js`:

```js
const SOURCE_LABELS = {
  'home-form': 'Главная — блок «04 / Заявка»',
  'modal-simple': 'Модальное окно — «Обсудить проект»',
  'modal-complex': 'Модальное окно — «Детальный проект»',
  'contacts': 'Страница «Контакты»',
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[<>&]/g, function (c) {
    return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
  });
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
}

function sourceLabel(source) {
  return SOURCE_LABELS[source] || 'Форма на сайте (источник не указан)';
}

function buildLeadEmail(lead, smtpUser, mailTo) {
  const label = sourceLabel(lead.source);
  const rows = [
    ['Источник', label],
    ['Имя', lead.name],
    ['Телефон', lead.phone || '—'],
    ['Email', lead.email || '—'],
    ['Компания', lead.company || '—'],
    ['Отрасль', lead.industry || '—'],
    ['Согласие на рассылки', lead.marketing ? 'да' : 'нет'],
  ];

  const htmlRows = rows.map(function (row) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#777;white-space:nowrap;vertical-align:top;">' +
      esc(row[0]) + '</td><td style="padding:6px 0;">' + esc(row[1]) + '</td></tr>';
  }).join('');

  const htmlMessageRow = lead.message
    ? '<tr><td style="padding:6px 12px 6px 0;color:#777;vertical-align:top;">Описание задачи</td>' +
      '<td style="padding:6px 0;white-space:pre-wrap;">' + esc(lead.message) + '</td></tr>'
    : '';

  const html = '<h2 style="font-family:sans-serif;">Новая заявка с сайта lab-itis.ru</h2>' +
    '<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">' +
    htmlRows + htmlMessageRow + '</table>';

  const text = rows.map(function (row) { return row[0] + ': ' + row[1]; }).join('\n') +
    (lead.message ? '\n\nОписание задачи:\n' + lead.message : '');

  const mail = {
    from: '"Заявки lab-itis.ru" <' + smtpUser + '>',
    to: mailTo,
    subject: 'Заявка с сайта — ' + label,
    text: text,
    html: html,
  };

  if (lead.email && isEmail(lead.email)) {
    mail.replyTo = lead.email;
  }

  return mail;
}

function createMailer(options) {
  const transporter = options.transporter;
  const smtpUser = options.smtpUser;
  const mailTo = options.mailTo;

  function sendLeadEmail(lead, attachment) {
    const mail = buildLeadEmail(lead, smtpUser, mailTo);
    if (attachment) {
      mail.attachments = [{ filename: attachment.filename, content: attachment.buffer }];
    }
    return transporter.sendMail(mail);
  }

  return { transporter: transporter, sendLeadEmail: sendLeadEmail };
}

module.exports = {
  createMailer: createMailer,
  buildLeadEmail: buildLeadEmail,
  isEmail: isEmail,
  sourceLabel: sourceLabel,
  SOURCE_LABELS: SOURCE_LABELS,
};
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/mailer.test.js`
Expected: PASS (3 теста).

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add src/lib/mailer.js test/mailer.test.js
git commit -m "feat: extract mailer module with injectable transporter"
```

---

## Task 5: lib/auth.js — проверка пароля и middleware сессии (TDD)

**Files:**
- Create: `server/src/lib/auth.js`
- Test: `server/test/auth.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/test/auth.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { checkPassword, requireAuth } = require('../src/lib/auth');

test('checkPassword accepts correct password and rejects wrong one', function () {
  const hash = bcrypt.hashSync('correct-horse', 10);
  assert.equal(checkPassword('correct-horse', hash), true);
  assert.equal(checkPassword('wrong', hash), false);
});

test('checkPassword returns false when hash is missing', function () {
  assert.equal(checkPassword('anything', undefined), false);
});

test('requireAuth calls next() when session.authed is true', function () {
  let nextCalled = false;
  const req = { session: { authed: true } };
  const res = { status: function () { return this; }, json: function () {} };
  requireAuth(req, res, function () { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requireAuth responds 401 when not authed', function () {
  let statusCode = null;
  let body = null;
  const req = { session: {} };
  const res = {
    status: function (code) { statusCode = code; return this; },
    json: function (payload) { body = payload; },
  };
  requireAuth(req, res, function () { throw new Error('next should not be called'); });
  assert.equal(statusCode, 401);
  assert.equal(body.ok, false);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd server && node --test test/auth.test.js`
Expected: FAIL с `Cannot find module '../src/lib/auth'`.

- [ ] **Step 3: Реализовать auth.js**

Создать `server/src/lib/auth.js`:

```js
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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/auth.test.js`
Expected: PASS (4 теста).

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add src/lib/auth.js test/auth.test.js
git commit -m "feat: add auth helpers (password check + session middleware)"
```

---

## Task 6: routes/lead.js — приём заявок с записью в БД (TDD)

**Files:**
- Create: `server/src/routes/lead.js`
- Test: `server/test/lead.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/test/lead.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createDb } = require('../src/db');
const { createLeadRouter } = require('../src/routes/lead');

const VALID_SOURCES = ['home-form', 'modal-simple', 'modal-complex', 'contacts'];

function buildApp(overrides) {
  overrides = overrides || {};
  const leadsDb = overrides.leadsDb || createDb(':memory:');
  const mailer = overrides.mailer || {
    sendLeadEmail: async function () { return { messageId: 'ok' }; },
  };

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', createLeadRouter({
    leadsDb: leadsDb,
    mailer: mailer,
    uploadDir: overrides.uploadDir || '/tmp/lab-itis-test-uploads',
    validSources: VALID_SOURCES,
  }));

  return { app: app, leadsDb: leadsDb };
}

test('POST /api/lead rejects missing consent', async function () {
  const { app } = buildApp();
  const res = await request(app)
    .post('/api/lead')
    .type('form')
    .send({ name: 'Test', email: 'test@example.com' });

  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
});

test('POST /api/lead honeypot silently accepts and does not store the lead', async function () {
  const { app, leadsDb } = buildApp();
  const res = await request(app)
    .post('/api/lead')
    .type('form')
    .send({ name: 'Bot', email: 'bot@spam.com', consent: 'true', website: 'http://spam.com' });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(leadsDb.listLeads({}).total, 0);
});

test('POST /api/lead saves the lead to the DB even if email sending fails', async function () {
  const failingMailer = {
    sendLeadEmail: async function () { throw new Error('smtp down'); },
  };
  const { app, leadsDb } = buildApp({ mailer: failingMailer });

  const res = await request(app)
    .post('/api/lead')
    .type('form')
    .send({ name: 'Иван', email: 'ivan@zavod.ru', consent: 'true', source: 'contacts' });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  const stored = leadsDb.listLeads({});
  assert.equal(stored.total, 1);
  assert.equal(stored.items[0].email_sent, 0);
  assert.equal(stored.items[0].email_error, 'smtp down');
});

test('POST /api/lead marks email_sent=1 when mailer succeeds', async function () {
  const { app, leadsDb } = buildApp();
  await request(app)
    .post('/api/lead')
    .type('form')
    .send({ name: 'Пётр', phone: '+79990001122', consent: 'true', source: 'modal-simple' });

  const stored = leadsDb.listLeads({});
  assert.equal(stored.items[0].email_sent, 1);
});

test('POST /api/lead rejects unknown source by storing it as null', async function () {
  const { app, leadsDb } = buildApp();
  await request(app)
    .post('/api/lead')
    .type('form')
    .send({ name: 'Anon', phone: '+7999', consent: 'true', source: 'not-a-real-source' });

  const stored = leadsDb.listLeads({});
  assert.equal(stored.items[0].source, null);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd server && node --test test/lead.test.js`
Expected: FAIL с `Cannot find module '../src/routes/lead'`.

- [ ] **Step 3: Реализовать routes/lead.js**

Создать `server/src/routes/lead.js`:

```js
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Слишком много заявок. Попробуйте позже.' },
});

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
}

function createLeadRouter(deps) {
  const leadsDb = deps.leadsDb;
  const mailer = deps.mailer;
  const uploadDir = deps.uploadDir;
  const validSources = deps.validSources;

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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/lead.test.js`
Expected: PASS (5 тестов).

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add src/routes/lead.js test/lead.test.js
git commit -m "feat: rebuild lead route on top of SQLite store (db-first, email-second)"
```

---

## Task 7: routes/admin.js — логин, список, статус, resend, вложение (TDD)

**Files:**
- Create: `server/src/routes/admin.js`
- Test: `server/test/admin.test.js`

- [ ] **Step 1: Написать падающий тест**

Создать `server/test/admin.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDb } = require('../src/db');
const { createAdminRouter } = require('../src/routes/admin');

const PASSWORD = 'test-password';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

function buildApp(overrides) {
  overrides = overrides || {};
  const leadsDb = overrides.leadsDb || createDb(':memory:');
  const uploadDir = overrides.uploadDir || fs.mkdtempSync(path.join(os.tmpdir(), 'lab-itis-admin-test-'));
  const mailer = overrides.mailer || { sendLeadEmail: async function () { return {}; } };

  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
  app.use('/api', createAdminRouter({
    leadsDb: leadsDb,
    mailer: mailer,
    uploadDir: uploadDir,
    adminPasswordHash: PASSWORD_HASH,
  }));

  return { app: app, leadsDb: leadsDb, uploadDir: uploadDir };
}

test('GET /api/admin/leads without login returns 401', async function () {
  const { app } = buildApp();
  const res = await request(app).get('/api/admin/leads');
  assert.equal(res.status, 401);
});

test('login with wrong password returns 401, correct password grants access', async function () {
  const { app } = buildApp();
  const agent = request.agent(app);

  const wrong = await agent.post('/api/admin/login').send({ password: 'nope' });
  assert.equal(wrong.status, 401);

  const right = await agent.post('/api/admin/login').send({ password: PASSWORD });
  assert.equal(right.status, 200);
  assert.equal(right.body.ok, true);

  const leadsRes = await agent.get('/api/admin/leads');
  assert.equal(leadsRes.status, 200);
  assert.equal(leadsRes.body.ok, true);
});

test('GET /api/admin/leads/:id returns 404 for missing lead once logged in', async function () {
  const { app } = buildApp();
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: PASSWORD });

  const res = await agent.get('/api/admin/leads/9999');
  assert.equal(res.status, 404);
});

test('PATCH /api/admin/leads/:id/status updates status', async function () {
  const { app, leadsDb } = buildApp();
  const id = leadsDb.insertLead({ source: 'contacts', name: 'Иван', consent: true });

  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: PASSWORD });

  const res = await agent.patch('/api/admin/leads/' + id + '/status').send({ status: 'won' });
  assert.equal(res.status, 200);
  assert.equal(leadsDb.getLeadById(id).status, 'won');
});

test('PATCH /api/admin/leads/:id/status rejects invalid status', async function () {
  const { app, leadsDb } = buildApp();
  const id = leadsDb.insertLead({ source: 'contacts', name: 'Иван', consent: true });

  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: PASSWORD });

  const res = await agent.patch('/api/admin/leads/' + id + '/status').send({ status: 'bogus' });
  assert.equal(res.status, 400);
});

test('POST /api/admin/leads/:id/resend-email calls mailer again and updates email_sent', async function () {
  const calls = [];
  const mailer = { sendLeadEmail: async function (lead) { calls.push(lead); return {}; } };
  const { app, leadsDb } = buildApp({ mailer: mailer });
  const id = leadsDb.insertLead({ source: 'contacts', name: 'Иван', email: 'ivan@zavod.ru', consent: true });
  leadsDb.markEmailResult(id, false, 'previous failure');

  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: PASSWORD });

  const res = await agent.post('/api/admin/leads/' + id + '/resend-email');
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(leadsDb.getLeadById(id).email_sent, 1);
});

test('GET /api/admin/leads/:id/attachment streams the saved file', async function () {
  const { app, leadsDb, uploadDir } = buildApp();
  const id = leadsDb.insertLead({ source: 'contacts', name: 'Иван', consent: true });
  fs.mkdirSync(path.join(uploadDir, String(id)), { recursive: true });
  fs.writeFileSync(path.join(uploadDir, String(id), 'tz.txt'), 'hello world');
  leadsDb.setAttachmentPath(id, String(id) + '/tz.txt');

  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: PASSWORD });

  const res = await agent.get('/api/admin/leads/' + id + '/attachment');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'hello world');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd server && node --test test/admin.test.js`
Expected: FAIL с `Cannot find module '../src/routes/admin'`.

- [ ] **Step 3: Реализовать routes/admin.js**

Создать `server/src/routes/admin.js`:

```js
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { requireAuth, checkPassword } = require('../lib/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Слишком много попыток входа. Попробуйте позже.' },
});

function createAdminRouter(deps) {
  const leadsDb = deps.leadsDb;
  const mailer = deps.mailer;
  const uploadDir = deps.uploadDir;
  const adminPasswordHash = deps.adminPasswordHash;

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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/admin.test.js`
Expected: PASS (7 тестов).

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add src/routes/admin.js test/admin.test.js
git commit -m "feat: add admin API routes (login, list, status, resend, attachment)"
```

---

## Task 8: app.js — сборка приложения + новый server.js + .env.example

**Files:**
- Create: `server/src/app.js`
- Create: `server/server.js` (полностью переписывается)
- Modify: `server/.env.example`
- Test: `server/test/app.test.js`
- Delete: `server/test/lead.characterization.test.js` (был нужен только как страховка перед рефакторингом, теперь избыточен — поведение целиком покрыто `test/lead.test.js` и `test/app.test.js`)

- [ ] **Step 1: Написать падающий тест сборки приложения**

Создать `server/test/app.test.js`:

```js
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.ALLOWED_ORIGINS = 'https://lab-itis.ru';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('test-password', 10);

const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

function buildTestApp() {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-itis-app-test-'));
  const leadsDb = createDb(':memory:');
  const sentMails = [];
  const mailer = {
    sendLeadEmail: async function (lead) { sentMails.push(lead); return {}; },
  };
  const app = createApp({ leadsDb: leadsDb, mailer: mailer, uploadDir: uploadDir });
  return { app: app, leadsDb: leadsDb, sentMails: sentMails };
}

test('GET /api/health responds ok', async function () {
  const { app } = buildTestApp();
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('disallowed Origin is blocked with 403', async function () {
  const { app } = buildTestApp();
  const res = await request(app)
    .post('/api/lead')
    .set('Origin', 'https://evil.com')
    .type('form')
    .send({ name: 'Test', email: 'test@example.com', consent: 'true' });
  assert.equal(res.status, 403);
});

test('full flow: submit lead then see it in admin panel', async function () {
  const { app, sentMails } = buildTestApp();

  const submitRes = await request(app)
    .post('/api/lead')
    .set('Origin', 'https://lab-itis.ru')
    .type('form')
    .send({ name: 'Иван Петров', email: 'ivan@zavod.ru', consent: 'true', source: 'contacts' });

  assert.equal(submitRes.status, 200);
  assert.equal(sentMails.length, 1);

  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ password: 'test-password' });
  const listRes = await agent.get('/api/admin/leads');

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.total, 1);
  assert.equal(listRes.body.data.items[0].name, 'Иван Петров');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd server && node --test test/app.test.js`
Expected: FAIL с `Cannot find module '../src/app'`.

- [ ] **Step 3: Реализовать app.js**

Создать `server/src/app.js`:

```js
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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `cd server && node --test test/app.test.js`
Expected: PASS (3 теста).

- [ ] **Step 5: Переписать server.js как тонкую точку входа**

Заменить содержимое `server/server.js` целиком:

```js
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
```

- [ ] **Step 6: Обновить .env.example**

Заменить содержимое `server/.env.example` целиком:

```
# Скопируйте этот файл в .env и заполните реальными значениями.
# .env никогда не должен попадать в git.

# SMTP-релей Яндекс 360 для бизнеса
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=info@lab-itis.ru
# Пароль приложения (НЕ обычный пароль от почты!)
# Создаётся в Яндекс ID: id.yandex.ru -> Безопасность -> Пароли приложений -> "Почта"
SMTP_PASS=xxxxxxxxxxxxxxxx

# Куда падают заявки (можно оставить = SMTP_USER)
MAIL_TO=info@lab-itis.ru

# Через запятую. Теперь сайт и API на одном домене, но оставляем явный список на всякий случай
ALLOWED_ORIGINS=https://lab-itis.ru,https://www.lab-itis.ru

PORT=3001

# Пароль для входа в /admin/ — bcrypt-хэш, НЕ пароль в открытом виде.
# Как сгенерировать — см. README.md, раздел «Пароль администратора».
ADMIN_PASSWORD_HASH=

# Случайная строка для подписи сессионных cookie. Сгенерировать: openssl rand -hex 32
SESSION_SECRET=

# Необязательно — по умолчанию server/data/leads.db и server/uploads
# DB_PATH=/var/www/lab-itis.ru/server/data/leads.db
# UPLOAD_DIR=/var/www/lab-itis.ru/server/uploads
```

- [ ] **Step 7: Удалить устаревший характеризующий тест**

Run: `cd server && rm test/lead.characterization.test.js`

- [ ] **Step 8: Прогнать весь набор тестов сервера**

Run: `cd server && npm test`
Expected: все тесты (`db.test.js`, `mailer.test.js`, `auth.test.js`, `lead.test.js`, `admin.test.js`, `app.test.js`) проходят, PASS.

- [ ] **Step 9: Закоммитить**

```bash
cd server
git add src/app.js server.js .env.example test/app.test.js
git rm test/lead.characterization.test.js
git commit -m "feat: wire app.js, rewrite server.js entrypoint, update .env.example"
```

---

## Task 9: Деплой-конфиги — nginx на весь домен, systemd, бэкап

**Files:**
- Create: `server/deploy/nginx-site.conf.example`
- Create: `server/deploy/backup-leads.sh`
- Move: `server/lab-itis-mailer.service` → `server/deploy/lab-itis-mailer.service`
- Delete: `server/nginx-api.conf.example` (был для отдельного поддомена, больше не актуален)

- [ ] **Step 1: Создать nginx-конфиг на весь домен**

Создать `server/deploy/nginx-site.conf.example`:

```
# /etc/nginx/sites-available/lab-itis.ru
# Раздаёт статику сайта и проксирует /api/* в Node-процесс на 127.0.0.1:3001

server {
    listen 80;
    server_name lab-itis.ru www.lab-itis.ru;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://lab-itis.ru$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name www.lab-itis.ru;

    ssl_certificate     /etc/letsencrypt/live/lab-itis.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab-itis.ru/privkey.pem;

    return 301 https://lab-itis.ru$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lab-itis.ru;

    ssl_certificate     /etc/letsencrypt/live/lab-itis.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab-itis.ru/privkey.pem;

    root /var/www/lab-itis.ru;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 512;

    client_max_body_size 12m;

    # Картинки/шрифты не меняются часто — кэшируем надолго
    location ~* \.(?:jpg|jpeg|png|webp|svg|woff2?|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # HTML правится еженедельно — не даём браузеру закэшировать устаревшую версию
    location ~* \.html$ {
        add_header Cache-Control "no-cache";
    }

    # Бэкенд (код, БД, вложения) не должен быть доступен как статика.
    # Админ-панель отдаётся не отсюда, а самим Node-процессом (см. ниже) —
    # так вложения и статика панели не пересекаются с этим запретом.
    location /server/ { deny all; }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Админ-панель (логин + список заявок) — тоже отдаётся Node-процессом,
    # он раздаёт statику public/admin/ через express.static (см. src/app.js)
    location /admin/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }
}
```

- [ ] **Step 2: Удалить устаревший nginx-конфиг для отдельного поддомена**

Run: `cd server && rm nginx-api.conf.example`

- [ ] **Step 3: Перенести systemd unit в deploy/**

Run: `mkdir -p server/deploy && git -C server mv lab-itis-mailer.service deploy/lab-itis-mailer.service`

Открыть `server/deploy/lab-itis-mailer.service` и заменить пути на новую схему (весь репозиторий клонируется в `/var/www/lab-itis.ru`, бэкенд — подпапка `server`):

```
[Unit]
Description=lab-itis-lead-mailer (форма -> email + SQLite)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/lab-itis.ru/server
EnvironmentFile=/var/www/lab-itis.ru/server/.env
ExecStart=/usr/bin/node /var/www/lab-itis.ru/server/server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 4: Написать скрипт бэкапа**

Создать `server/deploy/backup-leads.sh`:

```bash
#!/bin/bash
# Бэкапит SQLite базу заявок и вложения.
# Настройка через cron (пример — см. README.md):
#   0 3 * * * /var/www/lab-itis.ru/server/deploy/backup-leads.sh >> /var/log/lab-itis-backup.log 2>&1
set -euo pipefail

SRC_DIR="/var/www/lab-itis.ru/server"
BACKUP_DIR="/var/backups/lab-itis-leads"
DATE="$(date +%Y-%m-%d_%H-%M)"

mkdir -p "$BACKUP_DIR"

sqlite3 "$SRC_DIR/data/leads.db" ".backup '$BACKUP_DIR/leads_$DATE.db'"

if [ -d "$SRC_DIR/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$SRC_DIR" uploads
fi

# Храним локальные копии 30 дней — этого достаточно как страховки между
# ручными/автоматическими выгрузками в offsite-хранилище (см. README.md).
find "$BACKUP_DIR" -name "leads_*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +30 -delete

echo "Backup done: $BACKUP_DIR/leads_$DATE.db, $BACKUP_DIR/uploads_$DATE.tar.gz"
```

Run: `chmod +x server/deploy/backup-leads.sh`

- [ ] **Step 5: Проверить синтаксис bash-скрипта локально**

Run: `bash -n server/deploy/backup-leads.sh`
Expected: без ошибок (пустой вывод = синтаксис корректен). Полный прогон скрипта возможен только на реальном VPS (нужен установленный `sqlite3` CLI и реальные пути) — это часть ручной проверки после деплоя (Task 13).

- [ ] **Step 6: Закоммитить**

```bash
cd server
git add deploy/nginx-site.conf.example deploy/backup-leads.sh deploy/lab-itis-mailer.service
git rm nginx-api.conf.example
git commit -m "chore: single-domain nginx config, backup script, relocate systemd unit"
```

---

## Task 10: Админ-панель — статические HTML/CSS/JS

Раздаётся Node-процессом через `express.static` (см. `src/app.js` из Task 8),
проверяется вручную (как и остальной фронтенд сайта — на проекте нет
браузерных автотестов, это осознанное решение, см. спеку).

**Files:**
- Create: `server/public/admin/index.html`
- Create: `server/public/admin/admin.css`
- Create: `server/public/admin/admin.js`

- [ ] **Step 1: Создать index.html**

Создать `server/public/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Панель заявок — ИТиС ЛАБ</title>
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
<div id="app"></div>
<script src="/admin/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Создать admin.css**

Создать `server/public/admin/admin.css`:

```css
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--fb);
}

#app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px;
}

.login-form {
  max-width: 320px;
  margin: 120px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-form h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.login-form input {
  background: var(--s1);
  border: none;
  border-bottom: 2px solid transparent;
  padding: 12px 14px;
  color: var(--text);
  font-size: 15px;
}

.login-form input:focus {
  border-color: var(--ok);
  outline: none;
}

.login-form .error {
  color: var(--err);
  font-size: 13px;
}

.login-form button,
.admin-header button,
.pager button,
.resend-btn,
.detail-btn {
  background: var(--text);
  color: var(--bg);
  border: none;
  padding: 10px 18px;
  font-weight: 700;
  cursor: pointer;
}

.login-form button:hover,
.admin-header button:hover,
.pager button:hover,
.resend-btn:hover,
.detail-btn:hover {
  opacity: .85;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filters select,
.filters input {
  background: var(--s1);
  border: none;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th, td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}

.ok-badge { color: var(--ok); }

.err-badge {
  color: var(--err);
  display: block;
  margin-bottom: 6px;
}

.detail-row td { background: var(--s1); }

.detail-row pre {
  white-space: pre-wrap;
  font-family: var(--fb);
  margin: 0 0 12px;
}

.detail-row a { color: var(--ok); }

.pager {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  font-size: 13px;
}
```

- [ ] **Step 3: Создать admin.js**

Создать `server/public/admin/admin.js`:

```js
const state = {
  leads: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: { status: '', source: '', q: '' },
};

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(function (k) {
    if (k === 'text') node.textContent = attrs[k];
    else node.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { node.appendChild(c); });
  return node;
}

async function api(path, options) {
  options = options || {};
  const res = await fetch('/api' + path, Object.assign({ credentials: 'same-origin' }, options));
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { status: res.status, ok: res.ok, data: data };
}

function statusLabel(status) {
  const labels = { new: 'Новая', in_progress: 'В работе', won: 'Выигран', lost: 'Отказ' };
  return labels[status] || status;
}

function renderLogin(message) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const form = el('form', { class: 'login-form' });
  form.appendChild(el('h1', { text: 'Вход в панель заявок' }));
  if (message) form.appendChild(el('div', { class: 'error', text: message }));

  const input = el('input', { type: 'password', placeholder: 'Пароль', autocomplete: 'current-password' });
  const button = el('button', { type: 'submit', text: 'Войти' });
  form.appendChild(input);
  form.appendChild(button);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const res = await api('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input.value }),
    });
    if (res.ok) {
      renderDashboard();
    } else {
      renderLogin((res.data && res.data.error) || 'Не удалось войти.');
    }
  });

  app.appendChild(form);
}

function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const header = el('div', { class: 'admin-header' });
  header.appendChild(el('h1', { text: 'Заявки' }));
  const logoutBtn = el('button', { text: 'Выйти' });
  logoutBtn.addEventListener('click', async function () {
    await api('/admin/logout', { method: 'POST' });
    renderLogin();
  });
  header.appendChild(logoutBtn);
  app.appendChild(header);

  const filters = el('div', { class: 'filters' });

  const statusSelect = el('select');
  [['', 'Все статусы'], ['new', 'Новая'], ['in_progress', 'В работе'], ['won', 'Выигран'], ['lost', 'Отказ']]
    .forEach(function (pair) { statusSelect.appendChild(el('option', { value: pair[0], text: pair[1] })); });

  const sourceSelect = el('select');
  [['', 'Все источники'], ['home-form', 'Главная'], ['modal-simple', 'Модалка простая'],
   ['modal-complex', 'Модалка детальная'], ['contacts', 'Контакты']]
    .forEach(function (pair) { sourceSelect.appendChild(el('option', { value: pair[0], text: pair[1] })); });

  const searchInput = el('input', { type: 'text', placeholder: 'Поиск: имя, email, телефон, компания' });

  filters.appendChild(statusSelect);
  filters.appendChild(sourceSelect);
  filters.appendChild(searchInput);
  app.appendChild(filters);

  const tableWrap = el('div', { class: 'table-wrap' });
  app.appendChild(tableWrap);

  const pager = el('div', { class: 'pager' });
  app.appendChild(pager);

  let debounceTimer = null;
  function scheduleReload() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(reload, 250);
  }

  statusSelect.addEventListener('change', function () {
    state.filters.status = statusSelect.value; state.page = 1; reload();
  });
  sourceSelect.addEventListener('change', function () {
    state.filters.source = sourceSelect.value; state.page = 1; reload();
  });
  searchInput.addEventListener('input', function () {
    state.filters.q = searchInput.value; state.page = 1; scheduleReload();
  });

  function toggleDetail(row, lead) {
    const existing = row.nextElementSibling;
    if (existing && existing.classList.contains('detail-row')) {
      existing.remove();
      return;
    }
    const detailRow = el('tr', { class: 'detail-row' });
    const cell = el('td', { colspan: '7' });
    const parts = [
      'Компания: ' + (lead.company || '—'),
      'Отрасль: ' + (lead.industry || '—'),
      'Согласие на рассылки: ' + (lead.marketing ? 'да' : 'нет'),
      'IP: ' + (lead.ip || '—'),
    ];
    if (lead.message) parts.push('Сообщение: ' + lead.message);
    if (lead.email_error) parts.push('Ошибка письма: ' + lead.email_error);
    cell.appendChild(el('pre', { text: parts.join('\n') }));

    if (lead.attachment_path) {
      cell.appendChild(el('a', { href: '/api/admin/leads/' + lead.id + '/attachment', text: 'Скачать вложение' }));
    }

    detailRow.appendChild(cell);
    row.parentNode.insertBefore(detailRow, row.nextSibling);
  }

  function renderTable() {
    tableWrap.innerHTML = '';
    const table = el('table');

    const thead = el('thead');
    const headRow = el('tr');
    ['Дата', 'Источник', 'Имя', 'Контакт', 'Статус', 'Письмо', ''].forEach(function (h) {
      headRow.appendChild(el('th', { text: h }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    state.leads.forEach(function (lead) {
      const row = el('tr');
      row.appendChild(el('td', { text: new Date(lead.created_at).toLocaleString('ru-RU') }));
      row.appendChild(el('td', { text: lead.source || '—' }));
      row.appendChild(el('td', { text: lead.name }));
      row.appendChild(el('td', { text: [lead.email, lead.phone].filter(Boolean).join(' / ') || '—' }));

      const statusCell = el('td');
      const select = el('select');
      ['new', 'in_progress', 'won', 'lost'].forEach(function (s) {
        const opt = el('option', { value: s, text: statusLabel(s) });
        if (s === lead.status) opt.setAttribute('selected', 'selected');
        select.appendChild(opt);
      });
      select.addEventListener('change', async function () {
        await api('/admin/leads/' + lead.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: select.value }),
        });
      });
      statusCell.appendChild(select);
      row.appendChild(statusCell);

      const emailCell = el('td');
      if (lead.email_sent) {
        emailCell.appendChild(el('span', { class: 'ok-badge', text: 'доставлено' }));
      } else {
        emailCell.appendChild(el('span', { class: 'err-badge', text: 'не доставлено' }));
        const resendBtn = el('button', { class: 'resend-btn', text: 'Отправить снова' });
        resendBtn.addEventListener('click', async function () {
          resendBtn.disabled = true;
          resendBtn.textContent = 'Отправляем…';
          const res = await api('/admin/leads/' + lead.id + '/resend-email', { method: 'POST' });
          if (res.ok) {
            reload();
          } else {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Отправить снова';
            alert((res.data && res.data.error) || 'Не удалось отправить письмо.');
          }
        });
        emailCell.appendChild(resendBtn);
      }
      row.appendChild(emailCell);

      const detailCell = el('td');
      const detailBtn = el('button', { class: 'detail-btn', text: 'Подробнее' });
      detailBtn.addEventListener('click', function () { toggleDetail(row, lead); });
      detailCell.appendChild(detailBtn);
      row.appendChild(detailCell);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  function renderPager() {
    pager.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));

    const prevBtn = el('button', { text: '← Назад' });
    prevBtn.disabled = state.page <= 1;
    prevBtn.addEventListener('click', function () { state.page -= 1; reload(); });

    const nextBtn = el('button', { text: 'Вперёд →' });
    nextBtn.disabled = state.page >= totalPages;
    nextBtn.addEventListener('click', function () { state.page += 1; reload(); });

    pager.appendChild(prevBtn);
    pager.appendChild(el('span', { text: 'Стр. ' + state.page + ' из ' + totalPages + ' (' + state.total + ' всего)' }));
    pager.appendChild(nextBtn);
  }

  async function reload() {
    const params = new URLSearchParams();
    if (state.filters.status) params.set('status', state.filters.status);
    if (state.filters.source) params.set('source', state.filters.source);
    if (state.filters.q) params.set('q', state.filters.q);
    params.set('page', String(state.page));
    params.set('pageSize', String(state.pageSize));

    const res = await api('/admin/leads?' + params.toString());
    if (res.status === 401) return renderLogin('Сессия истекла, войдите снова.');

    state.leads = res.data.data.items;
    state.total = res.data.data.total;
    renderTable();
    renderPager();
  }

  reload();
}

async function boot() {
  const res = await api('/admin/leads');
  if (res.status === 401) return renderLogin();
  renderDashboard();
}

boot();
```

- [ ] **Step 4: Ручная проверка (после того как Task 8 поднимет сервер локально)**

Run: `cd server && ADMIN_PASSWORD_HASH="$(node -e "console.log(require('bcryptjs').hashSync('local-test-pass', 10))")" SESSION_SECRET=local-test-secret SMTP_HOST=localhost SMTP_PORT=2525 SMTP_USER=info@lab-itis.ru SMTP_PASS=dummy node server.js`

Открыть `http://localhost:3001/admin/` в браузере:
- видна форма логина;
- неверный пароль → сообщение об ошибке, доступ не даётся;
- `local-test-pass` → показывается таблица (пустая, заявок ещё нет);
- через форму на сайте (или `curl -X POST http://localhost:3001/api/lead ...`) отправить тестовую заявку → обновить страницу панели → заявка видна, статус меняется через выпадающий список, «Подробнее» разворачивает детали.

Expected: всё вышеописанное работает без ошибок в консоли браузера.

- [ ] **Step 5: Закоммитить**

```bash
cd server
git add public/admin/index.html public/admin/admin.css public/admin/admin.js
git commit -m "feat: add admin panel frontend (login + leads dashboard)"
```

---

## Task 11: Фронтенд сайта — относительный API-адрес, robots.txt, sitemap.xml, удаление CNAME

**Files:**
- Modify: `js/main.js:28` (константа `LEAD_API_URL`)
- Create: `robots.txt`
- Create: `sitemap.xml`
- Delete: `CNAME`

- [ ] **Step 1: Сделать LEAD_API_URL относительным**

В `js/main.js` заменить:

```js
const LEAD_API_URL = 'https://api.lab-itis.ru/api/lead';
```

на:

```js
const LEAD_API_URL = '/api/lead';
```

(Сайт и API теперь на одном домене, поэтому абсолютный адрес с отдельным
поддоменом больше не нужен — а заодно и кросс-доменный CORS, но серверная
проверка `ALLOWED_ORIGINS` остаётся как доп. защита.)

- [ ] **Step 2: Создать robots.txt**

Создать `robots.txt` в корне репозитория:

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://lab-itis.ru/sitemap.xml
```

- [ ] **Step 3: Создать sitemap.xml**

Создать `sitemap.xml` в корне репозитория (список текущих публичных страниц;
`/industry/` и `/subindustry/` перечислены по одному разу каждая — это
известное ограничение см. спеку, конкретные отрасли по `?id=` в sitemap
не перечисляются):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://lab-itis.ru/</loc></url>
  <url><loc>https://lab-itis.ru/about/</loc></url>
  <url><loc>https://lab-itis.ru/tasks/</loc></url>
  <url><loc>https://lab-itis.ru/industries/</loc></url>
  <url><loc>https://lab-itis.ru/industry/</loc></url>
  <url><loc>https://lab-itis.ru/subindustry/</loc></url>
  <url><loc>https://lab-itis.ru/nlp/</loc></url>
  <url><loc>https://lab-itis.ru/cases/</loc></url>
  <url><loc>https://lab-itis.ru/cases/identifikatsiya-na-sklade/</loc></url>
  <url><loc>https://lab-itis.ru/cases/kontrol-kachestva-metalla/</loc></url>
  <url><loc>https://lab-itis.ru/cases/kontrol-upakovki-lekarstv/</loc></url>
  <url><loc>https://lab-itis.ru/cases/opredelenie-remontoprigodnosti-neftyanyh-dolot/</loc></url>
  <url><loc>https://lab-itis.ru/blog/</loc></url>
  <url><loc>https://lab-itis.ru/blog/defekty-metalla-klassifikatsiya/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kak-pravilno-stavit-zadachu-podryadchiku-po-kompyuternomu-zreniyu/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kak-rabotaet-mashinnoe-zrenie/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kak-snizit-zavisimost-kachestva-ot-chelovecheskogo-faktora/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kak-sobirat-izobrazheniya-dlya-zapuska-sistemyi-kompyuternogo-zreniya/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kak-vnedrit-ii-v-proizvodstvo/</loc></url>
  <url><loc>https://lab-itis.ru/blog/kogda-predpriyatiyu-uzhe-nevyigodno-proveryat-produktsiyu-vruchnuyu/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-bezopasnost-na-proizvodstve-trebuet-drugogo-urovnya-kontrolya/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-horoshie-proektyi-chasto-ne-prohodyat-soglasovanie/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-markirovka-tak-vazhna-dlya-promyishlennoj-produktsii/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-predpriyatiya-teryayut-dengi-iz-za-nezamechennyih-otklonenij/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-rabochee-mesto-operatora-nelzya-schitat-vtorostepennoj-chastyu-proekta/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-vyibor-kameryi-nelzya-schitat-vtorostepennyim/</loc></url>
  <url><loc>https://lab-itis.ru/blog/pochemu-zavodyi-vnedryayut-ii/</loc></url>
  <url><loc>https://lab-itis.ru/blog/programmnoe-obespechenie-dlya-kompyuternogo-zreniya-v-promyishlennosti/</loc></url>
  <url><loc>https://lab-itis.ru/blog/roi-mashinnogo-zreniya/</loc></url>
  <url><loc>https://lab-itis.ru/blog/s-chego-nachinaetsya-rabota-sistemyi/</loc></url>
  <url><loc>https://lab-itis.ru/blog/s-chego-nachinat-vyibor-sistemyi/</loc></url>
  <url><loc>https://lab-itis.ru/blog/tsifrovaya-transformatsiya-proizvodstva-primeryi/</loc></url>
  <url><loc>https://lab-itis.ru/contacts/</loc></url>
  <url><loc>https://lab-itis.ru/privacy/</loc></url>
  <url><loc>https://lab-itis.ru/consent/</loc></url>
  <url><loc>https://lab-itis.ru/cookies/</loc></url>
</urlset>
```

- [ ] **Step 4: Удалить CNAME (артефакт GitHub Pages)**

Run: `git rm CNAME`

- [ ] **Step 5: Проверить, что sitemap.xml — валидный XML**

Run: `python3 -c "import xml.dom.minidom as m; m.parse('sitemap.xml'); print('valid xml')"`
Expected: `valid xml`

- [ ] **Step 6: Закоммитить**

```bash
git add js/main.js robots.txt sitemap.xml
git rm CNAME
git commit -m "feat: relative API URL, robots.txt/sitemap.xml, drop GitHub Pages CNAME"
```

---

## Task 12: README.md — деплой на один VPS (статика + бэкенд + панель)

**Files:**
- Modify (полностью переписывается): `server/README.md`

- [ ] **Step 1: Переписать README.md**

Заменить содержимое `server/README.md` целиком:

```markdown
# lab-itis.ru — деплой на VPS

Сайт и бэкенд заявок теперь живут на одном VPS (раньше сайт был на GitHub
Pages, а бэкенд планировался на отдельном поддомене — от обеих схем
отказались в пользу одного простого сервера).

Что тут крутится:
- статика сайта — раздаётся nginx напрямую;
- `server/` — Node.js-сервис: `POST /api/lead` (приём заявок, email +
  запись в SQLite) и `/admin/` (защищённая панель просмотра заявок);
- заявки хранятся в `server/data/leads.db` (SQLite), вложения — в
  `server/uploads/`.

Спека: `docs/superpowers/specs/2026-07-13-vps-migration-backend-design.md`

## 1. Что нужно перед деплоем

1. VPS (Ubuntu 22.04+), даже самый дешёвый тариф подходит.
2. DNS: A-записи `lab-itis.ru` и `www.lab-itis.ru` → IP этого VPS
   (замените текущие записи, указывающие на GitHub Pages).
3. Node.js 18+ и nginx на сервере.
4. Пароль приложения Яндекса для `info@lab-itis.ru` (Безопасность →
   Пароли приложений → «Почта» на id.yandex.ru).

## 2. Базовая защита VPS (сделать один раз, до открытия портов наружу)

```bash
# Файрвол — открыты только SSH, HTTP, HTTPS
sudo apt-get update
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# SSH только по ключу (отключаем вход по паролю)
# В /etc/ssh/sshd_config выставить:
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart ssh

# Автообновления безопасности ОС
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 3. Установка кода на VPS

```bash
sudo mkdir -p /var/www/lab-itis.ru
sudo chown $USER:$USER /var/www/lab-itis.ru
git clone <URL-этого-репозитория> /var/www/lab-itis.ru
cd /var/www/lab-itis.ru/server
npm install --omit=dev
```

Если `better-sqlite3` не находит готовый бинарник под вашу платформу и
пытается собираться из исходников — поставьте инструменты сборки один раз:

```bash
sudo apt-get update && sudo apt-get install -y build-essential python3
```

## 4. Настройка .env

```bash
cp .env.example .env
nano .env
```

Заполнить `SMTP_USER` / `SMTP_PASS` (пароль приложения Яндекса из шага 1).

**Пароль администратора** — в `.env` хранится не сам пароль, а его bcrypt-хэш:

```bash
node -e "console.log(require('bcryptjs').hashSync('ваш-пароль-сюда', 10))"
```

Скопировать вывод в `ADMIN_PASSWORD_HASH=` в `.env`.

**Секрет сессии**:

```bash
openssl rand -hex 32
```

Скопировать вывод в `SESSION_SECRET=` в `.env`.

## 5. Проверка руками перед systemd

```bash
node server.js
```

Ожидается:
```
[OK] SMTP-подключение к smtp.yandex.ru установлено
[OK] lab-itis-lead-mailer слушает порт 3001
```

Открыть `http://<IP-сервера>:3001/admin/` — должна открыться форма входа,
вход по паролю из шага 3 должен пускать в панель (пока пустую).
Остановить (Ctrl+C) перед переходом к systemd.

## 6. systemd

```bash
sudo cp deploy/lab-itis-mailer.service /etc/systemd/system/
sudo chown -R www-data:www-data /var/www/lab-itis.ru
sudo systemctl daemon-reload
sudo systemctl enable --now lab-itis-mailer
sudo systemctl status lab-itis-mailer
```

## 7. nginx + HTTPS

```bash
sudo cp deploy/nginx-site.conf.example /etc/nginx/sites-available/lab-itis.ru
sudo ln -s /etc/nginx/sites-available/lab-itis.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lab-itis.ru -d www.lab-itis.ru
```

## 8. Проверка после деплоя

```bash
curl https://lab-itis.ru/
curl https://lab-itis.ru/api/health
# {"ok":true,"service":"lab-itis-lead-mailer"}

curl -X POST https://lab-itis.ru/api/lead \
  -F "name=Тест" -F "email=test@example.com" -F "consent=true" -F "source=contacts"
```

Письмо должно прийти на `info@lab-itis.ru`, а заявка — появиться в
`https://lab-itis.ru/admin/` после входа по паролю.

## 9. Бэкапы

Требуется CLI `sqlite3` (`sudo apt-get install -y sqlite3`).

```bash
crontab -e
```

Добавить строку (бэкап каждый день в 03:00, локально на сервере в
`/var/backups/lab-itis-leads`):

```
0 3 * * * /var/www/lab-itis.ru/server/deploy/backup-leads.sh >> /var/log/lab-itis-backup.log 2>&1
```

Это создаёт локальные копии — рекомендуется дополнительно копировать
`/var/backups/lab-itis-leads` за пределы этого VPS (например, `rsync`
на другой сервер или в объектное хранилище) — конкретный способ зависит
от того, что у вас уже используется для бэкапов, поэтому в скрипт не
зашит.

## 10. Как обновлять сайт и заявки

**Правки статики (HTML/CSS/JS сайта, блог, кейсы):**
```bash
cd /var/www/lab-itis.ru
git pull
```
nginx ничего перезапускать не нужно — правки видны сразу
(HTML не кэшируется браузером, см. `deploy/nginx-site.conf.example`).

**Правки бэкенда** (`server/**`):
```bash
cd /var/www/lab-itis.ru
git pull
cd server
npm install --omit=dev   # если менялись зависимости
sudo systemctl restart lab-itis-mailer
```

## 11. Известное ограничение (не в рамках этого этапа)

Страницы `/industry/` и `/subindustry/` рендерят контент на клиенте из
`js/data.js` по `?id=` в URL — поисковые боты могут не видеть контент
конкретной отрасли при первом заходе. См. раздел «Известное ограничение»
в спеке — это отдельная фронтенд-задача на будущее.

## 12. Логи

```bash
sudo journalctl -u lab-itis-mailer -f
```
```

- [ ] **Step 2: Проверить, что все упомянутые в README пути/файлы реально существуют в репозитории**

Run: `ls server/deploy/lab-itis-mailer.service server/deploy/nginx-site.conf.example server/deploy/backup-leads.sh server/.env.example`
Expected: все 4 файла существуют (без ошибок `No such file`).

- [ ] **Step 3: Закоммитить**

```bash
cd server
git add README.md
git commit -m "docs: rewrite README for single-VPS deployment"
```

---

## Task 13: Финальная проверка

**Files:** нет новых файлов — только проверка того, что сделано в Tasks 1–12.

- [ ] **Step 1: Прогнать весь набор тестов бэкенда**

Run: `cd server && npm test`
Expected: все тестовые файлы (`db.test.js`, `mailer.test.js`, `auth.test.js`,
`lead.test.js`, `admin.test.js`, `app.test.js`) — PASS, 0 упавших.

- [ ] **Step 2: Проверить синтаксис всех новых/изменённых JS-файлов**

Run:
```bash
cd server
node -c server.js
node -c src/app.js
node -c src/config.js
node -c src/db.js
node -c src/lib/mailer.js
node -c src/lib/auth.js
node -c src/routes/lead.js
node -c src/routes/admin.js
node -c public/admin/admin.js
```
Expected: без вывода (значит без синтаксических ошибок) по каждой команде.

- [ ] **Step 3: Проверить nginx-конфиг синтаксически (локально, без реального nginx можно через `nginx -t` на VPS; здесь — визуальная проверка на сбалансированность скобок)**

Run: `python3 -c "
content = open('server/deploy/nginx-site.conf.example').read()
assert content.count('{') == content.count('}'), 'unbalanced braces'
print('braces balanced:', content.count('{'))
"`
Expected: `braces balanced: <число>` без ошибки `AssertionError`.

- [ ] **Step 4: Проверить, что относительный LEAD_API_URL применился и старый абсолютный адрес нигде не остался**

Run: `grep -rn "api.lab-itis.ru" js/ index.html contacts/index.html || echo "no leftover absolute API URL"`
Expected: `no leftover absolute API URL`.

- [ ] **Step 5: Полный ручной прогон на живом сервере (после реального деплоя на VPS, не раньше)**

Пройти по всем 4 формам сайта (обе модалки, форма на главной, форма на
`/contacts/`) через настоящий браузер на `https://lab-itis.ru`:
1. Заполнить и отправить каждую форму.
2. Убедиться, что письмо пришло на `info@lab-itis.ru`.
3. Зайти на `https://lab-itis.ru/admin/`, залогиниться, убедиться что все
   4 заявки видны, статусы у каждой меняются, «Подробнее» показывает
   верные данные, вложение (если прикладывали файл в детальной форме)
   скачивается.
4. Проверить `https://lab-itis.ru/robots.txt` и `https://lab-itis.ru/sitemap.xml`
   открываются и валидны.
5. `curl -I https://lab-itis.ru/assets/images/... ` (любая картинка) —
   убедиться, что есть заголовок `Cache-Control: public, max-age=2592000`.
6. `curl -I https://lab-itis.ru/` — убедиться, что есть `Content-Encoding: gzip`
   при передаче `Accept-Encoding: gzip` и `Cache-Control: no-cache` на HTML.

Expected: все пункты подтверждены вручную, отклонений нет.

- [ ] **Step 6: Финальный коммит (если что-то поправлено по итогам ручной проверки)**

```bash
git add -A
git commit -m "chore: post-deploy fixes after manual verification" --allow-empty
```

---

## Самопроверка плана (для читающего агента)

- Все 6 разделов спеки (хостинг/сеть, бэкенд-структура, данные заявки,
  надёжность, админ-панель, безопасность, SEO/perf, деплой, задел на
  будущее) покрыты задачами 1–13.
- Задел на будущее (визуальный редактор контента) сознательно НЕ входит
  ни в одну задачу — зафиксирован только в спеке как направление, чтобы
  не размывать scope этого плана.
- Каждый Create/Modify-файл из "Карты файлов" в начале документа
  фигурирует минимум в одной задаче.
