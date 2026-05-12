/* Shared interactive behaviours */

/* ── FORMS ── */
function openForm(type) {
  openOverlay(type === 'simple' ? 'formSimple' : 'formComplex');
}
function openOverlay(id) {
  document.getElementById(id).classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeById(id) {
  document.getElementById(id).classList.remove('on');
  document.body.style.overflow = '';
}
function closeOverlay(e, id) {
  if (e.target === document.getElementById(id)) closeById(id);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['procOverlay', 'formSimple', 'formComplex'].forEach(id => {
      const el = document.getElementById(id);
      if (el) closeById(id);
    });
  }
});

/* ── MOBILE MENU ── */
function closeMob() {
  const m = document.getElementById('mob');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

/* ── TABS ── */
document.addEventListener('click', e => {
  const t = e.target.closest('.tab[data-tab]');
  if (!t) return;
  t.parentElement.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  t.classList.add('on');
  document.querySelectorAll('.tabp').forEach(p => p.classList.toggle('on', p.id === t.dataset.tab));
});

/* ── REVEAL ON SCROLL ── */
function triggerReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }
    });
  }, {threshold: 0.09});
  document.querySelectorAll('.rv:not(.vis)').forEach(el => obs.observe(el));
}

/* ── ANIMATED COUNTERS ── */
function animCnt(el) {
  const t = parseInt(el.dataset.t, 10), dur = 1400, s = performance.now();
  (function tick(n) {
    const p = Math.min((n - s) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * t);
    if (p < 1) requestAnimationFrame(tick);
  })(performance.now());
}
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(x => {
    if (x.isIntersecting) { animCnt(x.target); counterObs.unobserve(x.target); }
  });
}, {threshold: .5});

function taskCard(task) {
  return `<div class="card"><div class="cn">${task.id}</div><h3>${task.title}</h3><p>${task.desc}</p></div>`;
}

function renderTypicalTasks() {
  const tasksGrid = document.getElementById('tasksGrid');
  if (tasksGrid) {
    tasksGrid.innerHTML = TYPICAL_TASKS.map(taskCard).join('');
  }

  const uc1 = document.getElementById('uc1');
  const uc2 = document.getElementById('uc2');
  const uc3 = document.getElementById('uc3');
  if (!uc1 || !uc2 || !uc3) return;

  const grp = {
    quality: TYPICAL_TASKS.filter(x => x.group === 'quality'),
    logistics: TYPICAL_TASKS.filter(x => x.group === 'logistics'),
    production: TYPICAL_TASKS.filter(x => x.group === 'production')
  };

  uc1.innerHTML = grp.quality.map((x, i) => taskCard({...x, id: `0${i + 1} / КК`})).join('');
  uc2.innerHTML = grp.logistics.map((x, i) => taskCard({...x, id: `0${i + 1} / ЛГ`})).join('');
  uc3.innerHTML = grp.production.map((x, i) => taskCard({...x, id: `0${i + 1} / ПР`})).join('');
}

/* ── PROCESS MODAL ── */
function openProcModal(indId, subId, procId) {
  const procs = getProcs(indId, subId);
  const p = procs.find(x => x.id === procId);
  if (!p) return;
  document.getElementById('procContent').innerHTML = `
    <div class="m-img"><div class="m-img-g"></div><img src="/assets/images/processes/${String(indId).padStart(2,'0')}.${String(subId).padStart(2,'0')}.${String(procId).padStart(2,'0')}.jpg" alt="${p.title}" onerror="this.style.display='none'" loading="lazy"><span class="m-img-lbl" id="mImgLbl">[ Фото / визуализация процесса ]</span></div>
    <div class="m-body">
      <div class="m-title">${p.title}</div>
      <div class="m-grid">
        <div><div class="m-sec-t">Что контролировать</div><div class="m-sec-b">${p.what}</div></div>
        <div><div class="m-sec-t">Почему это полезно</div><div class="m-sec-b">${p.why}</div></div>
        <div><div class="m-sec-t">Результаты внедрения</div><div class="m-sec-b">${p.results}</div></div>
        <div><div class="m-sec-t">Принцип работы ИИ</div><div class="m-sec-b">${p.principle}</div></div>
        <div><div class="m-sec-t">Функции ИТиС ЛАБ</div><div class="m-sec-b">${p.features}</div></div>
        <div><div class="m-sec-t">Минусы традиционных методов</div><div class="m-sec-b">${p.traditional}</div></div>
      </div>
      <div class="m-footer">
        <button class="btn btn-w btn-sm" onclick="closeById('procOverlay');openForm('simple')">Обсудить этот процесс</button>
        <button class="btn btn-g btn-sm" onclick="closeById('procOverlay')">Закрыть</button>
      </div>
    </div>`;
  openOverlay('procOverlay');
}

/* ── CASE CAROUSELS (index / cases grid) ── */
function initCaseCarousels() {
  document.querySelectorAll('[data-case-carousel]').forEach(root => {
    const track = root.querySelector('.case-carousel-track');
    const slides = root.querySelectorAll('.case-carousel-slide');
    const prev = root.querySelector('.case-carousel-prev');
    const next = root.querySelector('.case-carousel-next');
    const dotsRoot = root.querySelector('.case-carousel-dots');
    if (!track || slides.length < 2) return;

    let idx = 0;
    let dotBtns = [];

    function setTransform() {
      track.style.transform = `translateX(${-idx * 100}%)`;
      dotBtns.forEach((b, j) => b.classList.toggle('on', j === idx));
    }

    function go(delta) {
      idx = (idx + delta + slides.length) % slides.length;
      setTransform();
    }

    if (dotsRoot) {
      dotsRoot.innerHTML = '';
      dotBtns = Array.from(slides).map((_, j) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'case-carousel-dot' + (j === 0 ? ' on' : '');
        b.setAttribute('aria-label', 'Слайд ' + (j + 1));
        b.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          idx = j;
          setTransform();
        });
        dotsRoot.appendChild(b);
        return b;
      });
    }

    prev?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      go(-1);
    });
    next?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      go(1);
    });

    let tx0 = null;
    root.addEventListener('touchstart', e => {
      if (e.touches.length === 1) tx0 = e.touches[0].clientX;
    }, { passive: true });
    root.addEventListener('touchend', e => {
      if (tx0 == null || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - tx0;
      tx0 = null;
      if (dx > 48) go(-1);
      else if (dx < -48) go(1);
    }, { passive: true });

    setTransform();
  });
}

/* ── INIT (called after DOM ready) ── */
function initPage() {
  renderTypicalTasks();
  initCaseCarousels();
  triggerReveal();
  document.querySelectorAll('.cnt').forEach(el => counterObs.observe(el));
  document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => e.preventDefault()));
}
