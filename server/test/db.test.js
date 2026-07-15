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
