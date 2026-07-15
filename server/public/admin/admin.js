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
