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
