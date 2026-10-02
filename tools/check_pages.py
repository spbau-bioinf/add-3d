"""Проверка собранного сайта в браузере (Chromium через Playwright).

Запуск: python tools/check_pages.py <папка _site> [--chromium путь] [--src <папка репозитория>]

С --src дополнительно сверяются копии gen.py и stats.py в _includes/files и assets/files.

Для каждой страницы:
  * страница открывается без ошибок JavaScript;
  * в тексте нет необработанных тегов Liquid ({% … %}, {{ … }});
  * окна запуска Python (.pyrun__code) показаны целиком, без полосы прокрутки;
  * в анимированных схемах (.anim) движущиеся элементы ни в один момент
    цикла не накладываются на подписи: анимации CSS прокручиваются по времени,
    анимации на JavaScript — через метод el.__anim.set(phase), phase от 0 до 1;
    проверка повторяется при наименьших и наибольших значениях каждого ползунка
    панели, и при каждом из них подписи сверяются также с неподвижными фигурами;
  * все мини-тесты при верных ответах собирают комментарий;
  * внутри ссылок бокового меню и карточек нет текста, кроме кодов страниц («task 1-2»):
    остальные пункты оформлены ссылками-слоями, иначе браузеры с принудительным
    подчеркиванием ссылок (Firefox, Zen) подчеркивают текст; щелчок по названию пункта
    меню, пункта подменю и карточки попадает в ссылку;
  * подменю открытой страницы содержит столько разделов и заданий, сколько заголовков
    .subsection__title и .task__title / .final-task > h2 на странице;
  * группы кнопок результата (.gv__bar не первая в блоке, .quiz__bar, строки списка
    файлов) не прилипают к блоку над ними: зазор не меньше 6 px; список файлов под
    окном Python выстроен столбиком.
Коды выхода: 0 — замечаний нет, 1 — есть замечания.
"""
import asyncio
import sys
from pathlib import Path

CHROMIUM = None
for i, a in enumerate(sys.argv):
    if a == "--chromium":
        CHROMIUM = sys.argv[i + 1]

