const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

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
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA journal_mode = WAL');
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
