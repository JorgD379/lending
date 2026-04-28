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

  root.innerHTML = `
<nav id="nav">
  <div class="wrap nav-row">
    <a href="/index.html" class="logo">
      ${LOGO_SVG}
      ИТиС ЛАБ
    </a>
    <div class="nav-links">
      <a href="/about.html">О нас</a>
      <a href="/tasks.html">Типовые задачи</a>
      <div class="nav-dd">
        <button class="nav-dd-btn">Решения по отраслям ▾</button>
        <div class="dd-panel" id="ddPanel">
          <div class="dd-inner">
            <div class="dd-title">Выберите отрасль</div>
            <div class="dd-grid" id="ddGrid"></div>
          </div>
        </div>
      </div>
      <a href="/cases.html">Кейсы</a>
      <a href="/blog.html">Блог</a>
      <a href="/contacts.html">Контакты</a>
      <button class="nav-cta" onclick="openForm('simple')">Обсудить проект</button>
    </div>
    <button class="burger" id="burger"><span></span><span></span><span></span></button>
  </div>
</nav>

<div class="mob" id="mob">
  <a href="/about.html" onclick="closeMob()">О нас</a>
  <a href="/tasks.html" onclick="closeMob()">Типовые задачи</a>
  <a href="/industries.html" onclick="closeMob()">Решения по отраслям</a>
  <a href="/cases.html" onclick="closeMob()">Кейсы</a>
  <a href="/blog.html" onclick="closeMob()">Блог</a>
  <a href="/contacts.html" onclick="closeMob()">Контакты</a>
  <button onclick="openForm('simple');closeMob();">Обсудить проект</button>
</div>`;

  // Mark active nav link
  const path = window.location.pathname;
  root.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path || (path === '/' && a.getAttribute('href') === '/index.html')) {
      a.classList.add('active');
    }
  });

  // Scroll behaviour
  window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('on', window.scrollY > 40);
  }, {passive: true});

  // Burger
  document.getElementById('burger').addEventListener('click', () => {
    const m = document.getElementById('mob');
    m.classList.toggle('open');
    document.body.style.overflow = m.classList.contains('open') ? 'hidden' : '';
  });
}

function injectFooter() {
  const root = document.getElementById('footer-root');
  if (!root) return;

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
        <a href="/about.html">О нас</a>
        <a href="/tasks.html">Типовые задачи</a>
        <a href="/industries.html">Решения по отраслям</a>
        <a href="/cases.html">Кейсы</a>
        <a href="/blog.html">Блог</a>
        <a href="/contacts.html">Контакты</a>
      </nav>
      <div>
        <button class="btn btn-w btn-sm" onclick="openForm('simple')">Обсудить проект</button>
      </div>
    </div>
    <div class="footer-bar">
      <span>© 2025 ИТиС ЛАБ. Все права защищены.</span>
      <a href="/privacy.html">Политика конфиденциальности</a>
    </div>
  </div>
</footer>`;
}

function injectModals() {
  const root = document.getElementById('modals-root');
  if (!root) return;

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
      <label for="cbs1">Соглашаюсь на обработку персональных данных в соответствии с <a href="/privacy.html" style="color:var(--text);text-decoration:underline;">Политикой конфиденциальности</a></label>
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

function buildDD() {
  const grid = document.getElementById('ddGrid');
  if (!grid) return;
  grid.innerHTML = INDUSTRIES.map(i => `
    <div class="dd-item" onclick="window.location.href='/industry.html?id=${i.id}'">
      <div class="dd-num">${String(i.id).padStart(2,'0')}</div>
      <div class="dd-name">${i.name}</div>
    </div>`).join('');
}

function initComponents() {
  injectNav();
  injectFooter();
  injectModals();
  buildDD();
}