JS_CHECK = """
async () => {
  const out = {liquid: /\\{%|\\{\\{/.test(document.body.innerText), pyrun: [], anim: [], quiz: [], layout: []};
  // кнопки: контейнер кнопки отстоит от предыдущего элемента не меньше чем на 6 px
  for (const box of document.querySelectorAll('.gv__bar:not(:first-child), .quiz__bar, .pyrun__file, .pyrun__files-title')) {
    const prev = box.previousElementSibling;
    if (!prev || box.offsetParent === null || !box.querySelector('button, code')) continue;
    const gap = box.getBoundingClientRect().top - prev.getBoundingClientRect().bottom;
    if (gap < 6 && prev.getBoundingClientRect().height > 0) out.layout.push((box.textContent.trim().slice(0, 30) || box.className) + ': зазор ' + gap.toFixed(0) + ' px');
  }
  const rows = [...document.querySelectorAll('.pyrun__file')];
  const tops = new Set(rows.map(r => Math.round(r.getBoundingClientRect().top)));
  if (rows.length && tops.size !== rows.length) out.layout.push('файлы под окном Python не столбиком');
  // ссылки: текст внутри ссылок меню и карточек — только коды страниц («task 1-2»), остальное — ссылки-слои
  out.links = [];
  document.querySelectorAll('.sidebar a, .cards a').forEach(a => {
    const t = a.textContent.trim();
    if (t && !/^task \\d+(-\\d+)?$/.test(t)) out.links.push(t.slice(0, 40));
  });
  // щелчок по названию пункта меню и по карточке попадает в ссылку
  const hits = [...document.querySelectorAll('.menu-group__list .menu__title, .submenu__text, .card__title')].filter(e => e.checkVisibility ? e.checkVisibility() : e.offsetParent !== null);
  hits.forEach(e => {
    e.scrollIntoView({block: 'center'});
    const r = e.getBoundingClientRect(), x = r.left + Math.min(r.width / 2, 20), y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    if (!top || !top.closest('a')) out.links.push('щелчок по «' + e.textContent.trim().slice(0, 30) + '» попадает в ' + (top ? top.tagName + '.' + top.className : 'ничто'));
  });
  window.scrollTo(0, 0);
  // подменю открытой страницы: число разделов и заданий совпадает с заголовками
  out.submenu = [];
  const sm = document.getElementById('submenu');
  if (sm) {
    const ns = document.querySelectorAll('.subsection__title').length, nt = document.querySelectorAll('.task__title, .final-task > h2').length;
    const ms = sm.querySelectorAll('.submenu__link:not(.submenu__link--task)').length, mt = sm.querySelectorAll('.submenu__link--task').length;
    if (ns !== ms) out.submenu.push('разделов в подменю ' + ms + ', на странице ' + ns);
    if (nt !== mt) out.submenu.push('заданий в подменю ' + mt + ', на странице ' + nt);
  }
  document.querySelectorAll('.pyrun__code').forEach((t, i) => {
    if (t.scrollHeight > t.clientHeight + 2) out.pyrun.push(i);
  });
  const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  for (const box of document.querySelectorAll('.anim')) {
    const svg = box.querySelector('svg'); if (!svg) continue;
    const anims = box.getAnimations({subtree: true});
    const texts = [...svg.querySelectorAll('text')];
    const moving = new Set();
    anims.forEach(a => { const el = a.effect && a.effect.target; if (el) moving.add(el); });
    const steps = 24, problems = [];
    const sliders = [...box.querySelectorAll('.anim__panel input[type=range]')];
    const settings = [null];
    sliders.forEach(sl => { settings.push({sl, v: sl.min}); settings.push({sl, v: sl.max}); });
    for (const st of settings) {
    if (st) { st.sl.value = st.v; st.sl.dispatchEvent(new Event('input', {bubbles: true})); }
    // подписи и неподвижные фигуры (круги, прямоугольники) при этих параметрах
    await new Promise(r => requestAnimationFrame(r));
    for (const t of texts) {
      const tb = t.getBoundingClientRect();
      for (const sh of svg.querySelectorAll('circle, rect')) {
        if (sh.closest('g') && sh.closest('g').contains(t)) continue;
        if (moving.has(sh) || [...moving].some(m => m.contains(sh))) continue;
        if (hit(tb, sh.getBoundingClientRect())) problems.push({phase: 'static', text: t.textContent.trim().slice(0, 30), el: sh.tagName + '#' + sh.id, slider: st ? st.sl.id + '=' + st.v : 'default'});
      }
    }
    for (let s = 0; s <= steps; s++) {
      const phase = s / steps;
      anims.forEach(a => { try { a.pause(); const d = a.effect.getComputedTiming().duration || 1; a.currentTime = phase * d; } catch (e) {} });
      if (box.__anim && box.__anim.set) box.__anim.set(phase);
      await new Promise(r => requestAnimationFrame(r));
      const leaves = el => el.children.length ? [...el.querySelectorAll('*')].filter(c => !c.children.length) : [el];
      const mv = [...moving].filter(m => !m.matches('text')).flatMap(leaves);
      for (const t of texts) {
        if (mv.some(m => m.contains(t))) continue;   // подпись внутри движущейся группы
        const tb = t.getBoundingClientRect();
        for (const m of mv) {
          if (m === t || m.contains(t)) continue;
          const mb = m.getBoundingClientRect();
          if (hit(tb, mb)) problems.push({phase: phase.toFixed(2), text: t.textContent.trim().slice(0, 30), el: m.tagName + (m.className.baseVal ? '.' + m.className.baseVal : '')});
        }
      }
      if (box.__anim && box.__anim.moving) {
        for (const m of box.__anim.moving().flatMap(leaves)) {
          const mb = m.getBoundingClientRect();
          for (const t of texts) { if (m !== t && !m.contains(t) && !(m.closest('g') && m.closest('g').contains(t)) && hit(t.getBoundingClientRect(), mb)) problems.push({phase: phase.toFixed(2), text: t.textContent.trim().slice(0, 30), el: 'js:' + (m.id || m.tagName)}); }
        }
      }
    }
    }
    sliders.forEach(sl => { sl.value = sl.defaultValue; sl.dispatchEvent(new Event('input', {bubbles: true})); });
    anims.forEach(a => { try { a.play(); } catch (e) {} });
    if (problems.length) out.anim.push({id: box.id, n: problems.length, first: problems[0]});
  }
  document.querySelectorAll('.quiz').forEach((q, i) => {
    q.querySelectorAll('input[data-ok]').forEach(r => { r.checked = true; });
    q.querySelector('.quiz__check').click();
    const ok = q.querySelector('.quiz__result') && !q.querySelector('.quiz__result').hidden;
    if (!ok) out.quiz.push(i);
  });
  return out;
}
"""


async def main():
    from playwright.async_api import async_playwright
    site = Path(sys.argv[1]).resolve()
    if "--src" in sys.argv:
        src = Path(sys.argv[sys.argv.index("--src") + 1])
        for m in ("gen.py", "stats.py"):
            a, b = src / "assets/files" / m, src / "_includes/files" / m
            if a.read_text(encoding="utf-8") != b.read_text(encoding="utf-8"):
                print(f"{m}: копии в assets/files и _includes/files различаются")
                sys.exit(1)
    pages = sorted(p for p in site.rglob("*.html") if "artifacts" not in p.parts)
    bad = 0
    async with async_playwright() as p:
        kw = {"executable_path": CHROMIUM} if CHROMIUM else {}
        b = await p.chromium.launch(**kw)
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for page in pages:
            errs.clear()
            await pg.goto(page.as_uri())
            await pg.wait_for_timeout(300)
            r = await pg.evaluate(JS_CHECK)
            notes = []
            if errs: notes.append("ошибки JS: " + "; ".join(errs)[:200])
            if r["liquid"]: notes.append("необработанный Liquid")
            if r["pyrun"]: notes.append("окно кода с прокруткой: " + str(r["pyrun"]))
            for a in r["anim"]: notes.append(f"анимация {a['id']}: {a['n']} наложений, например {a['first']}")
            if r["quiz"]: notes.append("тест не собрал комментарий: " + str(r["quiz"]))
            if r["layout"]: notes.append("кнопки: " + "; ".join(r["layout"][:4]))
            if r["links"]: notes.append("текст в ссылках или промах щелчка: " + "; ".join(r["links"][:4]))
            if r["submenu"]: notes.append("подменю: " + "; ".join(r["submenu"]))
            rel = page.relative_to(site)
            if notes:
                bad += 1
                print(f"{rel}: " + " | ".join(notes))
            else:
                print(f"{rel}: OK")
        await b.close()
    sys.exit(1 if bad else 0)


asyncio.run(main())
