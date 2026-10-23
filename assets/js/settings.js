/* settings.js — меню настроек ⚙ в шапке, прогресс по заданиям и меню «Только задачи».

   1. МЕНЮ ⚙ (кнопка .set-btn в _includes/hdr-tools.html): «Теория» (Кратко / Подробно),
      «Цветовой профиль» (плитки профилей текущей темы; для светлой и темной темы профиль свой),
      «Показ» (Все материалы / Только задачи), «Прогресс» (сохранить в файл, загрузить, начать
      заново). Значения хранит и применяет theme.js (window.add3dSetting).

   2. ПРОГРЕСС. Проверяемые части задания: окна Python с тестами (все тесты пройдены),
      мини-тесты (все ответы верны), проверка файла G-кода (все числа совпали). Окна, тесты и
      gcheck.js сообщают об успехе событием add3d:part на своем элементе. Задание решено, когда
      пройдены все его части; у заголовка задания ставится отметка. Хранится в localStorage
      (ключ add3d-progress) только в этом браузере: файл прогресса переносит его на другой компьютер.

   3. «ТОЛЬКО ЗАДАЧИ». В боковом меню вместо страниц — список заданий практики со статусами
      (assets/js/tasks-index.js, его собирает tools/build_search.py).

   4. ПАНЕЛЬ СТРАНИЦЫ (#pbar в _layouts/default.html). Когда шапка страницы уходит с экрана, сверху
      появляется панель: «Практика N · решено K из M» и название страницы, по центру кольца страниц
      практики (заливка — доля решенных заданий страницы), по нижнему краю — сколько страницы прочитано.
      Кнопки шапки (.hdr-tools) не копируются, а переезжают в панель, пока она видна: меню ⚙ открывается
      под своей кнопкой. Считаются задания, у которых есть проверки на сайте; задание без проверок
      (parts: 0) проверяет преподаватель: у заголовка метка, в боковом меню значок, в счет оно не входит.
      На узком экране панель видна всегда, кнопка «☰» открывает боковое меню.

   5. АНИМАЦИИ СХЕМ (.anim с кнопкой «Пауза», id …-pause). Если в системе включено «уменьшить
      движение» (prefers-reduced-motion), анимация сразу стоит на итоговом кадре (__anim.set),
      кнопка показывает «Продолжить». Схема, ушедшая с экрана, останавливается и продолжает
      движение, когда возвращается; остановленную студентом схему это не запускает. */
