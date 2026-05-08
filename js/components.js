/* Shared HTML components injected into every page */

const LOGO_SVG = `<svg class="logo-icon" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="26" height="26" stroke="#F0F0F0" stroke-width="1.2"/>
  <rect x="7" y="7" width="14" height="14" stroke="#F0F0F0" stroke-width="1.2"/>
  <circle cx="14" cy="14" r="3" fill="#F0F0F0"/>
  <line x1="1" y1="1" x2="7" y2="7" stroke="#F0F0F0" stroke-width="1"/>
  <line x1="27" y1="1" x2="21" y2="7" stroke="#F0F0F0" stroke-width="1"/>
  <line x1="1" y1="27" x2="7" y2="21" stroke="#F0F0F0" stroke-width="1"/>
  <line x1="27" y1="27" x2="21" y2="21" stroke="#F0F0F0" stroke-width="1"/>
</svg>`;

function injectNav() {
  const root = document.getElementById('nav-root');
  if (!root) return;

  const depth = (() => {
    const p = window.location.pathname;
    const parts = p.split('/').filter(Boolean);
    return parts.length > 1 ? 1 : 0;
  })();
  const base = depth > 0 ? '../' : '';

  root.innerHTML = `
<nav id="nav">
  <div class="wrap nav-row">
    <a href="${base}index.html" class="logo">
      ${LOGO_SVG}
      ИТиС ЛАБ
    </a>
    <div class="nav-links">
      <a href="${base}about.html">О нас</a>
      <a href="${base}tasks.html">Типовые задачи</a>
      <div class="nav-dd">
        <button class="nav-dd-btn">Решения по отраслям ▾</button>
        <div class="dd-panel" id="ddPanel">
          <div class="dd-inner">
            <div class="dd-title">Выберите отрасль</div>
            <div class="dd-grid" id="ddGrid"></div>
          </div>
        </div>
      </div>
      <a href="${base}cases.html">Кейсы</a>
      <a href="${base}blog.html">Блог</a>
      <a href="${base}contacts.html">Контакты</a>
      <button class="nav-cta" onclick="openForm('simple')">Обсудить проект</button>
    </div>
  </div>
</nav>`;

  document.querySelectorAll('#mob, .mob').forEach(el => el.remove());

  const path = window.location.pathname;
  root.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    const cleanHref = href.replace(/\.\.\//g, '').replace(/\.html$/, '');
    const cleanPath = path.replace(/\.html$/, '').replace(/.*\//, '');
    if (cleanPath && cleanHref.endsWith(cleanPath)) a.classList.add('active');
  });

  window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('on', window.scrollY > 40);
  }, {passive: true});
}

function injectFooter() {
  const root = document.getElementById('footer-root');
  if (!root) return;

  const footerBase = (() => {
    const p = window.location.pathname;
    const parts = p.split('/').filter(Boolean);
    return parts.length > 1 ? '../' : '';
  })();

  root.innerHTML = `
<footer>
  <div class="wrap">
    <div class="footer-row">
      <div>
        <div class="footer-logo">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="1" y="1" width="26" height="26" stroke="#F0F0F0" stroke-width="1.2"/>
            <rect x="7" y="7" width="14" height="14" stroke="#F0F0F0" stroke-width="1.2"/>
            <circle cx="14" cy="14" r="3" fill="#F0F0F0"/>
            <line x1="1" y1="1" x2="7" y2="7" stroke="#F0F0F0" stroke-width="1"/>
            <line x1="27" y1="1" x2="21" y2="7" stroke="#F0F0F0" stroke-width="1"/>
            <line x1="1" y1="27" x2="7" y2="21" stroke="#F0F0F0" stroke-width="1"/>
            <line x1="27" y1="27" x2="21" y2="21" stroke="#F0F0F0" stroke-width="1"/>
          </svg>
          ИТиС ЛАБ
        </div>
        <div class="footer-tagline">Автоматизация и машинное зрение для производства</div>
      </div>
      <nav class="footer-nav">
        <a href="${footerBase}about.html">О нас</a>
        <a href="${footerBase}tasks.html">Типовые задачи</a>
        <a href="${footerBase}industries.html">Решения по отраслям</a>
        <a href="${footerBase}cases.html">Кейсы</a>
        <a href="${footerBase}blog.html">Блог</a>
        <a href="${footerBase}contacts.html">Контакты</a>
      </nav>
      <div>
        <button class="btn btn-w btn-sm" onclick="openForm('simple')">Обсудить проект</button>
      </div>
    </div>
    <div class="footer-bar">
      <span>© 2025 ИТиС ЛАБ. Все права защищены.</span>
      <a href="${footerBase}privacy.html">Политика конфиденциальности</a>
    </div>
  </div>
</footer>`;
}

