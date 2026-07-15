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