(function () {
  "use strict";
  var KEY = "add3d-progress", root = document.documentElement;
  var base = ((document.querySelector('script[src$="assets/js/settings.js"]') || {}).src || "").replace(/assets\/js\/settings\.js.*$/, "");
  var here = location.pathname.replace(/^.*\/(task_\d+\/[^/]+\.html)$/, "$1");
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; }
  function load() { try { var p = JSON.parse(localStorage.getItem(KEY) || "{}"); return p && p.parts ? p : {parts: {}}; } catch (e) { return {parts: {}}; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* хранилище недоступно */ } }
  var TASKS = window.ADD3D_TASKS || [];
  function info(u, id) { for (var i = 0; i < TASKS.length; i++) if (TASKS[i].u === u && TASKS[i].id === id) return TASKS[i]; return null; }
  function status(t, prog) {                                       // "" — нечего проверять, done, part, none
    if (!t.parts) return "";
    var n = (prog.parts[t.u + "#" + t.id] || []).length;
    return n >= t.parts ? "done" : n ? "part" : "none";
  }

  /* ---------- 2. прогресс на странице ---------- */
  var TASK_SEL = ".task:not(.task--star), .final-task, .capstone";
  function partKey(node) {
    var task = node.closest(TASK_SEL); if (!task || !task.id) return null;
    var box = node.closest(".pyrun, .quiz, .gcheck"); if (!box) return null;
    if (box.classList.contains("pyrun")) return [task, "py:" + box.getAttribute("data-file")];
    var kind = box.classList.contains("quiz") ? "quiz" : "g";
    return [task, kind + ":" + Array.prototype.indexOf.call(task.querySelectorAll(box.classList.contains("quiz") ? ".quiz" : ".gcheck"), box)];
  }
  function badges() {
    var prog = load();
    Array.prototype.forEach.call(document.querySelectorAll(TASK_SEL), function (task) {
      var t = info(here, task.id), h = task.querySelector("h2, h3"); if (!t || !h) return;
      var b = h.querySelector(".task-status");
      var st = status(t, prog), n = (prog.parts[t.u + "#" + t.id] || []).length;
      var ic = document.querySelector('.submenu__link--task[data-href="#' + task.id + '"] .submenu__icon');   // подменю: ✓ или значок преподавателя
      if (ic) ic.className = "submenu__icon" + (st === "done" ? " st-done" : st === "" ? " st-teach" : "");
      if (!st) {                                                   // проверок на сайте нет: задание проверяет преподаватель
        if (!b) { b = el("span"); h.appendChild(b); }
        b.className = "task-status task-status--teach"; b.textContent = "проверяет преподаватель"; return;
      }
      if (!st || st === "none") { if (b) b.remove(); return; }   // отметка появляется после первой пройденной проверки
      if (!b) { b = el("span", "task-status"); h.appendChild(b); }
      b.className = "task-status task-status--" + st;
      b.textContent = st === "done" ? "✓ решено" : "проверено " + Math.min(n, t.parts) + " из " + t.parts;
    });
    pbar();
  }
  document.addEventListener("add3d:part", function (e) {
    var k = partKey(e.target); if (!k) return;
    var prog = load(), id = here + "#" + k[0].id, list = prog.parts[id] || [];
    if (list.indexOf(k[1]) < 0) { list.push(k[1]); prog.parts[id] = list; save(prog); }
    badges(); nav();
  });

  /* ---------- 3. меню «Только задачи» ---------- */
  var navBox = null;
  function nav() {
    var m = /task_(\d+)\//.exec(here), side = document.querySelector(".sidebar");
    if (!m || !side || !TASKS.length) return;
    var w = +m[1], list = TASKS.filter(function (t) { return t.w === w; }), prog = load();
    if (!navBox) {
      navBox = el("nav", "ex-nav"); navBox.setAttribute("aria-label", "Задания практики");
      var brand = side.querySelector(".sidebar__brand");
      side.insertBefore(navBox, brand ? brand.nextSibling : side.firstChild);
    }
    navBox.innerHTML = "";
    var track = list.filter(function (t) { return t.parts; }), done = track.filter(function (t) { return status(t, prog) === "done"; }).length;
    var head = el("div", "ex-nav__head");
    head.appendChild(el("span", "ex-nav__title", "Задания практики " + w));
    head.appendChild(el("span", "ex-nav__count", "решено " + done + " из " + track.length));
    navBox.appendChild(head);
    var bar = el("div", "ex-nav__bar"), fill = el("span"); fill.style.width = (track.length ? 100 * done / track.length : 0) + "%";
    bar.appendChild(fill); navBox.appendChild(bar);
    var ol = el("ol", "ex-nav__list"); mine = [];
    list.forEach(function (t) {
      // текст стоит вне ссылки, ссылка — пустой слой поверх пункта (как в _includes/sidebar.html):
      // Firefox и Zen с принудительным подчеркиванием не подчеркивают названия
      var li = el("li"), a = el("div", "ex-item"), name = t.title.charAt(0).toUpperCase() + t.title.slice(1);
      a.appendChild(el("span", "ex-item__code", t.code));
      a.appendChild(el("span", "ex-item__title", name));
      var st = status(t, prog), s = el("span", "ex-item__st" + (st ? " ex-item__st--" + st : ""));
      s.title = {done: "Решено", part: "Проверено частично", none: "Не решено", "": "Проверяется преподавателем"}[st];
      a.appendChild(s);
      var hit = el("a", "ex-item__hit"); hit.href = (t.u === here ? "" : base + t.u) + "#" + t.id; hit.setAttribute("aria-label", t.code + ": " + name);
      a.appendChild(hit); li.appendChild(a); ol.appendChild(li);
      if (t.u === here) mine.push([t.id, a]);
    });
    navBox.appendChild(ol);
    spy();
    navBox.appendChild(el("button", "ex-nav__all tool-btn", "Все материалы")).setAttribute("data-set", "view");
    navBox.lastChild.setAttribute("data-val", "all"); navBox.lastChild.type = "button";
  }

  // выделен один пункт: задание этой страницы, чей заголовок последним прошел треть экрана
  // (если ни одно не прошло — первое); после щелчка выделение закреплено за пунктом на время прокрутки
  var mine = [], lockUntil = 0, locked = null, ticking = false;
  function spy() {
    ticking = false;
    var cur = null;
    if (Date.now() < lockUntil) cur = locked;
    else mine.forEach(function (p) { var e = document.getElementById(p[0]); if (e && (!cur || e.getBoundingClientRect().top <= window.innerHeight * 0.3)) cur = p[1]; });
    if (Date.now() >= lockUntil && mine.length && window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = mine[mine.length - 1][1];   // конец страницы — последнее задание
    mine.forEach(function (p) { p[1].classList.toggle("is-here", p[1] === cur); });
  }
  window.addEventListener("scroll", function () { if (!ticking && mine.length) { ticking = true; requestAnimationFrame(spy); } }, {passive: true});
  ["load", "resize", "hashchange"].forEach(function (n) { window.addEventListener(n, function () { setTimeout(spy, 50); }); });
  document.addEventListener("click", function (e) {
    var hit = e.target.closest && e.target.closest(".ex-item__hit"); if (!hit) return;
    mine.forEach(function (p) { if (p[1] === hit.parentNode) { locked = p[1]; lockUntil = Date.now() + 1200; spy(); } });
  });

  /* ---------- 4. панель страницы ---------- */
  var bar = document.getElementById("pbar"), head = document.querySelector(".page-header"), barPop = null;
  function pbar() {                                                // счетчик, кольца страниц и окно «что считается»
    var w = bar && +bar.getAttribute("data-work"); if (!w || !TASKS.length) return;
    var prog = load(), list = TASKS.filter(function (t) { return t.w === w; }), track = list.filter(function (t) { return t.parts; });
    var done = track.filter(function (t) { return status(t, prog) === "done"; }).length, side = document.querySelector(".sidebar");
    var cnt = bar.querySelector(".pbar__count");
    cnt.innerHTML = ""; cnt.appendChild(document.createTextNode(" · "));
    var cb = el("button", "pbar__cnt"); cb.type = "button"; cb.setAttribute("aria-expanded", String(!!barPop && !barPop.hidden)); cb.title = "Что считается";
    cb.appendChild(document.createTextNode("решено ")); cb.appendChild(el("b", "", String(done))); cb.appendChild(document.createTextNode(" из " + track.length));
    cb.addEventListener("click", function (e) { e.stopPropagation(); barPop.hidden = !barPop.hidden; cb.setAttribute("aria-expanded", String(!barPop.hidden)); });
    cnt.appendChild(cb);
    if (!barPop) { barPop = el("div", "pbar__pop"); barPop.hidden = true; barPop.setAttribute("role", "dialog"); barPop.setAttribute("aria-label", "Прогресс практики"); bar.appendChild(barPop); }
    barPop.innerHTML = "";
    barPop.appendChild(el("p", "", "Практика " + w + ": решено " + done + " из " + track.length + " заданий, которые проверяются на сайте. Задание решено, когда пройдены все его проверки: тесты окна Python, мини-тест, проверка файла G-кода."));
    list.filter(function (t) { return !t.parts; }).forEach(function (t) {
      var code = t.code.split("."), kind = code[1] === "И" ? "Итоговое задание" : "Задание " + code[1];
      barPop.appendChild(el("p", "", kind + " task " + code[0] + " «" + t.title + "» проверяет преподаватель: в счет оно не входит."));
    });
    barPop.appendChild(el("p", "", "Кольца — страницы практики: заливка показывает долю решенных заданий страницы. Линия под панелью — сколько этой страницы прочитано."));
    var all = el("button", "", "Все задания практики →"); all.type = "button"; all.setAttribute("data-set", "view"); all.setAttribute("data-val", "tasks"); barPop.appendChild(all);
    var pages = []; list.forEach(function (t) { if (pages.indexOf(t.u) < 0) pages.push(t.u); });
    Array.prototype.forEach.call(document.querySelectorAll(".rings"), function (box) {
      box.innerHTML = "";
      pages.forEach(function (u) {
        var mine = track.filter(function (t) { return t.u === u; }), d = mine.filter(function (t) { return status(t, prog) === "done"; }).length;
        var f = mine.length ? d / mine.length : 0, hit = side && side.querySelector('.menu__hit[href$="' + u + '"]');
        // номер стоит вне ссылки, ссылка — пустой слой поверх кольца (как в _includes/sidebar.html)
        var name = hit ? hit.getAttribute("aria-label") : u, b = el("span", "rings__step" + (u === here ? " is-here" : "") + (mine.length && f === 1 ? " is-full" : ""));
        var a = el("a", "rings__hit"); a.href = u === here ? "#" : (hit ? hit.getAttribute("href") : base + u); b.style.setProperty("--f", f);
        b.appendChild(el("span", "", (/-(\d+[a-z]?)\.html$/.exec(u) || [0, "?"])[1]));
        a.setAttribute("aria-label", name + ": решено " + d + " из " + mine.length); if (u === here) a.setAttribute("aria-current", "page");
        b.appendChild(a);
        b.addEventListener("mouseenter", function () { tip(b, name + " — решено " + d + " из " + mine.length); });
        b.addEventListener("mouseleave", function () { tip(null); });
        if (u === here) a.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({top: 0, behavior: "smooth"}); });
        box.appendChild(b);
      });
    });
  }
  var tipBox = null;
  function tip(node, text) {
    if (!tipBox) { tipBox = el("div", "rings-tip"); tipBox.hidden = true; document.body.appendChild(tipBox); }
    tipBox.hidden = !node; if (!node) return;
    tipBox.textContent = text; var r = node.getBoundingClientRect();
    tipBox.style.left = Math.max(8, Math.min(window.innerWidth - 300, r.left - 40)) + "px"; tipBox.style.top = (r.bottom + 8) + "px";
  }
  if (bar && head) {
    var narrow = window.matchMedia("(max-width: 900px)"), away = false, slot = bar.querySelector(".pbar__tools"), hdr = head.querySelector(".hdr-tools");
    var place = function () {                                      // кнопки шапки — в панели, пока она видна
      var on = away || narrow.matches; bar.classList.toggle("is-on", on);
      var into = on ? slot : head;
      if (hdr && hdr.parentNode !== into) into.insertBefore(hdr, on ? null : head.firstChild);
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { away = !es[0].isIntersecting; place(); }).observe(head);
    if (narrow.addEventListener) narrow.addEventListener("change", place);
    place();
    var fill = bar.querySelector(".pbar__line i"), tick = false;
    var line = function () { tick = false; var h = document.documentElement.scrollHeight - window.innerHeight; fill.style.width = (h > 0 ? Math.min(100, 100 * window.scrollY / h) : 0) + "%"; };
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(line); } }, {passive: true});
    window.addEventListener("resize", line); line();
    // меню на узком экране
    var mb = bar.querySelector(".pbar__menu"), shade = document.querySelector(".menu-shade");
    var menu = function (on) { root.classList.toggle("menu-open", on); mb.setAttribute("aria-expanded", String(on)); };
    mb.addEventListener("click", function () { menu(!root.classList.contains("menu-open")); });
    if (shade) shade.addEventListener("click", function () { menu(false); });
    document.addEventListener("click", function (e) {
      if (barPop && !barPop.hidden && !barPop.contains(e.target)) { barPop.hidden = true; var c = bar.querySelector(".pbar__cnt"); if (c) c.setAttribute("aria-expanded", "false"); }
      if (root.classList.contains("menu-open") && e.target.closest && e.target.closest(".sidebar a")) menu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (root.classList.contains("menu-open")) { menu(false); mb.focus(); }
      if (barPop && !barPop.hidden) barPop.hidden = true;
    });
  }

  /* ---------- 1. меню ⚙ ---------- */
  var tools = document.querySelector(".hdr-tools"), gear = tools && tools.querySelector(".set-btn");
  var pop = null, main = null, palPane = null;
  function seg(label, key, opts, cls) {
    var row = el("div", "set-row" + (cls ? " " + cls : "")), box = el("div", "set-seg");
    row.appendChild(el("span", "set-label", label));
    opts.forEach(function (o) { var b = el("button", "set-seg__btn", o[1]); b.type = "button"; b.setAttribute("data-set", key); b.setAttribute("data-val", o[0]); box.appendChild(b); });
    row.appendChild(box); return row;
  }
  function mode() { return window.add3dGet("theme") === "dark" ? "dark" : "light"; }
  function palette(k) { var r = null; (window.ADD3D_PALETTES || []).forEach(function (p) { if (p[0] === k) r = p; }); return r; }
  var DEF = {light: ["#f5f7fa", "#ffffff", "#d9dee6", "#1d2430", "#444f60", "#1b7f3b", "#f8f9fb", "#1f2328", "#a0111f", "#953800", "#0550ae", "#0a3069", "#1f2328", "#6e7781"],
             dark: ["#15191e", "#1c2229", "#313a44", "#e4e8ec", "#c3cad3", "#45bf63", "#1c1f25", "#abb2bf", "#ff7b72", "#ffa657", "#79c0ff", "#a5d6ff", "#abb2bf", "#8b949e"]};
  function tile(k) {                                               // плитка профиля: окно сайта и фрагмент кода в его цветах
    var p = palette(k), c = p ? p[4] : DEF[mode()], t = el("button", "pal-tile"); t.type = "button";
    t.setAttribute("aria-pressed", String(window.add3dGet(mode() === "dark" ? "pd" : "pl") === k));
    var pv = el("span", "pal-tile__pv"); pv.style.background = c[0]; pv.style.borderColor = c[2];
    var bar = el("span", "pal-tile__bar"); bar.style.background = c[1]; bar.style.borderColor = c[2];
    var dot = el("i"); dot.style.background = c[5]; bar.appendChild(dot); pv.appendChild(bar);
    var code = el("span", "pal-tile__code"); code.style.background = c[6]; code.style.color = c[7];
    code.innerHTML = '<b style="color:' + c[8] + '">for</b> i <b style="color:' + c[8] + '">in</b> <span style="color:' + c[9] + '">range</span>(<span style="color:' + c[10] + '">3</span>):<br>&nbsp; <span style="color:' + c[9] + '">print</span>(<span style="color:' + c[11] + '">"слой"</span>) <span style="color:' + c[13] + '"># 0.2</span>';
    pv.appendChild(code); t.appendChild(pv);
    t.appendChild(el("span", "pal-tile__name", p ? p[1] : "По умолчанию"));
    t.appendChild(el("span", "pal-tile__src", p ? p[3] : "цвета сайта"));
    t.addEventListener("click", function () { window.add3dSetting(mode() === "dark" ? "pd" : "pl", k); showPalettes(); });
    return t;
  }
  function showPalettes() {
    palPane.innerHTML = "";
    var head = el("div", "pal-head"), back = el("button", "pal-back", "‹ Настройки"); back.type = "button";
    back.addEventListener("click", function () { palPane.hidden = true; main.hidden = false; refresh(); });
    head.appendChild(back); head.appendChild(el("b", "", "Цветовой профиль"));
    head.appendChild(el("span", "pal-sub", mode() === "dark" ? "темная тема" : "светлая тема"));
    palPane.appendChild(head);
    var grid = el("div", "pal-grid");
    ["default"].concat((window.ADD3D_PALETTES || []).filter(function (p) { return p[2] === mode(); }).map(function (p) { return p[0]; }))
      .forEach(function (k) { grid.appendChild(tile(k)); });
    palPane.appendChild(grid);
    palPane.appendChild(el("p", "set-note", "Профиль меняет цвета страниц и окон кода. Для светлой и темной темы он выбирается отдельно: переключите тему кнопкой в шапке."));
    main.hidden = true; palPane.hidden = false;
  }
  var palBtn, resetBtn;

  /* ---------- сброс: окно с подтверждением, файл состояния скачивается сам, сайт возвращается в исходное ---------- */
  var rsDlg = null;
  function resetDialog() {
    if (!rsDlg) {
      rsDlg = el("dialog", "rs-dlg"); rsDlg.setAttribute("aria-labelledby", "rs-title");
      rsDlg.innerHTML = '<button type="button" class="set-icon rs-x" aria-label="Закрыть" title="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
        '<h3 id="rs-title">Начать заново?</h3><p>Будут сброшены все данные сайта в этом браузере:</p><ul>' +
        '<li><b>решенные задания и прогресс</b>: отметки у заданий и в меню «Только задачи»;</li>' +
        '<li><b>текст в просмотрщике G-кода</b>, сохраненный на страницах;</li>' +
        '<li><b>настройки</b>: тема (светлая), цветовой профиль (по умолчанию), объем теории (подробно), показ (все материалы).</li></ul>' +
        '<p class="rs-warn">Отменить сброс нельзя. Перед сбросом файл с прогрессом и настройками скачается сам, если вы не сохранили его кнопкой ниже: его можно загрузить обратно через ⚙ → «Прогресс» → значок загрузки.</p>' +
        '<div class="rs-acts"><button type="button" class="tool-btn rs-save">Сохранить прогресс в файл</button><span class="rs-flex"></span>' +
        '<button type="button" class="tool-btn rs-yes">Сбросить все</button><button type="button" class="tool-btn rs-no">Отмена</button></div>';
      document.body.appendChild(rsDlg);
      var saved = false, save = rsDlg.querySelector(".rs-save");
      rsDlg.addEventListener("close", function () { saved = false; save.textContent = "Сохранить прогресс в файл"; });
      save.addEventListener("click", function () { exportProgress(); saved = true; save.textContent = "Файл сохранен"; });
      rsDlg.querySelector(".rs-x").addEventListener("click", function () { rsDlg.close(); });
      rsDlg.querySelector(".rs-no").addEventListener("click", function () { rsDlg.close(); });
      rsDlg.addEventListener("click", function (e) { if (e.target === rsDlg) rsDlg.close(); });
      rsDlg.querySelector(".rs-yes").addEventListener("click", function () {
        if (!saved) exportProgress();                               // файл состояния скачивается до сброса
        try {
          Object.keys(localStorage).forEach(function (k) { if (/^add3d|^gv:/.test(k)) localStorage.removeItem(k); });
        } catch (e) { /* хранилище недоступно */ }
        window.add3dResetSettings();
        setTimeout(function () {                                   // исходное состояние: страница без параметров адреса
          var u = location.href.replace(/[?#].*$/, ""); if (u === location.href) location.reload(); else location.replace(u);
        }, 400);
      });
    }
    rsDlg.showModal();
  }
  window.add3dResetDialog = resetDialog;
  var rsTop = tools && tools.querySelector(".rs-btn");
  if (rsTop) rsTop.addEventListener("click", resetDialog);
  function refresh() {
    if (!pop) return;
    var p = palette(window.add3dGet(mode() === "dark" ? "pd" : "pl"));
    palBtn.firstChild.textContent = p ? p[1] : "По умолчанию";
    if (window.add3dMark) window.add3dMark();
  }
  function exportProgress() {
    var data = {add3d: 1, saved: new Date().toISOString(), progress: load(), settings: {}};
    ["theme", "pl", "pd", "theory", "view"].forEach(function (k) { data.settings[k] = window.add3dGet(k); });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], {type: "application/json"}));
    a.download = "add3d_progress.json"; document.body.appendChild(a); a.click(); a.remove();
  }
  function importProgress(file, note) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(String(r.result));
        if (!d || d.add3d !== 1 || !d.progress || !d.progress.parts) throw new Error();
        var cur = load();                                          // объединение: отметки не теряются
        Object.keys(d.progress.parts).forEach(function (k) {
          var a = cur.parts[k] || []; d.progress.parts[k].forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); cur.parts[k] = a;
        });
        save(cur);
        Object.keys(d.settings || {}).forEach(function (k) { if (d.settings[k]) window.add3dSetting(k, d.settings[k]); });
        note.textContent = "Прогресс загружен из файла " + file.name + ".";
        badges(); nav(); refresh();
      } catch (e) { note.textContent = "Это не файл прогресса сайта: выберите add3d_progress.json."; }
    };
    r.readAsText(file);
  }
  function build() {
    pop = el("div", "set-pop"); pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Настройки");
    main = el("div", "set-main"); palPane = el("div", "set-pal"); palPane.hidden = true;
    main.appendChild(seg("Теория", "theory", [["brief", "Кратко"], ["full", "Подробно"]]));
    var pr = el("div", "set-row"); pr.appendChild(el("span", "set-label", "Цветовой профиль"));
    palBtn = el("button", "set-pal-open"); palBtn.type = "button"; palBtn.appendChild(el("span")); palBtn.appendChild(el("span", "set-pal-open__arr", "›"));
    palBtn.addEventListener("click", showPalettes); pr.appendChild(palBtn); main.appendChild(pr);
    main.appendChild(seg("Показ", "view", [["all", "Все материалы"], ["tasks", "Только задачи"]]));
    var row = el("div", "set-row"), box = el("div", "set-prog");
    row.appendChild(el("span", "set-label", "Прогресс"));
    // кнопки-значки, как на сайте практик по Python: сохранить, загрузить, начать заново
    var ICON = {dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>', ul: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
      trash: '<path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5h9L17.5 7M9.5 7V4.5h5V7"/>'};
    function ib(tag, key, title) {
      var b = el(tag, "set-icon"); if (tag === "button") b.type = "button"; b.title = title; b.setAttribute("aria-label", title);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[key] + "</svg>";
      return b;
    }
    var dl = ib("button", "dl", "Сохранить прогресс в файл"); dl.addEventListener("click", exportProgress);
    var ul = ib("label", "ul", "Загрузить прогресс из файла"), inp = el("input"); inp.type = "file"; inp.accept = ".json,application/json"; inp.hidden = true; ul.appendChild(inp);
    ul.tabIndex = 0; ul.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } });
    resetBtn = ib("button", "trash", "Начать заново: сбросить прогресс и настройки"); resetBtn.classList.add("set-danger");
    box.appendChild(dl); box.appendChild(ul); box.appendChild(resetBtn); row.appendChild(box); main.appendChild(row);
    var NOTE = "Отметки о решенных заданиях и настройки хранятся только в этом браузере. Чтобы продолжить на другом компьютере, сохраните файл и загрузите его там. Зачет ставит преподаватель.", note = el("p", "set-note", NOTE);
    main.appendChild(note);
    inp.addEventListener("change", function () { if (inp.files[0]) importProgress(inp.files[0], note); inp.value = ""; });
    resetBtn.addEventListener("click", function () { setOpen(false); resetDialog(); });
    pop.appendChild(main); pop.appendChild(palPane); tools.appendChild(pop);
  }
  function setOpen(on) {
    if (on && !pop) build();
    if (!pop) return;
    pop.hidden = !on; gear.setAttribute("aria-expanded", String(on));
    if (on) { palPane.hidden = true; main.hidden = false; refresh(); }
  }
  if (gear) {
    gear.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!pop || pop.hidden); });
    document.addEventListener("click", function (e) { if (pop && !pop.hidden && e.target.isConnected && !tools.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pop && !pop.hidden) { setOpen(false); gear.focus(); } });
  }
  document.addEventListener("themechange", function () { if (pop && !palPane.hidden) showPalettes(); refresh(); });
  document.addEventListener("viewchange", refresh);

  badges(); nav();
})();

/* ---------- 5. анимации схем: «уменьшить движение» и остановка вне экрана ---------- */
(function () {
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".anim").forEach(function (box) {
    var pb = box.querySelector('button[id$="-pause"]');
    if (!pb) return;   // схема без автозапуска (anim-center: обход по кнопке)
    function running() { return pb.textContent.trim() === "Пауза"; }
    if (still && running()) { pb.click(); if (box.__anim) box.__anim.set(0.999); }
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (!on && running()) { pb.click(); box.dataset.away = "1"; }
      else if (on && box.dataset.away) { delete box.dataset.away; if (!running()) pb.click(); }
    }).observe(box);
  });
})();