function injectModals() {
  const root = document.getElementById('modals-root');
  if (!root) return;

  const modalBase = (() => {
    const p = window.location.pathname;
    const parts = p.split('/').filter(Boolean);
    return parts.length > 1 ? '../' : '';
  })();

  root.innerHTML = `
<!-- PROCESS MODAL -->
<div class="overlay" id="procOverlay" onclick="closeOverlay(event,'procOverlay')">
  <div class="mbox" id="procBox">
    <button class="mcl" onclick="closeById('procOverlay')">✕</button>
    <div id="procContent"></div>
  </div>
</div>

<!-- FORM MODAL: SIMPLE -->
<div class="form-overlay" id="formSimple" onclick="closeOverlay(event,'formSimple')">
  <div class="fbox">
    <button class="fcl" onclick="closeById('formSimple')">✕</button>
    <h3>Расскажите о задаче</h3>
    <p class="sub">Мы свяжемся с вами в течение 24 часов</p>
    <div class="form-body">
      <div class="fld"><label>Ваше имя</label><input type="text" autocomplete="name"></div>
      <div class="fld"><label>Телефон</label><input type="tel" autocomplete="tel"></div>
      <div class="fld"><label>Email</label><input type="email" autocomplete="email"></div>
    </div>
    <div class="cb-row">
      <input type="checkbox" id="cbs1" required>
      <label for="cbs1">Соглашаюсь на обработку персональных данных в соответствии с <a href="${modalBase}privacy.html" style="color:var(--text);text-decoration:underline;">Политикой конфиденциальности</a></label>
    </div>
    <button class="form-submit" onclick="closeById('formSimple')">Отправить заявку</button>
  </div>
</div>

<!-- FORM MODAL: COMPLEX -->
<div class="form-overlay" id="formComplex" onclick="closeOverlay(event,'formComplex')">
  <div class="fbox" style="max-width:680px;overflow-y:auto;max-height:90vh;">
    <button class="fcl" onclick="closeById('formComplex')">✕</button>
    <h3>Детальный проект</h3>
    <p class="sub">Заполните анкету — рассчитаем КП и сроки</p>
    <div class="form-body">
      <div class="fld"><label>Ваше имя</label><input type="text" autocomplete="name"></div>
      <div class="fld"><label>Email</label><input type="email" autocomplete="email"></div>
      <div class="fld"><label>Телефон</label><input type="tel" autocomplete="tel"></div>
      <div class="fld"><label>Компания</label><input type="text"></div>
      <div class="fld"><label>Отрасль</label><input type="text" placeholder="Например: машиностроение"></div>
      <div class="fld"><label>Описание задачи</label><textarea rows="4"></textarea></div>
      <div class="fld"><label>Прикрепить файл (ТЗ, схема)</label><input type="file"></div>
    </div>
    <div class="cb-row"><input type="checkbox" id="cbc1" required><label for="cbc1">Соглашаюсь на обработку персональных данных</label></div>
    <div class="cb-row" style="margin-top:10px;"><input type="checkbox" id="cbc2"><label for="cbc2">Согласен на получение рекламных рассылок</label></div>
    <button class="form-submit" onclick="closeById('formComplex')">Получить предложение</button>
  </div>
</div>`;
}

