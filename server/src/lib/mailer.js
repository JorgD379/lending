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
