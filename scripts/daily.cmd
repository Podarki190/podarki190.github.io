@echo off
rem Ежедневная раздача поста дня — с этого компьютера, а не из GitHub Actions.
rem
rem Почему так. Расписание GitHub на общих бегунках для этого репозитория просто
rem не срабатывает: 26 и 27 августа ни publish.yml, ни ночная сборка по cron не
rem запустились вовсе, в журнале одни ручные запуски. Планировщик Windows
rem выполняет задание минута в минуту, пока компьютер включён.
rem
rem Расписание в Actions оставлено запасным вариантом: если компьютер выключен,
rem поздний заход всё равно попробует. Двойной отправки не будет — отметка в
rem publish-state.json делает повтор пустой операцией.
rem
rem Установка задания (один раз, из этой папки):
rem   schtasks /create /tn "Лазер Клин — пост дня" /tr "%~f0" /sc daily /st 10:05
rem
rem Журнал каждого запуска пишется в logs\ рядом с репозиторием.

setlocal
cd /d "%~dp0.."

if not exist logs mkdir logs
for /f "tokens=1-3 delims=." %%a in ("%date%") do set STAMP=%%c-%%b-%%a
set LOG=logs\%STAMP%.txt

echo ================ %date% %time% ================>> "%LOG%"

rem Свежий код и, главное, свежие отметки об уже отправленном: без этого
rem запуск после чужой публикации отправит пост второй раз.
git pull --ff-only >> "%LOG%" 2>&1

rem Токены лежат в .env и в гит не попадают.
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
set SITE_BASE_URL=https://lazerklin.ru

rem Сборка сайта запускается пушем, а не расписанием, поэтому статья дня
rem появляется только после того, как в репозиторий что-то приехало. Публикатор
rem сам проверит страницу и откажется отправлять ссылку в никуда.
node scripts\publish.mjs >> "%LOG%" 2>&1
set CODE=%ERRORLEVEL%

if %CODE%==0 (
  git add publish-state.json >> "%LOG%" 2>&1
  git diff --staged --quiet || (
    git commit -m "Publish state: пост дня отправлен [skip ci]" >> "%LOG%" 2>&1
    git push origin worktree-wall-clocks-catalog-build:main >> "%LOG%" 2>&1
  )
  echo УСПЕХ>> "%LOG%"
) else (
  echo ОШИБКА, код %CODE% — пост не отправлен, разбирать по журналу выше>> "%LOG%"
)

endlocal
exit /b %CODE%