/* SVG icons per industry id */
const IND_ICONS = {
  1:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="7" width="16" height="10" stroke="currentColor" stroke-width="1.2"/><path d="M1 7L5 2H13L17 7" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="2" x2="9" y2="7" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="11" width="6" height="6" stroke="currentColor" stroke-width="1"/></svg>`,
  2:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  3:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5 8h2M5 11h2M9 8h4M9 11h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="5.5" cy="8.5" r=".5" fill="currentColor"/></svg>`,
  4:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 16V8l5-6 5 6v8" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><rect x="6.5" y="11" width="5" height="5" stroke="currentColor" stroke-width="1"/><path d="M1 16h16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  5:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.2"/><circle cx="9" cy="9" r="1" fill="currentColor"/></svg>`,
  6:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14h12M6 14V9M12 14V9M9 14V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M2 9c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  7:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 14L5 4h8l4 10H1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 4L9 2l4 2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9" y1="2" x2="9" y2="14" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1.5"/></svg>`,
  8:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="6" width="14" height="9" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V5a4 4 0 018 0v1" stroke="currentColor" stroke-width="1.2"/><circle cx="9" cy="10.5" r="1.5" stroke="currentColor" stroke-width="1"/></svg>`,
  9:  `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><ellipse cx="9" cy="13" rx="7" ry="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 13V8c0-1.7 3.1-3 7-3s7 1.3 7 3v5" stroke="currentColor" stroke-width="1.2"/><path d="M9 5V2M7 3l2-1 2 1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  10: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C5.7 2 3 4.7 3 8c0 2.4 1.4 4.5 3.4 5.5L7 16h4l.6-2.5C13.6 12.5 15 10.4 15 8c0-3.3-2.7-6-6-6z" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="1"/></svg>`,
  11: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="5" width="16" height="10" stroke="currentColor" stroke-width="1.2"/><path d="M4 5V3h10v2" stroke="currentColor" stroke-width="1.2"/><path d="M5 9h8M5 12h5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  12: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5 7h8M5 10h5M5 13h6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><rect x="11" y="9" width="4" height="5" rx=".5" stroke="currentColor" stroke-width="1"/></svg>`,
  13: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L9 12M5 6L9 2L13 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10L3 14H15L13 10" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  14: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14c2-4 4-6 7-6s5 2 7 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="7" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="7" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M9 3v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  15: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="14" height="6" stroke="currentColor" stroke-width="1.2"/><path d="M5 10V7h8v3" stroke="currentColor" stroke-width="1.2"/><path d="M7 7V5a2 2 0 014 0v2" stroke="currentColor" stroke-width="1.2"/><path d="M6 13h6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  16: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="9,2 16,6 16,12 9,16 2,12 2,6" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="1"/><path d="M9 4v1M9 13v1M4 6.5l.87.5M13.13 11l.87.5M4 11.5l.87-.5M13.13 7l.87-.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  17: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="2" width="6" height="6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="10" width="6" height="6" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="10" width="6" height="6" stroke="currentColor" stroke-width="1.2"/></svg>`,
  18: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9a6 6 0 1012 0A6 6 0 003 9z" stroke="currentColor" stroke-width="1.2"/><path d="M9 3c-1.5 2-2 4-2 6s.5 4 2 6M9 3c1.5 2 2 4 2 6s-.5 4-2 6M3 9h12" stroke="currentColor" stroke-width="1"/></svg>`,
  19: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 12c2-4 4-6 7-6s5 2 7 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M5 12v2h8v-2" stroke="currentColor" stroke-width="1.2"/><path d="M7 8V6M11 8V6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  20: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.2"/><path d="M9 5v4l3 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 14l1-1M14 4l-1 1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
};

function buildDD() {
  const grid = document.getElementById('ddGrid');
  if (!grid) return;
  const ddBase = (() => {
    const p = window.location.pathname;
    const parts = p.split('/').filter(Boolean);
    return parts.length > 1 ? '../' : '';
  })();
  grid.innerHTML = INDUSTRIES.map(i => `
    <div class="dd-item" onclick="window.location.href='${ddBase}industry.html?id=${i.id}'">
      <div class="dd-item-top">
        <div class="dd-num">${String(i.id).padStart(2,'0')}</div>
        <div class="dd-icon">${IND_ICONS[i.id] || ''}</div>
      </div>
      <div class="dd-name">${i.name}</div>
    </div>`).join('');
}

function initComponents() {
  injectNav();
  injectFooter();
  injectModals();
  buildDD();
}
