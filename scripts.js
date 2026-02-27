(function () {
  const FORMSPREE_ID = 'xxxxx';

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (!id || id === '#') return;
        var el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function initNavbar() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  function initDropdown() {
    var aboutDropdown = document.getElementById('aboutDropdown');
    if (!aboutDropdown) return;
    var trigger = aboutDropdown.querySelector('.dropdown-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = aboutDropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', function () {
      aboutDropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function initBurger() {
    var burger = document.getElementById('burger');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!burger || !mobileMenu) return;

    burger.addEventListener('click', function () {
      burger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });

    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.classList.remove('menu-open');
      });
    });
  }

  function initRevealObserver() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length || typeof IntersectionObserver === 'undefined') return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initHeroCanvas() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var N = 60;
    var LINK_DIST = 150;
    var nodes = [];
    var w, h;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      if (!nodes.length) {
        for (var i = 0; i < N; i++) {
          nodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8
          });
        }
      }
    }

    function draw() {
      ctx.fillStyle = '#050A0F';
      ctx.fillRect(0, 0, w, h);

      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[j].x - nodes[i].x;
          var dy = nodes[j].y - nodes[i].y;
          var d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = 'rgba(0, 245, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 255, 0.6)';
        ctx.fill();
        n.x += n.vx;
        n.y += n.vy;
        if (n.x <= 0 || n.x >= w) n.vx *= -1;
        if (n.y <= 0 || n.y >= h) n.vy *= -1;
      }

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  var PORTFOLIO_ITEMS = [
    {
      id: 1,
      category: 'cv',
      categoryLabel: 'CV',
      title: 'Детектор и классификатор дорожных знаков по ГОСТ',
      shortDesc:
        'Приложение для видео 360° с GPX, карта с метками, экспорт в IndorTrafficPlan (YOLO).',
      roiMetric: 'Карта знаков, экспорт в IndorTrafficPlan',
      desc:
        'Проблема: ручной учёт знаков трудоёмкий и ресурсозатратный. ' +
        'Решение: приложение загружает видео 360° с GPX, формирует карту с метками знаков, экспорт для IndorTrafficPlan (YOLO).',
      stack: ['YOLO', 'Python', 'OpenCV'],
      result: 'Карта знаков, экспорт в IndorTrafficPlan',
      metrics: ['CV', 'YOLO'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80'
    },
    {
      id: 2,
      category: 'cv',
      categoryLabel: 'CV',
      title: 'Детектор нарушения СИЗ',
      shortDesc:
        'Обработка видео с нагрудных камер, отчёт по нарушениям (каска, роба для БГК, YOLO).',
      roiMetric: 'Автоматический отчёт по нарушениям СИЗ по временным меткам',
      desc:
        'Проблема: нарушения техники безопасности. ' +
        'Решение: видео с нагрудной камеры → отчёт с временными отрезками и типом нарушения (нет каски, штанов, робы для БГК, YOLO).',
      stack: ['YOLO', 'Python'],
      result: 'Отчёт по нарушениям СИЗ',
      metrics: ['CV', 'БГК'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80'
    },
    {
      id: 3,
      category: 'cv',
      categoryLabel: 'CV',
      title: 'Детектор крепёжных изделий для ОДК УМПО',
      shortDesc:
        'Распознавание болтов/гаек по шаблону, интеграция с Полином МДМ (YOLO).',
      roiMetric: 'До 7× ускорение сортировки крепежа',
      desc:
        'Проблема: ручная сортировка и подсчёт болтов, гаек, шайб разных типоразмеров при разборе авиадвигателей. ' +
        'Решение: определяет типоразмер по шаблону, подсвечивает и считает (YOLO + интеграция Полином МДМ).',
      stack: ['YOLO', 'Полином МДМ'],
      result: 'Подсчёт типоразмеров крепежа',
      metrics: ['CV', 'ОДК УМПО'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&q=80'
    },
    {
      id: 4,
      category: 'cv',
      categoryLabel: 'CV',
      title: 'Классификатор износа нефтяных долот для ИТ Космос',
      shortDesc: 'По фото определяет ремонтопригодность (YOLO).',
      roiMetric: 'Оценка ремонтопригодности по фото',
      desc:
        'Проблема: ручная оценка износа. ' +
        'Решение: по фото определяет тип нарушения и ремонтопригодность (YOLO).',
      stack: ['YOLO', 'Python'],
      result: 'Ремонтопригодность по фото',
      metrics: ['CV', 'ИТ Космос'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80'
    },
    {
      id: 5,
      category: 'cv',
      categoryLabel: 'CV',
      title: 'Платформа для анализа транспортного потока',
      shortDesc:
        'MVP. По видео с камер — плотность потока, классификация типа транспорта по ГОСТ (YOLO).',
      roiMetric: 'Плотность потока и классификация транспорта по ГОСТ',
      desc:
        'Решение: по видео с камер считает плотность потока, классифицирует тип транспорта по ГОСТ (YOLO). MVP.',
      stack: ['YOLO', 'Python'],
      result: 'Плотность потока, классификация по ГОСТ',
      metrics: ['CV', 'MVP'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80'
    },
    {
      id: 6,
      category: 'web',
      categoryLabel: 'Веб+LLM',
      title: 'Генерация карточек для маркетплейсов',
      shortDesc:
        'Генерация карточек товаров для маркетплейсов с использованием LLM.',
      roiMetric: 'Автоматическая генерация карточек товаров',
      desc: 'Генерация карточек для маркетплейсов с использованием LLM.',
      stack: ['LLM', 'Веб'],
      result: 'Карточки для маркетплейсов',
      metrics: ['Веб', 'LLM'],
      datePublished: '2025',
      img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80'
    },
    {
      id: 7,
      category: 'ml',
      categoryLabel: 'ML',
      title: 'Предиктивная аналитика: прогнозирование ресурса ГТД',
      shortDesc: 'Прогнозирование остаточного ресурса газотурбинных двигателей.',
      roiMetric: 'Прогноз остаточного ресурса ГТД',
      desc: 'Предиктивная аналитика: прогнозирование ресурса ГТД.',
      stack: ['ML', 'Python'],
      result: 'Прогноз ресурса ГТД',
      metrics: ['ML'],
      datePublished: '2024',
      img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80'
    },
    {
      id: 8,
      category: 'rl',
      categoryLabel: 'RL',
      title:
        'Эксперимент для выставки Роснефти: роботы собирают слова из букв',
      shortDesc:
        'Обучение с подкреплением: роботы учатся собирать слова из букв на скорость.',
      roiMetric: 'Демо на выставке Роснефти',
      desc:
        'Эксперимент для выставки Роснефти: роботы учатся собирать слова из букв на скорость (обучение с подкреплением).',
      stack: ['Reinforcement Learning', 'Роботы'],
      result: 'Демо на выставке Роснефти',
      metrics: ['RL'],
      datePublished: '2024',
      img: 'https://images.unsplash.com/photo-1531746795393-6c60b1687b59?w=600&q=80'
    },
    {
      id: 9,
      category: 'cv',
      categoryLabel: 'CV/ML',
      title: 'Беспилотный болид',
      shortDesc: 'В разработке.',
      roiMetric: 'В разработке',
      desc: 'Беспилотный болид (в разработке). CV/ML.',
      stack: ['CV', 'ML'],
      result: 'В разработке',
      metrics: ['CV/ML'],
      datePublished: '2026',
      status: 'in-progress',
      img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80'
    }
  ];

  function buildPortfolioCard(p) {
    var card = document.createElement('div');
    card.className = 'portfolio-card reveal';
    card.setAttribute('data-category', p.category);
    card.setAttribute('data-hidden', 'false');
    card.setAttribute('data-id', String(p.id));

    var altText = 'Кейс: ' + (p.title || '') + '. ' + (p.roiMetric || p.shortDesc || '');
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + '...';
    }

    var imgHtml = p.img
      ? '<div class="portfolio-card-img-wrap">' +
        '<img class="portfolio-card-img" src="' +
        p.img +
        '" alt="' +
        altText.replace(/"/g, '&quot;') +
        '" loading="lazy">' +
        '</div>'
      : '';

    var bodyHtml =
      '<div class="portfolio-card-body">' +
      '<span class="category">' +
      p.categoryLabel +
      '</span>' +
      '<h3 class="title">' +
      p.title +
      '</h3>';

    if (p.shortDesc) {
      bodyHtml += '<p class="short-desc">' + p.shortDesc + '</p>';
    }

    if (p.roiMetric) {
      bodyHtml +=
        '<p class="portfolio-roi" style="font-size:0.75rem;color:var(--accent);margin:6px 0 0;">' +
        p.roiMetric +
        '</p>';
    }

    if (p.metrics && p.metrics.length) {
      bodyHtml +=
        '<div class="portfolio-card-metrics">' +
        p.metrics.map(function (m) {
          return '<span>' + m + '</span>';
        }).join('') +
        '</div>';
    }

    if (p.datePublished) {
      bodyHtml +=
        '<span class="portfolio-date" style="font-size:0.75rem;color:var(--text-muted);">' +
        p.datePublished +
        (p.status === 'in-progress' ? ' · в разработке' : '') +
        '</span>';
    }

    bodyHtml += '</div>';

    card.innerHTML = imgHtml + bodyHtml;
    return card;
  }

  function attachPortfolioModal(card, modalOverlay, modalContent) {
    card.addEventListener('click', function () {
      if (!modalOverlay || !modalContent) return;
      var id = parseInt(card.getAttribute('data-id') || '0', 10);
      var item = PORTFOLIO_ITEMS.find(function (x) {
        return x.id === id;
      });
      if (!item) return;

      var modalDate = item.datePublished
        ? '<p class="portfolio-date" style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:12px;">Год: ' +
          item.datePublished +
          '</p>'
        : '';

      var resultBlock = item.result
        ? '<p class="result-metric" style="font-family:var(--font-mono);font-size:0.875rem;color:var(--accent);margin-top:12px;">' +
          item.result +
          '</p>'
        : '';

      modalContent.innerHTML =
        '<h3 class="title">' +
        item.title +
        '</h3>' +
        modalDate +
        '<p class="desc">' +
        item.desc +
        '</p>' +
        '<div class="stack">' +
        item.stack.map(function (s) {
          return '<span>' + s + '</span>';
        }).join('') +
        '</div>' +
        resultBlock +
        '<p style="margin-top:20px;">' +
        '<a href="' +
        (document.body.id === 'portfolioPage' ? 'index.html#quiz' : '#quiz') +
        '" class="btn-cta">Хочу похожее</a>' +
        '</p>';

      modalOverlay.classList.add('open');
    });
  }

  function initPortfolioTeaser() {
    var grid = document.getElementById('portfolioGrid');
    var modal = document.getElementById('portfolioModal');
    var modalContent = document.getElementById('modalContent');
    var modalClose = document.getElementById('modalClose');
    if (!grid || grid.getAttribute('data-teaser') !== 'true') return;

    function render(filter) {
      grid.innerHTML = '';
      var list = PORTFOLIO_ITEMS.slice(0, 4);
      list.forEach(function (p) {
        if (filter !== 'all' && p.category !== filter) return;
        var card = buildPortfolioCard(p);
        attachPortfolioModal(card, modal, modalContent);
        grid.appendChild(card);
      });
    }

    render('all');

    document
      .querySelectorAll('.filter-btn[data-filter]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          document
            .querySelectorAll('.filter-btn[data-filter]')
            .forEach(function (b) {
              b.classList.remove('active');
            });
          btn.classList.add('active');
          var filter = btn.getAttribute('data-filter') || 'all';
          render(filter);
        });
      });

    if (modalClose && modal) {
      modalClose.addEventListener('click', function () {
        modal.classList.remove('open');
      });
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  }

  function initPortfolioPage() {
    var grid = document.getElementById('portfolioGrid');
    var modal = document.getElementById('portfolioModal');
    var modalContent = document.getElementById('modalContent');
    var modalClose = document.getElementById('modalClose');
    if (!grid || grid.getAttribute('data-teaser') === 'true') return;

    function render(filter) {
      grid.innerHTML = '';
      PORTFOLIO_ITEMS.forEach(function (p) {
        if (filter !== 'all' && p.category !== filter) return;
        var card = buildPortfolioCard(p);
        attachPortfolioModal(card, modal, modalContent);
        grid.appendChild(card);
      });
    }

    render('all');

    document
      .querySelectorAll('.filter-btn[data-filter]')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          document
            .querySelectorAll('.filter-btn[data-filter]')
            .forEach(function (b) {
              b.classList.remove('active');
            });
          btn.classList.add('active');
          var filter = btn.getAttribute('data-filter') || 'all';
          render(filter);

          [].forEach.call(grid.children, function (c) {
            var show =
              filter === 'all' ||
              c.getAttribute('data-category') === filter;
            c.setAttribute('data-hidden', show ? 'false' : 'true');
          });
        });
      });

    if (modalClose && modal) {
      modalClose.addEventListener('click', function () {
        modal.classList.remove('open');
      });
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  }

  function initFaq() {
    var faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var open = item.classList.contains('open');
        faqItems.forEach(function (i) {
          i.classList.remove('open');
          var ai = i.querySelector('.faq-a');
          if (ai) ai.style.maxHeight = '';
        });
        if (!open) {
          item.classList.add('open');
          a.style.maxHeight = '240px';
        }
      });
    });
  }

  function initQuiz() {
    var quizWrap = document.querySelector('.quiz-wrap');
    if (!quizWrap) return;

    var quizState = {
      q1: null,
      q2: null,
      q3: null,
      resultKey: null,
      resultLabel: null
    };

    var q2Options = {
      A: [
        {
          label: '🛒 Плохая консультация на сайте/в мессенджерах',
          value: 'A1'
        },
        { label: '📞 Мёртвый обзвон базы', value: 'A2' },
        { label: '✍️ Нет контента для прогрева', value: 'A3' }
      ],
      B: [
        { label: '📑 Документооборот зависает', value: 'B1' },
        { label: '🗂 Поиск в архивах — ад', value: 'B2' },
        { label: '🤷 Встречи и потеря контекста', value: 'B3' }
      ],
      C: [
        { label: '🏭 Брак на производстве поздно', value: 'C1' },
        { label: '🚚 Не отслеживаем товары/оборудование', value: 'C2' },
        { label: '🛡 Нарушения ТБ на объектах', value: 'C3' }
      ],
      D: [
        { label: '🔮 Прогноз спроса', value: 'D1' },
        { label: '📈 Сегментация клиентов', value: 'D2' },
        { label: '⏱️ Отток сотрудников/клиентов', value: 'D3' }
      ]
    };

    var resultBlocks = {
      A1: {
        title: 'NLP и языковые модели',
        text:
          'Спад из-за коммуникации. Подойдут: AI-ассистент (чат-бот на LLM), автобозвон, генерация текстов для рассылок.',
        label: 'pain: NLP for sales communication',
        painShort: 'коммуникация с клиентами',
        effect: '+30% к конверсии и скорости ответов'
      },
      A2: {
        title: 'Big Data и аналитика',
        text:
          'Рост продаж без ясности. Подойдут: сегментация базы, LTV, скорринг лидов.',
        label: 'pain: Big Data for sales growth',
        painShort: 'рост продаж',
        effect: '+25% к эффективности маркетинга'
      },
      B1: {
        title: 'NLP и языковые модели',
        text:
          'Хаос в документах. Подойдут: семантический поиск, суммаризация встреч, классификация обращений.',
        label: 'pain: NLP for documents and communications',
        painShort: 'документы и коммуникации',
        effect: '−50% времени на поиск и согласования'
      },
      B2: {
        title: 'Reinforcement Learning',
        text:
          'Хаос в процессах. Подойдут: оптимизация маршрутов и ресурсов в реальном времени.',
        label: 'pain: RL for process optimization',
        painShort: 'оптимизация процессов',
        effect: '+20% эффективности логистики'
      },
      V1: {
        title: 'Computer Vision',
        text:
          'Слепые зоны на производстве/логистике. Подойдут: контроль качества, детекция на складе, подсчёт людей/товаров.',
        label: 'pain: CV for production and logistics',
        painShort: 'производство и логистика',
        effect: '+35% к контролю качества, −брак'
      },
      V2: {
        title: 'Reinforcement Learning',
        text:
          'Контроль динамических процессов. Подойдут: управление роботами, оптимизация энергопотребления.',
        label: 'pain: RL for dynamic control',
        painShort: 'динамические процессы',
        effect: '+15% к эффективности оборудования'
      },
      G1: {
        title: 'Big Data и аналитика',
        text:
          'Данные не работают. Подойдут: прогнозные модели, дашборды, анализ процессов.',
        label: 'pain: Big Data and forecasting',
        painShort: 'прогнозы и аналитика',
        effect: '−60% времени на принятие решений'
      },
      G2: {
        title: 'Computer Vision',
        text:
          'Аналитика упирается в видео. Подойдут: анализ видеопотока, статистика посетителей, мониторинг мощностей.',
        label: 'pain: CV for video analytics',
        painShort: 'видеоаналитика',
        effect: '+40% прозрачности по объектам'
      }
    };

    var resultMap = {
      A: { growth: 'A1', forecast: 'A2', auto: 'A1', transparent: 'A1' },
      B: { auto: 'B2', growth: 'B1', forecast: 'B1', transparent: 'B1' },
      C: { transparent: 'V1', auto: 'V2', growth: 'V1', forecast: 'V1' },
      D: { forecast: 'G1', transparent: 'G2', growth: 'G1', auto: 'G1' }
    };

    var progressBar = document.getElementById('quizProgressBar');
    var quizResultContainer = document.getElementById('quizResultContainer');
    var quizResultHidden = document.getElementById('quizResultHidden');
    var quizFormBelow = document.getElementById('quizFormBelow');
    var quizLeadForm = document.getElementById('quizLeadForm');
    var quizRestart = document.getElementById('quizRestart');

    function updateProgress(step) {
      if (!progressBar) return;
      progressBar.className = 'quiz-progress-bar';
      if (step >= 2) progressBar.classList.add('step-2');
      if (step >= 3) progressBar.classList.add('step-3');
    }

    function showQuizStep(stepNum) {
      quizWrap.querySelectorAll('.quiz-step').forEach(function (s) {
        s.classList.remove('active');
      });
      var stepEl = quizWrap.querySelector(
        '.quiz-step[data-step="' + stepNum + '"]'
      );
      if (stepEl) stepEl.classList.add('active');
      if (stepNum === 1) updateProgress(1);
      else if (stepNum === 2) updateProgress(2);
      else if (stepNum === 3 || stepNum === 'result') updateProgress(3);
    }

    var q1Opts = quizWrap.querySelectorAll(
      '.quiz-step[data-step="1"] .quiz-option'
    );
    var q2Container = quizWrap.querySelector('.quiz-q2-options');
    var q3Opts = quizWrap.querySelectorAll(
      '.quiz-step[data-step="3"] .quiz-option'
    );

    function renderQ2() {
      if (!quizState.q1 || !q2Options[quizState.q1] || !q2Container) return;
      q2Container.innerHTML = '';
      q2Options[quizState.q1].forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.setAttribute('data-value', opt.value);
        btn.innerHTML = '<span class="opt-desc">' + opt.label + '</span>';
        q2Container.appendChild(btn);
      });
      q2Container.querySelectorAll('.quiz-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
          quizState.q2 = btn.getAttribute('data-value');
          showQuizStep(3);
        });
      });
    }

    q1Opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        quizState.q1 = btn.getAttribute('data-value');
        renderQ2();
        showQuizStep(2);
      });
    });

    q3Opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        quizState.q3 = btn.getAttribute('data-value');
        var mapForQ1 = resultMap[quizState.q1] || {};
        var key =
          mapForQ1[quizState.q3] ||
          (quizState.q1 === 'C'
            ? 'V1'
            : quizState.q1 === 'D'
            ? 'G1'
            : quizState.q1 + '1');
        var block = resultBlocks[key] || resultBlocks.A1;
        quizState.resultKey = key;
        quizState.resultLabel = block.label;

        if (quizResultContainer) {
          quizResultContainer.innerHTML =
            '<div class="quiz-result-block">' +
            '<h4>Рекомендация по вашему ответу</h4>' +
            '<p><strong>Тип проекта:</strong> ' +
            (block.title || block.label || key) +
            '</p>' +
            '<p>' +
            (block.text || '') +
            '</p>' +
            '</div>';
        }

        if (quizResultHidden) {
          quizResultHidden.value = block.label;
        }
        var legacyHidden = document.getElementById('quizResultHiddenLegacy');
        if (legacyHidden) {
          legacyHidden.value = block.label;
        }
        var msgField = document.getElementById('quizMessageField');
        if (msgField) {
          msgField.placeholder =
            'Расскажите о вашей задаче по теме «' +
            (block.painShort || 'ваша боль') +
            '»';
        }
        if (quizFormBelow) {
          quizFormBelow.style.display = 'block';
        }
        showQuizStep('result');
      });
    });

    if (quizRestart) {
      quizRestart.addEventListener('click', function () {
        quizState = {
          q1: null,
          q2: null,
          q3: null,
          resultKey: null,
          resultLabel: null
        };
        if (quizResultHidden) quizResultHidden.value = '';
        var legacyHidden = document.getElementById('quizResultHiddenLegacy');
        if (legacyHidden) legacyHidden.value = '';
        if (quizFormBelow) quizFormBelow.style.display = 'none';
        showQuizStep(1);
      });
    }

    if (quizLeadForm && FORMSPREE_ID !== 'xxxxx') {
      quizLeadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = quizLeadForm.querySelector('[name="name"]');
        var email = quizLeadForm.querySelector('[name="email"]');
        if (!name.value.trim() || !email.value.trim()) {
          name.classList.add('error');
          email.classList.add('error');
          return;
        }
        var fd = new FormData(quizLeadForm);
        fd.append('_subject', 'Лид с квиза: персональное предложение');
        var btn = quizLeadForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        fetch('https://formspree.io/f/' + FORMSPREE_ID, {
          method: 'POST',
          body: fd,
          headers: { Accept: 'application/json' }
        })
          .then(function (r) {
            if (r.ok) {
              quizFormBelow.innerHTML =
                '<div class="form-success show" style="display:block;">' +
                '<h3>Спасибо!</h3>' +
                '<p>Учтём вашу боль и свяжемся в течение 24 ч.</p>' +
                '<p>Бонус: гайд «Внедрение AI за 4 недели» отправим на указанный email.</p>' +
                '</div>';
            } else {
              btn.disabled = false;
            }
          })
          .catch(function () {
            btn.disabled = false;
          });
      });
    }
  }

  function initNoQuizModal() {
    var noQuizModal = document.getElementById('noQuizModal');
    var openNoQuizModal = document.getElementById('openNoQuizModal');
    var closeNoQuizModal = document.getElementById('closeNoQuizModal');
    var noQuizForm = document.getElementById('noQuizForm');
    var noQuizFormSuccess = document.getElementById('noQuizFormSuccess');
    var faqNoQuizLink = document.getElementById('faqNoQuizLink');

    if (!noQuizModal) return;

    function openModal(e) {
      if (e) e.preventDefault();
      noQuizModal.classList.add('open');
    }

    if (openNoQuizModal) {
      openNoQuizModal.addEventListener('click', openModal);
    }
    if (faqNoQuizLink) {
      faqNoQuizLink.addEventListener('click', openModal);
    }
    if (closeNoQuizModal) {
      closeNoQuizModal.addEventListener('click', function () {
        noQuizModal.classList.remove('open');
      });
    }
    noQuizModal.addEventListener('click', function (e) {
      if (e.target === noQuizModal) {
        noQuizModal.classList.remove('open');
      }
    });

    if (noQuizForm && FORMSPREE_ID !== 'xxxxx') {
      noQuizForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(noQuizForm);
        fd.append('_subject', 'Заявка без диагностики');
        var btn = noQuizForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        fetch('https://formspree.io/f/' + FORMSPREE_ID, {
          method: 'POST',
          body: fd,
          headers: { Accept: 'application/json' }
        })
          .then(function (r) {
            if (r.ok) {
              noQuizForm.style.display = 'none';
              if (noQuizFormSuccess) noQuizFormSuccess.style.display = 'block';
            } else {
              btn.disabled = false;
            }
          })
          .catch(function () {
            btn.disabled = false;
          });
      });
    }
  }

  function init() {
    initNavbar();
    initDropdown();
    initBurger();
    initSmoothAnchors();
    initRevealObserver();
    initHeroCanvas();
    initPortfolioTeaser();
    initPortfolioPage();
    initFaq();
    initQuiz();
    initNoQuizModal();
  }

  init();
})();

