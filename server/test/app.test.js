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
