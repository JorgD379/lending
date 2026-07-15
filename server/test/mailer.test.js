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
