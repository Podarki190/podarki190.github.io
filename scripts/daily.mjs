// Полный дневной цикл: собрать сайт, дождаться выкладки, раздать пост дня.
// Запускается планировщиком Windows с этого компьютера.
//
// Почему не GitHub Actions. Расписание `schedule:` для этого репозитория не
// срабатывает вовсе: 26 и 27 августа ни публикация, ни ночная сборка по cron не
// запустились, в журнале одни ручные запуски. При этом сборка по push проходит
// нормально и репозиторий публичный — значит ни квота, ни код ни при чём.
// Планировщик Windows выполняет задание минута в минуту, пока компьютер включён.
//
// Отсюда и порядок действий: раз расписание молчит, сборку приходится вызывать
// пушем. Пустой коммит — единственный способ сделать это без лишнего ключа с
// правом запускать workflow.
//
//   node scripts/daily.mjs            боевой запуск
//   node scripts/daily.mjs --dry-run  без отправки и без пуша

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS } from '../src/blog.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRANCH = 'worktree-wall-clocks-catalog-build';
const SITE = 'https://lazerklin.ru';
const BUILD_WAIT_MIN = 25;

const dryRun = process.argv.includes('--dry-run');
const stamp = () => new Date().toLocaleString('ru-RU');
const log = (...a) => console.log(`[${stamp()}]`, ...a);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, shell: process.platform === 'win32', ...opts });
    let out = '';
    child.stdout?.on('data', d => { out += d; process.stdout.write(d); });
    child.stderr?.on('data', d => { out += d; process.stderr.write(d); });
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`${cmd} вернул ${code}`))));
  });
}

const moscowToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

async function main() {
  const today = moscowToday();
  const post = POSTS.find(p => p.date === today);
  log(`день ${today}, пост: ${post ? post.slug : 'нет — делать нечего'}`);
  if (!post) return;

  // Свежие отметки об отправленном обязательны: без них запуск после чужой
  // публикации отправит пост второй раз, а в ВК это необратимо.
  await run('git', ['pull', '--ff-only', 'origin', `main:${BRANCH}`]).catch(() => run('git', ['pull', '--ff-only']));

  const url = `${SITE}/blog/${post.slug}/`;
  const live = async () => (await fetch(url).catch(() => null))?.ok === true;

  if (await live()) {
    log('статья уже на сайте, сборку не трогаю');
  } else if (dryRun) {
    log('статьи нет; вхолостую сборку не запускаю');
  } else {
    log('статьи нет — вызываю сборку пустым коммитом');
    await run('git', ['commit', '--allow-empty', '-m', `Сборка дня ${today} [автозапуск]`]);
    await run('git', ['push', 'origin', `${BRANCH}:main`]);

    const until = Date.now() + BUILD_WAIT_MIN * 60_000;
    while (Date.now() < until) {
      await new Promise(r => setTimeout(r, 30_000));
      if (await live()) break;
    }
    if (!await live()) throw new Error(`за ${BUILD_WAIT_MIN} мин статья не появилась — сборка не прошла`);
    log('статья на сайте');
  }

  await run('node', ['scripts/publish.mjs', ...(dryRun ? ['--dry-run'] : [])],
    { env: { ...process.env, SITE_BASE_URL: SITE } });

  if (dryRun) return;

  await run('git', ['add', 'publish-state.json']);
  const changed = await run('git', ['diff', '--staged', '--quiet']).then(() => false).catch(() => true);
  if (changed) {
    await run('git', ['commit', '-m', 'Publish state: пост дня отправлен [skip ci]']);
    await run('git', ['push', 'origin', `${BRANCH}:main`]);
    log('отметка об отправке записана');
  }
}

// Токены лежат в .env и в гит не попадают. Планировщик запускает задание без
// окружения оболочки, поэтому читаем файл сами, а не надеемся на переменные.
async function loadEnv() {
  const text = await readFile(path.join(ROOT, '.env'), 'utf8').catch(() => '');
  for (const line of text.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) {
      process.env[line.slice(0, i).trim()] ||= line.slice(i + 1).trim();
    }
  }
}

await loadEnv();
main().then(() => log('готово')).catch((err) => {
  console.error(`[${stamp()}] ОШИБКА: ${err.message}`);
  process.exitCode = 1;
});
