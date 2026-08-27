@echo off
rem Обёртка для планировщика Windows: он не умеет запускать node напрямую с
rem рабочей папкой, а журнал запуска надо куда-то писать.
rem
rem Установка задания (один раз, из папки репозитория):
rem   schtasks /create /tn "Лазер Клин - пост дня" /tr "%~f0" /sc daily /st 09:30
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
for /f "tokens=1-3 delims=." %%a in ("%date%") do set STAMP=%%c-%%b-%%a
node scripts\daily.mjs >> "logs\%STAMP%.txt" 2>&1
exit /b %ERRORLEVEL%
