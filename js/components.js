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

/** Pathname without query; strip trailing slashes (except root) — for nav active state */
function navNormPath(pathname) {
  const pathOnly = (pathname || '/').split('?')[0];
  if (pathOnly === '/' || pathOnly === '') return '/';
  return pathOnly.replace(/\/+$/, '') || '/';
}

function injectNav() {
  const root = document.getElementById('nav-root');
  if (!root) return;

  root.innerHTML = `
<nav id="nav">
  <div class="wrap nav-row">
    <a href="/" class="logo">
      ${LOGO_SVG}
      ИТиС ЛАБ
    </a>
    <div class="nav-links">
      <a href="/about/">О нас</a>
      <a href="/tasks/">Типовые задачи</a>
      <div class="nav-dd">
        <button class="nav-dd-btn">Решения по отраслям ▾</button>
        <div class="dd-panel" id="ddPanel">
          <div class="dd-inner">
            <div class="dd-title">Выберите отрасль</div>
            <div class="dd-grid" id="ddGrid"></div>
          </div>
        </div>
      </div>
      <a href="/cases/">Кейсы</a>
      <a href="/blog/">Блог</a>
      <a href="/contacts/">Контакты</a>
      <button class="nav-cta" onclick="openForm('simple')">Обсудить проект</button>
    </div>
  </div>
</nav>`;

  document.querySelectorAll('#mob, .mob').forEach(el => el.remove());

  const p = navNormPath(window.location.pathname);
  root.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href[0] !== '/') return;
    const h = navNormPath(href);
    if (h === '/') return;
    if (p === h || p.startsWith(h + '/')) a.classList.add('active');
  });

  window.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('on', window.scrollY > 40);
  }, {passive: true});
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
        <a href="/about/">О нас</a>
        <a href="/tasks/">Типовые задачи</a>
        <a href="/industries/">Решения по отраслям</a>
        <a href="/cases/">Кейсы</a>
        <a href="/blog/">Блог</a>
        <a href="/contacts/">Контакты</a>
      </nav>
      <div>
        <button class="btn btn-w btn-sm" onclick="openForm('simple')">Обсудить проект</button>
      </div>
    </div>
    <div class="footer-bar">
      <span>© 2025 ИТиС ЛАБ. Все права защищены.</span>
      <a href="/privacy/">Политика конфиденциальности</a>
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
      <label for="cbs1">Соглашаюсь на обработку персональных данных в соответствии с <a href="/privacy/" style="color:var(--text);text-decoration:underline;">Политикой конфиденциальности</a></label>
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
    <div class="dd-item" onclick="window.location.href='/industry/?id=${i.id}'">
      <div class="dd-item-top">
        <div class="dd-num">${String(i.id).padStart(2,'0')}</div>
        <img class="dd-icon" src="/assets/icons/industries/${i.id}.svg" alt="" width="18" height="18" onerror="this.style.display='none'">
      </div>
      <div class="dd-name">${i.name}</div>
    </div>`).join('');
}

/* ── COOKIE BANNER ── */
function injectCookieBanner() {
  if (localStorage.getItem('cookie_consent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="ck-inner">
      <div class="ck-text">
        <span>Мы используем файлы Cookie для корректной работы сайта и анализа трафика.</span>
        <a href="/cookies/" target="_blank">Подробнее</a>
      </div>
      <div class="ck-actions">
        <button class="ck-btn ck-accept" onclick="cookieAccept()">Принять все</button>
        <button class="ck-btn ck-decline" onclick="cookieDecline()">Только необходимые</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 9999;
      background: #141414;
      border-top: 1px solid #2a2a2a;
      padding: 16px 24px;
      animation: ckSlideUp .35s ease;
    }
    @keyframes ckSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }
    .ck-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .ck-text {
      font-family: 'Manrope', sans-serif;
      font-size: 14px;
      color: #aaa;
      line-height: 1.5;
    }
    .ck-text a {
      color: #3dff7a;
      text-decoration: none;
      margin-left: 6px;
      white-space: nowrap;
    }
    .ck-text a:hover { text-decoration: underline; }
    .ck-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }
    .ck-btn {
      font-family: 'Manrope', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 20px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: opacity .2s;
    }
    .ck-btn:hover { opacity: .85; }
    .ck-accept {
      background: #3dff7a;
      color: #000;
    }
    .ck-decline {
      background: transparent;
      color: #aaa;
      border: 1px solid #333;
    }
    #cookie-banner.ck-hide {
      animation: ckSlideDown .3s ease forwards;
    }
    @keyframes ckSlideDown {
      to { transform: translateY(100%); opacity: 0; }
    }
    @media (max-width: 600px) {
      .ck-inner { flex-direction: column; align-items: flex-start; }
      .ck-actions { width: 100%; }
      .ck-btn { flex: 1; text-align: center; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);
}

function cookieAccept() {
  localStorage.setItem('cookie_consent', 'all');
  closeCookieBanner();
}

function cookieDecline() {
  localStorage.setItem('cookie_consent', 'essential');
  closeCookieBanner();
}

function closeCookieBanner() {
  const b = document.getElementById('cookie-banner');
  if (!b) return;
  b.classList.add('ck-hide');
  setTimeout(() => b.remove(), 350);
}

function initComponents() {
  injectNav();
  injectFooter();
  injectModals();
  buildDD();
  injectCookieBanner();
}
