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
