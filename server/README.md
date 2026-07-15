# lab-itis.ru — деплой на VPS

Сайт и бэкенд заявок теперь живут на одном VPS (раньше сайт был на GitHub
Pages, а бэкенд планировался на отдельном поддомене — от обеих схем
отказались в пользу одного простого сервера).

Что тут крутится:
- статика сайта — раздаётся nginx напрямую;
- `server/` — Node.js-сервис: `POST /api/lead` (приём заявок, email +
  запись в SQLite) и `/admin/` (защищённая панель просмотра заявок);
- заявки хранятся в `server/data/leads.db` (SQLite через встроенный в
  Node модуль `node:sqlite` — отдельный npm-пакет для этого не нужен),
  вложения — в `server/uploads/`.

Спека: `docs/superpowers/specs/2026-07-13-vps-migration-backend-design.md`
План реализации: `docs/superpowers/plans/2026-07-13-vps-migration-backend-plan.md`

## 1. Что нужно перед деплоем

1. VPS (Ubuntu 22.04+), даже самый дешёвый тариф подходит.
2. DNS: A-записи `lab-itis.ru` и `www.lab-itis.ru` → IP этого VPS
   (замените текущие записи, указывающие на GitHub Pages).
3. **Node.js 22.5+** и nginx на сервере. Версия важна: бэкенд использует
   встроенный в Node модуль `node:sqlite` (появился в 22.5), более старые
   версии Node не подойдут. Проверить: `node --version`. Если на сервере
   старее — поставить актуальный LTS через NodeSource:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Пароль приложения Яндекса для `info@lab-itis.ru` (Безопасность →
   Пароли приложений → «Почта» на id.yandex.ru).

`node:sqlite` пока помечен Node'ом как experimental (при старте будет
безобидное предупреждение в логе) — но это не требует компиляции нативных
модулей при установке, в отличие от альтернатив вроде `better-sqlite3`,
поэтому `npm install` на VPS будет быстрым и без `build-essential`.

## 2. Базовая защита VPS (сделать один раз, до открытия портов наружу)

```bash
# Файрвол — открыты только SSH, HTTP, HTTPS
sudo apt-get update
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# SSH только по ключу (отключаем вход по паролю)
# В /etc/ssh/sshd_config выставить:
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart ssh

# Автообновления безопасности ОС
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 3. Установка кода на VPS

```bash
sudo mkdir -p /var/www/lab-itis.ru
sudo chown $USER:$USER /var/www/lab-itis.ru
git clone <URL-этого-репозитория> /var/www/lab-itis.ru
cd /var/www/lab-itis.ru/server
npm install --omit=dev
```

## 4. Настройка .env

```bash
cp .env.example .env
nano .env
```

Заполнить `SMTP_USER` / `SMTP_PASS` (пароль приложения Яндекса из шага 1).

**Пароль администратора** — в `.env` хранится не сам пароль, а его bcrypt-хэш:

```bash
node -e "console.log(require('bcryptjs').hashSync('ваш-пароль-сюда', 10))"
```

Скопировать вывод в `ADMIN_PASSWORD_HASH=` в `.env`.

**Секрет сессии**:

```bash
openssl rand -hex 32
```

Скопировать вывод в `SESSION_SECRET=` в `.env`.

## 5. Проверка руками перед systemd

```bash
node server.js
```

Ожидается:
```
[OK] SMTP-подключение к smtp.yandex.ru установлено
[OK] lab-itis-lead-mailer слушает порт 3001
```

(Строка про `ExperimentalWarning: SQLite is an experimental feature` —
это ожидаемо и безвредно, ни на что не влияет.)

Открыть `http://<IP-сервера>:3001/admin/` — должна открыться форма входа,
вход по паролю из шага 4 должен пускать в панель (пока пустую).
Остановить (Ctrl+C) перед переходом к systemd.

## 6. systemd

```bash
sudo cp deploy/lab-itis-mailer.service /etc/systemd/system/
sudo chown -R www-data:www-data /var/www/lab-itis.ru
sudo systemctl daemon-reload
sudo systemctl enable --now lab-itis-mailer
sudo systemctl status lab-itis-mailer
```

## 7. nginx + HTTPS

```bash
sudo cp deploy/nginx-site.conf.example /etc/nginx/sites-available/lab-itis.ru
sudo ln -s /etc/nginx/sites-available/lab-itis.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lab-itis.ru -d www.lab-itis.ru
```

## 8. Проверка после деплоя

```bash
curl https://lab-itis.ru/
curl https://lab-itis.ru/api/health
# {"ok":true,"service":"lab-itis-lead-mailer"}

curl -X POST https://lab-itis.ru/api/lead \
  -F "name=Тест" -F "email=test@example.com" -F "consent=true" -F "source=contacts"
```

Письмо должно прийти на `info@lab-itis.ru`, а заявка — появиться в
`https://lab-itis.ru/admin/` после входа по паролю.

## 9. Бэкапы

Требуется CLI `sqlite3` (`sudo apt-get install -y sqlite3`).

```bash
crontab -e
```

Добавить строку (бэкап каждый день в 03:00, локально на сервере в
`/var/backups/lab-itis-leads`):

```
0 3 * * * /var/www/lab-itis.ru/server/deploy/backup-leads.sh >> /var/log/lab-itis-backup.log 2>&1
```

Это создаёт локальные копии — рекомендуется дополнительно копировать
`/var/backups/lab-itis-leads` за пределы этого VPS (например, `rsync`
на другой сервер или в объектное хранилище) — конкретный способ зависит
от того, что у вас уже используется для бэкапов, поэтому в скрипт не
зашит.

## 10. Как обновлять сайт и заявки

**Правки статики (HTML/CSS/JS сайта, блог, кейсы):**
```bash
cd /var/www/lab-itis.ru
git pull
```
nginx ничего перезапускать не нужно — правки видны сразу
(HTML не кэшируется браузером, см. `deploy/nginx-site.conf.example`).

**Правки бэкенда** (`server/**`):
```bash
cd /var/www/lab-itis.ru
git pull
cd server
npm install --omit=dev   # если менялись зависимости
sudo systemctl restart lab-itis-mailer
```

## 11. Известное ограничение (не в рамках этого этапа)

Страницы `/industry/` и `/subindustry/` рендерят контент на клиенте из
`js/data.js` по `?id=` в URL — поисковые боты могут не видеть контент
конкретной отрасли при первом заходе. См. спеку — это отдельная
фронтенд-задача на будущее.

## 12. Логи

```bash
sudo journalctl -u lab-itis-mailer -f
```

## 13. Тесты

```bash
cd server
npm test
```

Прогоняет весь набор (`test/*.test.js`) через встроенный тест-раннер
Node (`node --test`) — TDD-покрытие для БД, отправки писем, авторизации,
роутов заявок и админки, плюс интеграционные тесты сборки приложения.
