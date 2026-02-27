---
name: SEO улучшения лендинга
overview: "План доработки лендинга ООО ИТиС ЛАБ по SEO: структурированные данные (schema.org), метрики в кейсах, улучшение alt, sitemap/robots, canonical и даты для GEO, плюс задел под отзывы и блог."
todos: []
isProject: false
---

# План улучшения лендинга по SEO (B2B CV/ML)

Опираемся на аудит: текущая оценка 5.5/10, цель — усилить E-E-A-T, GEO (ИИ-поиск), техническую основу и контент с метриками без поломки существующей вёрстки и логики.

---

## 1. Структурированные данные (Schema.org) — приоритет 1

**Зачем:** ИИ-поиск (Яндекс Нейро, Google AI Overview) и сниппеты берут данные из JSON-LD. Для B2B IT обязательны Organization, Person, FAQPage; для кейсов — SoftwareApplication или ItemList.

**Где править:**

- **[index.html](d:\pythonProject\lending\index.html)** — в `<head>` после `<link rel="canonical">` добавить:
  - **Organization**: название, url ([https://itislab.ru](https://itislab.ru)), description, foundingDate (2025), sameAs (соцсети при наличии), упоминание грантов/партнёров через описание.
  - **FAQPage**: один блок с `mainEntity` — 5 вопросов/ответов из существующей секции `#faq` (текст из `.faq-q` и `.faq-a-inner` без разметки ссылок для answer).
- **[team.html](d:\pythonProject\lending\team.html)** — в `<head>`:
  - **Person** для каждого из трёх (Галицков, Максимов, Нугаев): name, jobTitle, worksFor → Organization (ИТиС ЛАБ), description из bio. Можно один массив из трёх Person или три отдельных script.
- **[portfolio.html](d:\pythonProject\lending\portfolio.html)** — в `<head>`:
  - **ItemList** с перечнем проектов (name, description из `portfolio[]`) или по одному **SoftwareApplication** на кейс (name, applicationCategory, description). ItemList проще поддерживать при изменении данных в JS.
- **[competencies.html](d:\pythonProject\lending\competencies.html)** — опционально: Organization с расширенным description (гранты ФСИ, УМНИК, партнёры ОДК УМПО, БГК, ИТ Космос).

Формат: `<script type="application/ld+json">` с валидным JSON. Базовый URL для всех — `https://itislab.ru` (как в canonical).

---

## 2. Метрики в проектах портфолио (E-E-A-T, B2B)

**Зачем:** Аудит указал на отсутствие quantifiable results; запросы вида "кейс CV с метриками" и ИИ-ответы опираются на цифры.

**Где править:**

- **[portfolio.html](d:\pythonProject\lending\portfolio.html)** — массив `portfolio[]` (строки ~100–111): добавить в каждый объект поле `roiMetric` или `resultMetric` (строка), например:
  - Детектор крепежа ОДК УМПО: "до 7× ускорение сортировки крепежа" (если есть данные) или "сокращение времени сортировки" (если цифру уточните позже).
  - Детектор СИЗ БГК: "автоматический отчёт по нарушениям по временным меткам".
  - Классификатор долот ИТ Космос: "оценка ремонтопригодности по фото".
- **[index.html](d:\pythonProject\lending\index.html)** — массив портфолио на главной (поиск по `portfolio` в файле): синхронно добавить те же метрики и выводить их в карточке/модалке (например, блок `.result` или отдельная строка с метрикой).

В карточках и в модалке показывать эту метрику явно (одна строка под описанием), чтобы и пользователи, и краулеры видели результат.

---

## 3. Alt у изображений и canonical на всех страницах

**Alt:**

- **[team.html](d:\pythonProject\lending\team.html)** — заменить alt у аватаров:
  - `Галицков Богдан` → `Галицков Богдан — генеральный директор ООО ИТиС ЛАБ, победитель УМНИК и хакатонов`
  - Аналогично для Максимова (ML-разработчик), Нугаева (full stack), без перегруза ключевыми словами.
- **[portfolio.html](d:\pythonProject\lending\portfolio.html)** — в `render()` сейчас `alt="'+((p.title||'').replace(/"/g,'"'))+'"`. Оставить title в alt, но добавить контекст: например `alt="Кейс: [title]. [roiMetric или shortDesc]"` (короткая фраза, до ~125 символов).

**Canonical:**

- **[portfolio.html](d:\pythonProject\lending\portfolio.html)**, **[team.html](d:\pythonProject\lending\team.html)**, **[testimonials.html](d:\pythonProject\lending\testimonials.html)**, **[competencies.html](d:\pythonProject\lending\competencies.html)** — в `<head>` добавить:
  - `<link rel="canonical" href="https://itislab.ru/portfolio.html">` (и соответственно team.html, testimonials.html, competencies.html). Если позже будет ЧПУ (например /portfolio/), canonical обновить.

---

## 4. Sitemap.xml и robots.txt

**Создать в корне сайта (рядом с index.html):**

- **robots.txt**  
  - `User-agent:` *  
  - `Allow: /`  
  - `Sitemap: https://itislab.ru/sitemap.xml`
- **sitemap.xml** (XML 1.0, utf-8)  
  - Перечень URL: главная, portfolio, team, competencies, testimonials.  
  - Для каждого: `<loc>`, `<lastmod>` (текущая дата в формате ISO 8601), `<changefreq>monthly</monthly>` (или `weekly` для главной), `<priority>0.8</priority>` для главной, 0.6–0.7 для остальных.

После публикации — отправить sitemap в Яндекс.Вебмастер и Google Search Console.

---

## 5. Freshness и GEO (даты, FAQ уже есть)

**Даты для поисковых систем и ИИ:**

- В подвале или в блоке "О нас" на главной: одна строка вида "Материал обновлён: 2026-02-26" или "Актуально на февраль 2026" (при желании вынести в data-атрибут и дублировать в микроразметке).
- В **[portfolio.html](d:\pythonProject\lending\portfolio.html)** — в данные каждого кейса добавить поле `datePublished` или `lastUpdated` (год или полная дата); в карточке/модалке выводить "2024" / "2025" / "Обновлено 2026" там, где уместно. В JSON-LD для ItemList/SoftwareApplication указать `datePublished` по тем же данным.

Так сайт будет лучше учитываться в GEO как актуальный.

---

## 6. Внешние ссылки на авторитет (E-E-A-T)

**Минимальные правки в контенте:**

- **[competencies.html](d:\pythonProject\lending\competencies.html)** (и при желании блок "Доказательство экспертизы" в [index.html](d:\pythonProject\lending\index.html)): для слов «ФСИ» и «УМНИК» добавить первые ссылки на официальные страницы (например, фси.рф, фондсодействияинновациям.рф, умник.рф — актуальные URL проверить). Оформить как одна ссылка на абзац, не спамом.
- В schema Organization (п.1) в описании или в sameAs можно добавить ссылку на страницу компании на сайте гранта, если есть.

---

## 7. Отзывы и блог (задел без поломки текущего дизайна)

**Отзывы (testimonials):**

- **[testimonials.html](d:\pythonProject\lending\testimonials.html)** — вместо одного placeholder-текста сделать блок из 2–3 карточек "Отзыв в разработке" или кратких цитат от партнёров (ОДК УМПО, БГК, ИТ Космос), если партнёры дадут согласие. Даже одна фраза + название компании улучшит trust. При появлении реальных отзывов — добавить schema **Review** (itemReviewed → Organization, author → Organization или Person).

**Блог:**

- Не трогая текущие 5 страниц, добавить в навигацию и футер ссылку "Блог" (например `blog.html`). На первом этапе `blog.html` — одна страница-лендинг со списком статей (заголовки + краткое описание + дата). Статьи — отдельные HTML (например `blog/yolo-siz-bgk.html`) или один blog.html с якорями. Цель: TOFU-запросы ("YOLO детектор СИЗ", "CV для нефтяных долот") и рост трафика через 6–12 месяцев. Реализацию блога (статика vs генератор) можно зафиксировать отдельным шагом после выполнения п. 1–5.

---

## 8. Опционально: скорость и минификация

- Inline CSS/JS не трогать на первом этапе, чтобы не ломать деплой. Позже: вынести критические стили, минифицировать один общий CSS/JS для всех страниц, оставив инлайн только для hero/canvas если нужно.
- Проверка в Google PageSpeed Insights и исправление критичных замечаний — после внедрения schema и sitemap.

---

## Порядок внедрения (без нарушения работы сайта)

1. **Фаза 1 (код, без контента от партнёров):** п. 1 (schema), п. 3 (alt + canonical), п. 4 (sitemap, robots), п. 5 (даты в портфолио и на главной), п. 2 (метрики в портфолио).
2. **Фаза 2:** п. 6 (ссылки ФСИ/УМНИК), п. 7 (отзывы — контент; блог — структура + 1–2 статьи).
3. **Вне кода:** регистрация в Яндекс.Вебмастер и Google Search Console, отправка sitemap; сбор семантики (Вордстат) и 3–5 статей для блога; запрос отзывов у партнёров.

Все изменения — точечные правки в существующих файлах и два новых файла (sitemap.xml, robots.txt). Откат: удаление добавленных блоков и файлов.