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

/* ── PROCESS MODAL ── */
function openProcModal(indId, subId, procId) {
  const procs = getProcs(indId, subId);
  const p = procs.find(x => x.id === procId);
  if (!p) return;
  document.getElementById('procContent').innerHTML = `
    <div class="m-img"><div class="m-img-g"></div><span class="m-img-lbl">[ Фото / визуализация процесса ]</span></div>
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

/* ── INIT (called after DOM ready) ── */
function initPage() {
  triggerReveal();
  document.querySelectorAll('.cnt').forEach(el => counterObs.observe(el));
  document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => e.preventDefault()));
}
