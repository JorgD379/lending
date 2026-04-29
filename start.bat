@echo off
echo ========================================
echo   ИТиС ЛАБ — Запуск локального сервера
echo ========================================
echo.

:: Проверяем Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Запуск на http://localhost:8000
    echo Открой браузер и перейди по адресу: http://localhost:8000
    echo.
    echo Для остановки нажми Ctrl+C
    echo.
    python -m http.server 8000
    goto end
)

:: Если Python не найден — пробуем py
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo Запуск на http://localhost:8000
    echo Открой браузер и перейди по адресу: http://localhost:8000
    echo.
    echo Для остановки нажми Ctrl+C
    echo.
    py -m http.server 8000
    goto end
)

:: Если Python нет — пробуем Node.js / npx
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo Запуск через npx serve на http://localhost:3000
    echo Открой браузер и перейди по адресу: http://localhost:3000
    echo.
    echo Для остановки нажми Ctrl+C
    echo.
    npx serve . -p 3000
    goto end
)

echo ОШИБКА: Python и Node.js не найдены.
echo Установи Python с https://python.org или Node.js с https://nodejs.org
echo.
pause

:end
