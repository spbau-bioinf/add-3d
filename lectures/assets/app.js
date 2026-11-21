/* Поведение страниц лекций add-3d: тема, прогресс, навигация лекции, слайды с пояснениями,
   мини-тесты, анимации. Основа - app.js сайта лекций по Python (lecture-python-site 8.2);
   отличия: хранилище lec3d: (отдельно от ключей add3d-*, которые сбрасывает «Начать заново» на страницах занятий),
   адрес списка лекций (course.js: home), номер модуля по РПД (course.js: num), тема по умолчанию как на сайте
   add-3d (сохраненный выбор add3d-theme, иначе темная), логотип курса, подписи без Python, засчитывание
   итогового теста exam.js по событию add3d:solved. Без сборки и зависимостей. */
(function () {
  "use strict";
  var KEY = "lec3d:";
  var root = document.documentElement;

  function load(name, fallback) {
    try { var v = localStorage.getItem(KEY + name); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(name, value) {
    try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  }


  var C = window.COURSE;
  var all = [];
  C.modules.forEach(function (m, mi) { m.lectures.forEach(function (l) { l.module = mi; all.push(l); }); });
  var open = all.filter(function (l) { return !l.soon; });

  var state = load("progress", {});
  function lec(id) { return state[id] || (state[id] = { items: {}, total: 0, done: false }); }
  function solved(id) { return Object.keys(lec(id).items).length; }
  function share(id) {
    var s = state[id];
    if (!s) return 0;
    if (s.done) return 1;
    return s.total ? solved(id) / (s.total + 1) : 0;
  }
  function persist() { save("progress", state); }

  var ICON = {
    sun: '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.2v.1"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>'
  };
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#10231a"/><path d="M8 21l8 4 8-4M8 16l8 4 8-4M8 11l8-4 8 4-8 4z" fill="none" stroke="#7FD3A6" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  var HOME = C.home || "index.html";                            // страница со списком лекций
  function modNum(mi) { return C.modules[mi].num || mi + 1; }    // номер модуля по РПД

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ring(value, done) {
    var c = 2 * Math.PI * 14, d = Math.max(0, Math.min(1, value)) * c;
    return '<span class="ring' + (done ? " done" : "") + '" aria-hidden="true"><svg viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" stroke-dasharray="' + d.toFixed(1) + " " + c.toFixed(1) + '"/></svg><span class="check">' + ICON.check + "</span></span>";
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    return n + " " + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many);
  }
  function duration(min) { var h = Math.floor(min / 60), m = min % 60; return (h ? h + " ч " : "") + (m ? m + " мин" : ""); }
  // Состояние лекции: soon - не открыта, done - отмечена пройденной, go - начата (есть решенные задания), "" - не начата.
  var STATUS = { soon: "Скоро", done: "Пройдена", go: "Начата" };
  function status(l) {
    if (l.soon) return "soon";
    var s = state[l.id];
    return s && s.done ? "done" : s && Object.keys(s.items).length ? "go" : "";
  }
  function courseShare() { return open.reduce(function (s, l) { return s + share(l.id); }, 0) / open.length; }
  function nextLecture() { return open.filter(function (l) { return !lec(l.id).done; })[0] || open[0]; }

  /* ---------- Настройки «Аа»: сайт и презентация (pylec:prefs) ---------- */
  var PREF_DEF = { theme: "", reading: false, font: "Onest", fs: 16, sb: "hide",
    vtheme: "light", notesSize: 0, lookAuto: true, look: "", bgAuto: true, bg: 0, notes: true, w: 0 };
  var SITE_KEYS = ["theme", "reading", "font", "fs", "sb"];
  var PRES_KEYS = ["vtheme", "notesSize", "lookAuto", "look", "bgAuto", "bg", "notes", "w"];
  var FONTS = [["Onest", "по умолчанию"], ["Manrope", "как на слайдах"], ["Golos Text", ""], ["Inter", ""], ["PT Sans", ""], ["Roboto", ""],
    ["Open Sans", ""], ["IBM Plex Sans", ""], ["Nunito", ""], ["Source Sans 3", ""], ["PT Serif", "с засечками"], ["Literata", "с засечками"]];
  var LOOKS = [["", "Обычный"], ["dim", "Приглуш."], ["warm", "Теплый"], ["night", "Ночной"], ["black", "Черный"]];
  var BGS = [["#101014", "Черный"], ["#26262C", "Графит"], ["#45454C", "Серый"], ["#2A2520", "Теплый темный"], ["#FFFFFF", "Белый"]];
  var WIDTHS = [0, .25, .3, .35, .4, .5];
  var prefs = (function () {
    var p = {}, saved = load("prefs", null) || {};
    Object.keys(PREF_DEF).forEach(function (k) { p[k] = saved[k] !== undefined ? saved[k] : PREF_DEF[k]; });
    // Раньше 24 записывалось даже при смене одной темы. Остальные выбранные размеры сохраняем.
    if (saved.notesSize === undefined && saved.vfs && saved.vfs !== 24) p.notesSize = saved.vfs;
    if (!p.theme) p.theme = load("theme", null) || (function () { try { return localStorage.getItem("add3d-theme"); } catch (e) { return null; } })() || "dark";
    return p;
  })();
  function savePrefs() { save("prefs", prefs); }
  function vTheme() { return prefs.vtheme === "site" ? prefs.theme : prefs.vtheme; }
  function vLook() { return prefs.lookAuto ? { light: "", sepia: "warm", dark: "night" }[vTheme()] : prefs.look; }
  function vBg() {
    if (!prefs.bgAuto) return BGS[prefs.bg][0];
    if (vLook() === "black") return "#000000";
    return { light: "#FFFFFF", sepia: "#2A2520", dark: "#101014" }[vTheme()];
  }
  var fontsLoaded = { "Onest": 1, "Golos Text": 1 };
  function loadFont(name) {
    if (fontsLoaded[name]) return; fontsLoaded[name] = 1;
    var l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + name.replace(/ /g, "+") + ":wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
  function lectureSize() { return prefs.fs + (root.classList.contains("reading") ? 2 : 0); }
  function applyPrefs() {
    root.setAttribute("data-theme", prefs.theme);
    root.classList.toggle("reading", !!prefs.reading && !!document.body && !!document.body.dataset.lecture);
    root.classList.toggle("sb-hide", prefs.sb === "hide");
    root.style.setProperty("--fs", prefs.fs + "px");
    var size = lectureSize();
    root.style.setProperty("--lecture-fs", size + "px");
    root.style.setProperty("--sv-fs", (prefs.notesSize || size) + "px");
    root.style.setProperty("--f-user", '"' + prefs.font + '"');
    loadFont(prefs.font);
    document.dispatchEvent(new CustomEvent("pylec:prefs"));
  }
  applyPrefs();   // до отрисовки, чтобы не было вспышки

  var ICON_P = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    size: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19 9 5l5 14M5.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>',
    slide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    font: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'
  };
  var panel = { el: null, open: false, tab: "site", home: null, opener: null, sample: "" };

  function initPrefs() {
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.classList.remove("theme-btn"); b.classList.add("prefs-btn");
      b.textContent = "Аа"; b.title = "Настройки: тема, текст, режим чтения, презентация (S)";
      b.setAttribute("aria-label", "Настройки"); b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function (e) { e.stopPropagation(); togglePrefs("site", b); });
    });
    document.querySelectorAll("[data-logo]").forEach(function (el) { el.insertAdjacentHTML("afterbegin", LOGO); });
    var el = panel.el = document.createElement("aside");
    el.className = "prefs"; el.setAttribute("aria-label", "Настройки"); el.tabIndex = -1;
    document.body.appendChild(el); panel.home = document.body;
    el.addEventListener("click", onPrefsClick);
    el.addEventListener("input", function (e) { if (e.target.name === "fs") { prefs.fs = +e.target.value; changed(); } });
    el.addEventListener("scroll", function () { scrolling(el); }, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.open && !document.fullscreenElement) { togglePrefs(); e.preventDefault(); }
    });
    document.addEventListener("click", function (e) {
      // на компьютере окно не мешает тексту и закрывается крестиком, Esc или кнопкой «Аа»; на телефоне - и щелчком мимо
      if (panel.open && innerWidth <= 760 && !panel.el.contains(e.target) && !e.target.closest(".prefs-btn,.sv-prefs,.sv-col,.sv-stage,.jump")) togglePrefs();
    });
    // Режим чтения: метка «Выйти» и шапка, которая прячется при прокрутке вниз
    var lec = document.querySelector("main.lecture");
    if (lec) {
      lec.insertAdjacentHTML("afterbegin", '<div class="reading-pill">Режим чтения <button type="button">Выйти</button></div>');
      lec.querySelector(".reading-pill button").addEventListener("click", function () { prefs.reading = false; changed(); });
      var last = 0;
      addEventListener("scroll", function () {
        var y = scrollY; root.classList.toggle("topbar-hidden", y > last && y > 120); last = y;
      }, { passive: true });
    }
    addEventListener("scroll", function () { scrolling(root); }, { passive: true });
    document.addEventListener("pylec:prefs", function () { if (panel.open) renderPrefs(); });
  }
  function scrolling(el) { el.classList.add("scrolling"); clearTimeout(el._sc); el._sc = setTimeout(function () { el.classList.remove("scrolling"); }, 900); }
  function changed() { savePrefs(); applyPrefs(); }
  function togglePrefs(tab, opener, host) {
    var el = panel.el, open = !panel.open || (tab && tab !== panel.tab && opener !== panel.opener);
    if (open) {
      panel.tab = tab || panel.tab; panel.opener = opener || null;
      var h = host || document.body;
      if (el.parentNode !== h) h.appendChild(el);
      renderPrefs();
    }
    panel.open = open;
    el.classList.toggle("open", open);
    root.classList.toggle("prefs-open", open && el.parentNode === document.body);
    document.querySelectorAll(".slides-frame.sv-on").forEach(function (f) { f.classList.toggle("prefs-in", open && el.parentNode === f); });
    document.querySelectorAll(".prefs-btn,.sv-prefs").forEach(function (b) { b.setAttribute("aria-expanded", String(open && b === panel.opener)); });
    if (open) el.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent("pylec:panel"));
  }
  function themeCards(key, withSite) {
    var L = [["light", "Светлая", "#F6F7FA", "#141B2D"], ["sepia", "Сепия", "#F3EBDA", "#3A2F22"], ["dark", "Темная", "#0B101B", "#E6EAF4"]];
    if (withSite) L.unshift(["site", "Как сайт", "linear-gradient(135deg,#F6F7FA 50%,#F3EBDA 50%)", "#3A2F22"]);
    return '<div class="pf-themes' + (withSite ? " four" : "") + '">' + L.map(function (x) {
      return '<button type="button" data-set="' + key + '" data-v="' + x[0] + '" aria-pressed="' + (prefs[key] === x[0]) + '" style="background:' + x[2] + ";color:" + x[3] + '"><b>Аа</b>' + x[1] + "</button>";
    }).join("") + "</div>";
  }
  function toggle(key) { return '<button type="button" class="pf-toggle" role="switch" data-tg="' + key + '" aria-checked="' + !!prefs[key] + '" aria-label="' + key + '"></button>'; }
  function stepper(key, label, style) {
    return '<div class="pf-step"><button type="button" data-step="' + key + '" data-d="-1" aria-label="Назад">‹</button><span' + (style ? ' style="' + style + '"' : "") + ">" + label +
      '</span><button type="button" data-step="' + key + '" data-d="1" aria-label="Дальше">›</button></div>';
  }
  function renderPrefs() {
    var el = panel.el, sc = el.scrollTop, isLec = !!document.body.dataset.lecture, F = FONTS.filter(function (f) { return f[0] === prefs.font; })[0] || [prefs.font, ""];
    var h = '<span class="grab"></span><div class="prefs-head"><b>Настройки</b><button type="button" class="prefs-x" title="Закрыть (Esc)" aria-label="Закрыть">×</button></div>' +
      '<div class="prefs-tabs" role="tablist"><button type="button" role="tab" data-tab="pres" aria-selected="' + (panel.tab === "pres") + '">Презентация</button>' +
      '<button type="button" role="tab" data-tab="site" aria-selected="' + (panel.tab === "site") + '">Сайт</button></div>';
    if (panel.tab === "pres") {
      el.setAttribute("data-vtheme", vTheme());
      var look = vLook(), img = panel.sample || deckSample();
      h += '<p class="prefs-lead">Действуют на блок презентации на странице и на просмотр во весь экран.</p>';
      h += '<div class="pf-sec"><h4>' + ICON_P.sun + "Оформление<i>рамка слайдов и пояснения</i></h4>" + themeCards("vtheme", true) + "</div>";
      h += '<div class="pf-sec"><h4>' + ICON_P.slide + 'Вид слайдов</h4><div class="pf-row" style="margin-top:0"><span>По оформлению<small>светлое — обычный, сепия — теплый, темное — ночной</small></span>' + toggle("lookAuto") + "</div>" +
        '<div class="pf-looks' + (prefs.lookAuto ? " auto" : "") + '">' + LOOKS.map(function (l) {
          return '<button type="button" data-look="' + l[0] + '" aria-pressed="' + (look === l[0]) + '"><i class="' + (l[0] ? "look-" + l[0] : "") + '"' + (img ? ' style="background-image:url(' + img + ')"' : "") + "></i><span>" + l[1] + "</span></button>";
        }).join("") + "</div></div>";
      h += '<div class="pf-sec"><h4>' + ICON_P.note + 'Пояснение к слайду</h4><div class="pf-row" style="margin-top:0"><span>Открывать пояснение в полном экране</span>' + toggle("notes") + "</div>" +
        '<div class="pf-row"><span>Размер текста<small>Авто — как в тексте лекции</small></span><div class="pf-seg">' +
        '<button type="button" data-size-mode="auto" aria-pressed="' + !prefs.notesSize + '">Авто</button>' +
        '<button type="button" data-size-mode="manual" aria-pressed="' + !!prefs.notesSize + '">Вручную</button></div></div>' +
        (prefs.notesSize ? '<div class="pf-row"><span>Размер пояснения</span>' + stepper("notesSize", prefs.notesSize + " px") + "</div>" : "") +
        '<div class="pf-row"><span>Ширина колонки</span>' + stepper("w", prefs.w ? Math.round(WIDTHS[prefs.w] * 100) + "%" : "Авто") + "</div></div>";
      h += '<details' + (panel.more ? " open" : "") + '><summary>Еще</summary><div class="pf-sec"><div class="pf-row" style="margin-top:0"><span>Фон по оформлению<small>белый в светлой теме, темный в остальных</small></span>' + toggle("bgAuto") + "</div>" +
        '<div class="pf-row"><span>Фон вокруг слайда</span><div class="pf-swatches">' + BGS.map(function (b, i) {
          return '<button type="button" data-bg="' + i + '" title="' + b[1] + '" aria-label="' + b[1] + '" aria-pressed="' + (vBg() === b[0]) + '" style="background:' + b[0] + '"></button>';
        }).join("") + "</div></div></div></details>";
      h += '<button type="button" class="pf-reset" data-reset="pres">Сбросить настройки презентации</button>';
    } else {
      el.removeAttribute("data-vtheme");
      h += '<p class="prefs-lead">По умолчанию сайт темный, а презентация светлая. Тему слайдов можно изменить во вкладке «Презентация».</p>';
      h += '<div class="pf-sec"><h4>' + ICON_P.sun + "Тема</h4>" + themeCards("theme", false) + "</div>";
      h += '<div class="pf-sec"><h4>' + ICON_P.size + 'Размер текста</h4><div class="pf-size"><button type="button" data-fs="-1" style="font-size:13px" aria-label="Мельче">A−</button>' +
        '<input type="range" name="fs" min="14" max="22" step="1" value="' + prefs.fs + '" aria-label="Размер текста"><output>' + prefs.fs + ' px</output><button type="button" data-fs="1" style="font-size:18px" aria-label="Крупнее">A+</button></div></div>';
      h += '<div class="pf-sec"><div class="pf-row' + (isLec ? "" : " off") + '" style="margin:0"><span><b style="display:flex;gap:8px;align-items:center;font-size:13.5px">' +
        ICON_P.book.replace("<svg", '<svg style="width:17px;height:17px;color:var(--accent)"') + "Режим чтения</b><small>" +
        (isLec ? "Без меню, узкая колонка, текст крупнее" : "Работает на странице лекции") + "</small></span>" + toggle("reading") + "</div></div>";
      h += '<div class="pf-sec"><h4>' + ICON_P.font + "Шрифт<i>" + (F[1] ? F[1] + "; " : "") + "и в пояснениях</i></h4>" + stepper("font", esc(F[0]), "font-family:'" + F[0] + "'") +
        '<div class="pf-sample" style="font-family:\'' + F[0] + '\'">Лазер сплавляет только сечение детали: <b>порошок вокруг</b> остается рыхлым.</div></div>';
      h += '<details' + (panel.more ? " open" : "") + '><summary>Еще</summary><div class="pf-sec"><div class="pf-row" style="margin-top:0"><span>Полосы прокрутки</span><div class="pf-seg">' +
        '<button type="button" data-set="sb" data-v="hide" aria-pressed="' + (prefs.sb === "hide") + '">Скрывать</button><button type="button" data-set="sb" data-v="show" aria-pressed="' + (prefs.sb === "show") + '">Показывать</button></div></div></div></details>';
      h += '<button type="button" class="pf-reset" data-reset="site">Сбросить настройки сайта</button>';
    }
    el.innerHTML = h; el.scrollTop = sc;
    FONTS.forEach(function (f, i) { if (f[0] === prefs.font) { loadFont(FONTS[(i + 1) % FONTS.length][0]); loadFont(FONTS[(i + FONTS.length - 1) % FONTS.length][0]); } });
    var det = el.querySelector("details"); if (det) det.addEventListener("toggle", function () { panel.more = det.open; });
  }
  function deckSample() {   // миниатюры вида слайда: текущий слайд первого показа на странице
    try { var f = document.querySelector(".slides-frame iframe"), d = f && f.contentWindow.document;
      var im = d && (d.querySelector(".layer:last-child .st.on img.s") || d.querySelector(".layer img.s")); return im ? im.src : ""; } catch (e) { return ""; }
  }
  function onPrefsClick(e) {
    e.stopPropagation();
    var b = e.target.closest("button"); if (!b) return;
    var d = b.dataset;
    if (b.classList.contains("prefs-x")) { togglePrefs(); return; }
    if (d.tab) { panel.tab = d.tab; panel.el.scrollTop = 0; renderPrefs(); return; }
    if (d.reset) { (d.reset === "pres" ? PRES_KEYS : SITE_KEYS).forEach(function (k) { prefs[k] = PREF_DEF[k]; });
      if (d.reset === "site") prefs.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    else if (d.set) prefs[d.set] = d.v;
    else if (d.tg) prefs[d.tg] = !prefs[d.tg];
    else if (d.fs) prefs.fs = Math.max(14, Math.min(22, prefs.fs + +d.fs));
    else if (d.sizeMode) prefs.notesSize = d.sizeMode === "auto" ? 0 : (prefs.notesSize || lectureSize());
    else if (d.look !== undefined) { prefs.look = d.look; prefs.lookAuto = false; }
    else if (d.bg) { prefs.bg = +d.bg; prefs.bgAuto = false; }
    else if (d.step === "font") {
      var i = FONTS.map(function (f) { return f[0]; }).indexOf(prefs.font);
      prefs.font = FONTS[(i + +d.d + FONTS.length) % FONTS.length][0];
    } else if (d.step === "notesSize") {
      prefs.notesSize = Math.max(13, Math.min(32, prefs.notesSize + +d.d));
    } else if (d.step === "w") { prefs.w = Math.max(0, Math.min(WIDTHS.length - 1, prefs.w + +d.d)); }
    else return;
    changed();
  }

  /* ---------- Слайды: кадр на странице и полноэкранный просмотр с колонкой пояснений ---------- */
  var DECK_CSS = "body.sv-dim .layer img.s,body.sv-dim #grid img{filter:brightness(.78) contrast(.95)}" +
    "body.sv-warm .layer img.s,body.sv-warm #grid img{filter:sepia(.35) brightness(.85)}" +
    "body.sv-night .layer img.s,body.sv-night #grid img{filter:invert(.9) hue-rotate(180deg) brightness(1.05)}" +
    "body.sv-black .layer img.s,body.sv-black #grid img{filter:invert(1) hue-rotate(180deg) saturate(1.3)}" +
    "body.sv-night .layer img.s,body.sv-black .layer img.s{box-shadow:none}.layer img.s{transition:filter .3s}body.sv-full #notes{display:none!important}" +
    "body.sv-full .deck{width:min(100vw,calc(100vh*16/9))!important}body.sv-full #stage{bottom:0!important}" +
    "body[data-vtheme=light] :is(#notes,#ov,#help div,#hud,#toast){background:#fff;color:#141b2d;border-color:#e1e5ee}" +
    "body[data-vtheme=light] :is(#ov button,#help kbd){background:#edf1f8;color:#141b2d}" +
    "body[data-vtheme=light] #ov span{color:#47506a}";
  function initSlides(box, index) {
    var src = box.getAttribute("data-src"), title = box.getAttribute("data-title") || "Слайды лекции", notesSrc = box.getAttribute("data-notes");
    var notesId = "deck-notes-" + index;
    box.innerHTML = '<div class="slides-bar"><span>' + esc(title) + '</span><button type="button" class="full">Во весь экран</button></div><div class="slides-frame"><div class="sv-stage"><div class="sv-top">' +
      (notesSrc ? '<button type="button" class="sv-btn sv-tnotes" title="Пояснение к слайду (T)">☰ Пояснение</button>' : "") +
      '<button type="button" class="sv-btn sv-prefs" aria-expanded="false" title="Настройки (S)">Аа</button><button type="button" class="sv-btn sv-exit" title="Выйти (Esc)" aria-label="Выйти">×</button></div>' +
      '<iframe loading="lazy" src="' + esc(src) + '" title="' + esc(title) + '" allow="fullscreen" allowfullscreen></iframe></div>' +
      (notesSrc ? '<div class="sv-inline-bar" hidden><button type="button" class="sv-btn inline-notes" aria-controls="' + notesId + '">Пояснение</button>' +
        '<button type="button" class="sv-btn inline-answer" hidden>Показать ответ</button></div>' : "") +
      '<div class="sv-split" title="Потяните, чтобы изменить ширину"></div><aside id="' + notesId + '" class="sv-col" aria-label="Пояснение к слайду"><div class="sv-bar"><b>ПОЯСНЕНИЕ</b>' +
      '<button type="button" class="sv-btn sv-prefs" aria-expanded="false" title="Настройки (S)">Аа</button><button type="button" class="sv-btn sv-tnotes" title="Скрыть пояснение (T)" aria-label="Скрыть пояснение">⇥</button>' +
      '<button type="button" class="sv-btn sv-exit" title="Выйти (Esc)" aria-label="Выйти">×</button></div><div class="sv-text" tabindex="0"></div></aside></div>' +
      '<p class="slides-hint">Щелчок по правой половине слайда или → — следующий шаг; по левой или ← — назад. O — обзор слайдов.</p>';
    var frame = box.querySelector(".slides-frame"), iframe = frame.querySelector("iframe"), col = frame.querySelector(".sv-col"),
      text = frame.querySelector(".sv-text"), split = frame.querySelector(".sv-split"),
      inlineBar = frame.querySelector(".sv-inline-bar"), notesButton = frame.querySelector(".inline-notes"), answerButton = frame.querySelector(".inline-answer");
    var sv = { on: false, notes: false, inline: false, slide: 0, step: 0, count: 0, data: null, doc: null, code: {} };
    var observer = new MutationObserver(syncSlide);

    function deck() {   // доступ к HTML-показу (тот же сайт); при открытии файлом браузер запрещает
      try { var w = iframe.contentWindow, d = w.document; if (!d || !d.body || !d.getElementById("deck")) return null; return w; } catch (e) { return null; }
    }
    function hookDeck() {
      var w = deck(); if (!w || w.document === sv.doc) return;
      var d = sv.doc = w.document, st = d.createElement("style"); st.textContent = DECK_CSS; d.head.appendChild(st);
      // слайды не предлагаются к сохранению: без контекстного меню и перетаскивания картинок
      d.addEventListener("contextmenu", function (e) { e.preventDefault(); }, true);
      d.addEventListener("dragstart", function (e) { e.preventDefault(); }, true);
      w.addEventListener("keydown", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key.toLowerCase();
        if (k === "f" || k === "а") { stop(e); if (sv.on) exit(); else enter(); }
        else if ((k === "t" || k === "е" || k === "n" || k === "т") && sv.data) {
          stop(e); if (sv.on) setNotes(!sv.notes); else setInline(!sv.inline);
        }
        else if (k === "s" || k === "ы") { stop(e); togglePrefs("pres", sv.on ? frame.querySelector(sv.notes ? ".sv-bar .sv-prefs" : ".sv-top .sv-prefs") : box.querySelector(".full"), sv.on ? frame : null); }
        else if (sv.on && k === "escape" && panel.open) { stop(e); togglePrefs(); }
        else if (sv.on && k === "escape" && !d.body.matches(".ov,.help,.rev")) { stop(e); exit(); }
      }, true);
      if (notesSrc) observer.observe(d.getElementById("deck"), {childList: true, subtree: true, attributes: true, attributeFilter: ["class"]});
      look(); syncSlide();
    }
    function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
    function look() {
      var w = deck(), l = vLook();
      box.setAttribute("data-vtheme", vTheme());
      col.setAttribute("data-vtheme", vTheme());
      // если показ недоступен скрипту (страница открыта файлом или в песочнице), приглушение и теплый вид - фильтром на кадр
      ["dim", "warm"].forEach(function (c) { iframe.classList.toggle("sv-" + c, !w && (c === l || (c === "dim" && (l === "night" || l === "black")))); });
      if (!w) return;
      var b = w.document.body;
      b.dataset.vtheme = vTheme();
      b.style.setProperty("--sv-fs", root.style.getPropertyValue("--sv-fs"));
      ["dim", "warm", "night", "black"].forEach(function (c) { b.classList.toggle("sv-" + c, c === l); });
      b.classList.toggle("sv-full", sv.on);
      b.style.setProperty("--bg", vBg()); w.document.documentElement.style.background = vBg();
    }
    iframe.addEventListener("load", function () { observer.disconnect(); sv.doc = null; hookDeck(); });
    document.addEventListener("pylec:prefs", function () { look(); if (sv.on) layout(); renderCard(true); });

    function loadNotes(cb) {
      if (!notesSrc) return cb(null);
      var key = src;
      if (window.SLIDE_NOTES && window.SLIDE_NOTES[key]) return cb(window.SLIDE_NOTES[key]);
      var s = document.createElement("script"); s.src = notesSrc;
      s.onload = function () { cb((window.SLIDE_NOTES || {})[key] || null); }; s.onerror = function () { cb(null); };
      document.head.appendChild(s);
    }
    function enter() {
      sv.on = true; frame.classList.add("sv-on");
      var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(frame)).catch(function () {});
      setNotes(!!sv.data && prefs.notes); hookDeck();
      iframe.focus();
      layout();
    }
    function exit() {
      if (panel.open && panel.el.parentNode === frame) togglePrefs();
      if (panel.el.parentNode === frame) document.body.appendChild(panel.el);
      sv.on = false; frame.classList.remove("sv-on", "sv-notes", "prefs-in");
      if (document.fullscreenElement === frame && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      look(); renderCard(); box.querySelector(".full").focus({preventScroll: true});
    }
    document.addEventListener("fullscreenchange", function () { if (sv.on && !document.fullscreenElement) exit(); });
    document.addEventListener("keydown", function (e) {
      if (!sv.on || e.ctrlKey || e.metaKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
      var k = e.key.toLowerCase();
      if (k === "escape") { if (panel.open) togglePrefs(); else exit(); e.preventDefault(); }
      else if ((k === "t" || k === "е") && sv.data) { setNotes(!sv.notes); e.preventDefault(); }
      else if (k === "s" || k === "ы") { togglePrefs("pres", frame.querySelector(sv.notes ? ".sv-bar .sv-prefs" : ".sv-top .sv-prefs"), frame); e.preventDefault(); }
    });
    box.querySelector(".full").addEventListener("click", enter);
    if (notesSrc) {
      notesButton.addEventListener("click", function () { setInline(!sv.inline); });
      answerButton.addEventListener("click", function () {
        var root = sv.doc && sv.doc.getElementById("deck");
        if (!root || typeof root.selectAnswer !== "function") return;
        var show = !answered();
        root.selectAnswer(sv.slide, show);
        if (show && !sv.inline) setInline(true);
      });
    }
    frame.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("sv-exit")) exit();
      else if (b.classList.contains("sv-tnotes")) setNotes(!sv.notes);
      else if (b.classList.contains("sv-prefs")) { e.stopPropagation(); sample(); togglePrefs("pres", b, frame); }
    });
    function sample() {   // миниатюры вида слайда в настройках - текущий слайд
      var w = deck(); if (!w) return;
      var im = w.document.querySelector(".layer:last-child .st.on img.s") || w.document.querySelector(".layer img.s");
      panel.sample = im ? im.src : "";
    }
    document.addEventListener("pylec:panel", function () { if (sv.on) setTimeout(layout, 320); });
    function setNotes(on) {
      sv.notes = on && !!sv.data; frame.classList.toggle("sv-notes", sv.notes);
      if (panel.open && panel.opener && frame.contains(panel.opener)) panel.opener = frame.querySelector(sv.notes ? ".sv-bar .sv-prefs" : ".sv-top .sv-prefs");
      layout(); renderCard();
    }
    function setInline(open) {
      sv.inline = open;
      frame.classList.toggle("sv-inline-notes", open && !!sv.data);
      if (notesButton) {
        notesButton.setAttribute("aria-expanded", String(open));
        notesButton.textContent = open ? "Скрыть пояснение" : "Показать пояснение";
      }
      renderCard();
    }
    function autoWidth(W, H) {
      var slideW = Math.min(W, H * 16 / 9), free = W - slideW;
      return Math.round(Math.min(W * .45, Math.max(free, 360, W * .22)));
    }
    function layout() {
      if (!sv.on) return;
      var W = frame.clientWidth - (frame.classList.contains("prefs-in") ? 380 : 0), H = frame.clientHeight, narrow = innerWidth <= 760;
      var w = prefs.w ? Math.round(WIDTHS[prefs.w] * W) : autoWidth(W, H);
      if (sv.drag) w = sv.drag;
      w = Math.max(300, Math.min(w, W - 320));
      frame.style.setProperty("--sv-w", w + "px");
      frame.style.setProperty("--sv-bg", vBg());
      // текст начинается вровень с верхним краем слайда
      var stW = W - (sv.notes && !narrow ? w + 10 : 0), slideH = Math.min(H, stW * 9 / 16);
      text.style.setProperty("--sv-top", narrow ? "16px" : Math.max(16, Math.round((H - slideH) / 2) - 48) + "px");
      look();
    }
    addEventListener("resize", layout);
    // разделитель
    split.addEventListener("pointerdown", function (e) { split.setPointerCapture(e.pointerId); sv.dragging = true; iframe.style.pointerEvents = "none"; });
    split.addEventListener("pointermove", function (e) {
      if (!sv.dragging) return; var r = frame.getBoundingClientRect(), pr = frame.classList.contains("prefs-in") ? 380 : 0;
      sv.drag = Math.round(r.right - pr - e.clientX - 5); layout();
    });
    split.addEventListener("pointerup", function () {
      if (!sv.dragging) return; sv.dragging = false; iframe.style.pointerEvents = "";
      var W = frame.clientWidth - (frame.classList.contains("prefs-in") ? 380 : 0), f = sv.drag / W;
      var best = 1; WIDTHS.forEach(function (x, i) { if (i && Math.abs(x - f) < Math.abs(WIDTHS[best] - f)) best = i; });
      prefs.w = best; sv.drag = 0; changed();
    });

    function syncSlide() {
      var d = sv.doc, layer = d && d.getElementById("deck").lastElementChild;
      while (layer && !layer.classList.contains("layer")) layer = layer.previousElementSibling;
      if (!layer) return;
      var n = parseInt(d.location.hash.slice(1), 10) || 1;
      var states = layer.querySelectorAll(".st"), k = 0;
      for (var j = 0; j < states.length; j++) if (states[j].classList.contains("on")) k = j;
      if (n === sv.slide && k === sv.step && states.length === sv.count) return;
      var same = n === sv.slide; sv.slide = n; sv.step = k; sv.count = states.length; renderCard(same);
    }
    function answered() { return sv.count > 1 && sv.step === sv.count - 1; }
    function renderCard(keep) {
      if (!sv.data) return;
      var c = sv.data.slides[String(sv.slide)];
      if (answerButton) {
        answerButton.hidden = !(c && c.a && sv.count === 2);
        answerButton.setAttribute("aria-pressed", String(answered()));
        answerButton.textContent = answered() ? "Скрыть ответ" : "Показать ответ";
      }
      if (!(sv.on ? sv.notes : sv.inline)) return;
      if (!c) {
        text.innerHTML = '<p class="sv-empty">' + (location.protocol === "file:" ? "Для пояснений откройте страницу через локальный сервер или GitHub Pages." : "Пояснение появится после загрузки слайда.") + "</p>";
        return;
      }
      var y = keep ? text.scrollTop : 0, h = "<h3>СЛАЙД " + sv.slide + "</h3><h2>" + c.t + "</h2>";
      if (c.m) h += '<div class="sv-k">Главная мысль</div><div class="sv-main">' + c.m + "</div>";
      if (!(c.a && answered())) h += '<div class="sv-k">Пояснение</div>' + c.e.map(function (p) { return "<p>" + p + "</p>"; }).join("");
      if (c.a) {
        if (sv.count === 1) h += '<details><summary>Показать ответ</summary><p>' + c.a + "</p></details>";
        else if (answered()) h += '<div class="sv-k">Ответ</div><div class="sv-main">' + c.a + "</div>";
      }
      if (c.code) h += codeBox(c);
      if (c.c) h += '<div class="sv-k">Вывод</div><div class="sv-concl">' + c.c + "</div>";
      if (c.s) h += '<div class="sv-k">Источник</div><p class="sv-src">' + c.s + "</p>";
      if (c.sec) h += '<p><a href="#' + c.sec[0] + '" class="sv-sec">Подробнее в разделе «' + esc(c.sec[1]) + "» →</a></p>";
      text.innerHTML = h; text.scrollTop = y;
    }
    if (notesSrc) loadNotes(function (data) {
      sv.data = data; inlineBar.hidden = !data;
      frame.querySelectorAll(".sv-tnotes").forEach(function (b) { b.hidden = !data; });
      setInline(sv.inline);
      if (sv.on) setNotes(!!data && prefs.notes);
    });
    hookDeck();
    text.addEventListener("scroll", function () { scrolling(text); }, { passive: true });

    /* Код на слайде: запуск, шаги (заготовленные или автоматическая трассировка) */
    function cs() {
      var c = sv.data.slides[String(sv.slide)], k = sv.slide;
      if (!sv.code[k]) sv.code[k] = { tab: 0, src: c.code.map(function (x) { return x.src; }), stdin: c.code.map(function (x) { return x.stdin || ""; }), mode: "edit", out: null, tr: null, step: 0, busy: "" };
      return sv.code[k];
    }
    function codeBox(c) {
      var s = cs(), ex = c.code[s.tab], src = s.src[s.tab], h = '<div class="sv-k">Код со слайда</div><div class="sv-code">';
      if (c.code.length > 1) h += '<div class="sv-tabs" role="tablist">' + c.code.map(function (x, i) { return '<button type="button" role="tab" data-ctab="' + i + '" aria-selected="' + (i === s.tab) + '">' + esc(x.name) + "</button>"; }).join("") + "</div>";
      if (s.mode === "edit") h += '<textarea spellcheck="false" autocapitalize="off" aria-label="Код со слайда" rows="' + Math.max(2, src.split("\n").length) + '">' + esc(src) + "</textarea>";
      else {
        var cur = s.tr.steps[s.step];
        h += '<pre class="sv-lines">' + src.split("\n").map(function (l, i) { return '<div class="' + (i + 1 === cur.line ? "cur" : "") + '"><i>' + (i + 1) + "</i>" + esc(l) + "</div>"; }).join("") + "</pre>";
      }
      if (ex.stdin || s.stdin[s.tab]) h += '<label class="sv-stdin">Ввод<textarea rows="' + Math.max(1, s.stdin[s.tab].split("\n").length) + '" spellcheck="false">' + esc(s.stdin[s.tab]) + "</textarea></label>";
      h += '<div class="sv-cbar">';
      if (s.mode === "edit") h += '<button type="button" class="pri" data-act="run">▶ Запустить</button><button type="button" data-act="steps">По шагам</button>' + (src !== ex.src ? '<button type="button" data-act="reset">Вернуть</button>' : "");
      else h += '<button type="button" data-act="prev"' + (s.step ? "" : " disabled") + '>← Шаг</button><button type="button" class="pri" data-act="next"' + (s.step < s.tr.steps.length - 1 ? "" : " disabled") + '>Шаг →</button><button type="button" data-act="edit">✎ К коду</button>';
      h += '<span class="st">' + esc(s.busy) + "</span></div>";
      if (s.mode === "steps") {
        var t = s.tr, st = t.steps[s.step], names = Object.keys(st.vars);
        h += '<div class="sv-stepbox">' + (t.auto ? '<div class="auto">Код изменен: шаги построены автоматически</div>' : "") +
          '<div class="sn">ШАГ ' + (s.step + 1) + " ИЗ " + t.steps.length + " · СТРОКА " + st.line + "</div>" + (st.cm ? '<div class="cm">' + st.cm + "</div>" : "");
        if (names.length) h += '<table class="sv-vars">' + names.map(function (k) { var v = st.vars[k]; return '<tr class="' + (v.ch ? "ch" : "") + '"><td>' + esc(k) + "</td><td>" + esc(v.r) + (v.same ? ' <span class="same">тот же объект, что ' + esc(v.same) + "</span>" : "") + "</td></tr>"; }).join("") + "</table>";
        h += "</div>" + outHtml(st.out, st.err);
      } else if (s.out) h += outHtml(s.out.text, s.out.err);
      return h + "</div>";
    }
    function outHtml(out, err) {
      return '<div class="sv-out" aria-live="polite"><span class="lbl">Результат</span>' + esc(out || "") + (err ? '<span class="err">' + esc(err) + "</span>" : "") +
        (!out && !err ? '<span class="lbl">(ничего не напечатано)</span>' : "") + "</div>";
    }
    text.addEventListener("input", function (e) {
      var s = cs();
      if (e.target.closest(".sv-stdin")) s.stdin[s.tab] = e.target.value;
      else if (e.target.tagName === "TEXTAREA") { s.src[s.tab] = e.target.value; s.out = null; }
    });
    text.addEventListener("keydown", function (e) {
      if (e.target.tagName !== "TEXTAREA") return;
      e.stopPropagation();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); act("run"); }
      if (e.key === "Tab" && !e.shiftKey && !e.target.closest(".sv-stdin")) { e.preventDefault(); var t = e.target, a = t.selectionStart; t.setRangeText("    ", a, t.selectionEnd, "end"); cs().src[cs().tab] = t.value; }
    });
    text.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.ctab) { var s = cs(); s.tab = +b.dataset.ctab; s.mode = "edit"; s.out = null; renderCard(true); }
      else if (b.dataset.act) act(b.dataset.act);
    });
    text.addEventListener("click", function (e) {
      var a = e.target.closest("a.sv-sec"); if (!a) return;
      e.preventDefault(); var id = a.getAttribute("href").slice(1); if (sv.on) exit();
      setTimeout(function () { var t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: "smooth" }); }, 120);
    });
    function act(a) {
      var c = sv.data.slides[String(sv.slide)], s = cs(), ex = c.code[s.tab], src = s.src[s.tab];
      if (a === "reset") { s.src[s.tab] = ex.src; s.stdin[s.tab] = ex.stdin || ""; s.out = null; return renderCard(true); }
      if (a === "edit") { s.mode = "edit"; return renderCard(true); }
      if (a === "prev" || a === "next") { s.step += a === "next" ? 1 : -1; return renderCard(true); }
      if (location.protocol === "file:") { s.out = { text: "", err: "Python не запускается, когда страница открыта как файл. Откройте сайт через «Запустить сайт.bat» или по адресу на GitHub Pages." }; return renderCard(true); }
      if (s.busy) return;
      s.busy = py.ready ? "Выполняю…" : "Загружаю Python (около 14 МБ, один раз)…"; renderCard(true);
      whenReady(function (err) {
        if (err) { s.busy = ""; s.out = { text: "", err: "Не удалось загрузить Python: " + err }; return renderCard(true); }
        var id = ++py.seq, buf = "", ebuf = "", code = a === "steps" ? TRACE_PY.replace("__SRC__", JSON.stringify(src)) : src;
        var job = py.jobs[id] = {
          chunk: function (kind, t) { if (kind === "err") ebuf += t; else buf += t; },
          end: function (ok, errText) {
            s.busy = "";
            if (a === "run") s.out = { text: buf, err: ok ? ebuf.trim() : errText };
            else {
              var at = buf.indexOf("\u0000TRACE");
              if (at < 0) { s.out = { text: buf, err: errText || "Не удалось построить шаги" }; s.mode = "edit"; }
              else { s.tr = steps(JSON.parse(buf.slice(at + 6)), ex, src); s.step = 0; s.mode = "steps"; }
            }
            renderCard(true);
          }
        };
        job.timer = setTimeout(function () { delete py.jobs[id]; restartPython(); job.end(false, "Остановлено: программа работает дольше 10 секунд. Возможно, это бесконечный цикл."); }, 10000);
        py.worker.postMessage({ id: id, code: code, stdin: s.stdin[s.tab] ? s.stdin[s.tab] + "\n" : "" });
      });
    }
    function steps(r, ex, src) {
      var auto = src !== ex.src, out = [], prev = {}, ev = r.ev;
      ev.forEach(function (e, i) {
        var after = i + 1 < ev.length ? { vars: ev[i + 1][1], out: ev[i + 1][2] } : { vars: r.fin, out: r.out };
        var vars = {}, ids = {};
        Object.keys(after.vars).forEach(function (k) {
          var v = after.vars[k]; vars[k] = { r: v[0], ch: !prev[k] || prev[k][0] !== v[0] || prev[k][1] !== v[1] };
          Object.keys(ids).forEach(function (o) { if (ids[o] === v[1] && v[2]) vars[k].same = o; }); ids[k] = v[1];
        });
        var cm = null; if (!auto) ex.steps.forEach(function (x) { if (x[0] === e[0] && !cm) cm = x[1]; });
        out.push({ line: e[0], vars: vars, out: after.out, err: i === ev.length - 1 ? r.err : null, cm: cm }); prev = after.vars;
      });
      if (!out.length) out.push({ line: 1, vars: {}, out: r.out, err: r.err, cm: null });
      return { steps: out, auto: auto };
    }
  }
  // Трассировка в Pyodide: строка, переменные после нее и вывод к этому моменту
  var TRACE_PY = [
    "import sys, io, json",
    "def _pylec_trace(src):",
    "    buf, ev, g = io.StringIO(), [], {'__name__': '__main__'}",
    "    def snap(d):",
    "        r = {}",
    "        for k, v in list(d.items()):",
    "            if k.startswith('__') or callable(v) or type(v).__name__ == 'module': continue",
    "            r[k] = [repr(v)[:200], id(v), not isinstance(v, (int, float, bool, str, type(None)))]",
    "        return r",
    "    def tr(frame, e, a):",
    "        if frame.f_code.co_filename != '<code>': return None",
    "        if e == 'line' and len(ev) < 300: ev.append([frame.f_lineno, snap(frame.f_locals), buf.getvalue()])",
    "        return tr",
    "    err, old = None, sys.stdout",
    "    sys.stdout = buf",
    "    try:",
    "        code = compile(src, '<code>', 'exec')",
    "        sys.settrace(tr)",
    "        exec(code, g)",
    "    except SyntaxError as e:",
    "        err = 'SyntaxError: %s (строка %s)' % (e.msg, e.lineno)",
    "    except Exception as e:",
    "        tb, ln = e.__traceback__, None",
    "        while tb:",
    "            if tb.tb_frame.f_code.co_filename == '<code>': ln = tb.tb_lineno",
    "            tb = tb.tb_next",
    "        err = '%s: %s' % (type(e).__name__, e) + (' (строка %s)' % ln if ln else '')",
    "    finally:",
    "        sys.settrace(None)",
    "        sys.stdout = old",
    "    print('\\x00TRACE' + json.dumps({'ev': ev, 'fin': snap(g), 'out': buf.getvalue(), 'err': err}))",
    "_pylec_trace(__SRC__)"].join("\n");

  /* ---------- Обзор курса ---------- */
  function initHome() {
    var total = all.reduce(function (s, l) { return s + l.minutes; }, 0);
    document.getElementById("stats").textContent =
      plural(C.modules.length, "модуль", "модуля", "модулей") + " · " + plural(all.length, "лекция", "лекции", "лекций") +
      " · " + duration(total) + " · открыто " + open.length + " из " + all.length;

    var html = "", i = 0;
    C.modules.forEach(function (m, mi) {
      html += '<section class="module rise" style="--i:' + (i++) + '"><div class="module-head"><span class="module-num">' + (mi + 1) +
        "</span><h3>" + esc(m.title) + "</h3><p>" + esc(m.intro) + '</p></div><ol class="lessons">';
      m.lectures.forEach(function (l) {
        var s = state[l.id], done = s && s.done, n = s ? solved(l.id) : 0, st = status(l);
        var tag = '<span class="lesson-side">' + (st ? '<span class="tag tag-' + st + '">' + STATUS[st] + "</span>" : "") +
          '<span class="lesson-meta">' + (s && s.total && !l.soon && (n || done) ? "решено " + n + "/" + s.total + " · " : "") + l.minutes + " мин</span></span>";
        var inner = ring(share(l.id), done) + '<span><span class="lesson-title">' + l.id + ". " + esc(l.title) +
          '</span><span class="lesson-sum">' + esc(l.summary) + "</span></span>" + tag;
        html += "<li>" + (l.soon ? '<div class="lesson soon">' + inner + "</div>" :
          '<a class="lesson" href="' + l.file + '">' + inner + "</a>") + "</li>";
      });
      html += "</ol></section>";
    });
    document.getElementById("modules").innerHTML = html;

    var pct = Math.round(courseShare() * 100);
    var bar = document.querySelector(".course-progress i");
    requestAnimationFrame(function () { bar.style.width = pct + "%"; });
    var nDone = open.filter(function (l) { return status(l) === "done"; }).length;
    document.querySelector(".course-progress span").textContent = pct ?
      pct + "% · пройдено лекций: " + nDone + " из " + open.length + " открытых" : "Прогресс сохраняется в этом браузере";
    var start = document.getElementById("start-btn"), nl = nextLecture();
    start.href = nl.file;
    if (pct) start.firstChild.textContent = pct === 100 ? "Повторить курс " : "Продолжить: лекция " + nl.id + " ";

    progressTools();
    footer(document.querySelector(".overview-inner"));
    coverArt(document.querySelector(".cover-art"));
  }

  // Прогресс в файл и из файла (как на сайте практик): все ключи pylec:* одним JSON; сброс с окном подтверждения
  var FORMAT = "pylec-progress";
  function ownKeys() {
    var ks = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(KEY) === 0) ks.push(k); } } catch (e) { /* хранилище недоступно */ }
    return ks;
  }
  function stamp(d) {
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "_" + p(d.getHours()) + "-" + p(d.getMinutes());
  }
  function exportProgress() {
    var data = {};
    ownKeys().forEach(function (k) { data[k] = localStorage.getItem(k); });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: FORMAT, saved: new Date().toISOString(), data: data }, null, 1)], { type: "application/json" }));
    a.download = "progress_python_lectures_" + stamp(new Date()) + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function replaceAll(data) {
    try {
      ownKeys().forEach(function (k) { localStorage.removeItem(k); });
      Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
    } catch (e) { /* хранилище недоступно */ }
    location.reload();
  }
  // Окно подтверждения: крестик, Esc и щелчок мимо окна закрывают; HTML текста; кнопки [{text, icon, cls, act}] в одну строку
  // (act вернул false - окно не закрывается)
  var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  function ask(title, html, buttons) {
    var d = document.createElement("dialog");
    d.className = "pg-dlg";
    d.innerHTML = '<div class="pg-head"><h3>' + esc(title) + '</h3><button class="icon-btn pg-x" type="button" aria-label="Закрыть">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      html + '<div class="pg-acts"></div>';
    d.querySelector(".pg-x").addEventListener("click", function () { d.close(); });
    d.addEventListener("click", function (e) {         // щелчок мимо окна (по затемнению) закрывает его
      var r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
    });
    buttons.forEach(function (b) {
      var el = document.createElement("button");
      el.type = "button"; el.className = "btn " + (b.cls || "btn-ghost"); el.innerHTML = (b.icon || "") + "<span>" + esc(b.text) + "</span>";
      el.addEventListener("click", function () { if (!b.act || b.act(el) !== false) d.close(); });
      d.querySelector(".pg-acts").appendChild(el);
    });
    d.addEventListener("close", function () { d.remove(); });
    document.body.appendChild(d); d.showModal();
  }
  function progressTools() {
    var msg = document.querySelector(".pg-msg"), input = document.createElement("input");
    function note(t) { msg.textContent = t; }
    input.type = "file"; input.accept = ".json,application/json"; input.hidden = true;
    document.body.appendChild(input);
    document.getElementById("pg-save").addEventListener("click", function () { exportProgress(); note("Файл прогресса скачан."); });
    document.getElementById("pg-load").addEventListener("click", function () { input.value = ""; input.click(); });
    input.addEventListener("change", function () {
      var f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var j = null;
        try { j = JSON.parse(r.result); } catch (e) { /* не JSON */ }
        var ok = j && j.format === FORMAT && j.data && typeof j.data === "object" && Object.keys(j.data).every(function (k) {
          return k.indexOf(KEY) === 0 && typeof j.data[k] === "string";
        });
        if (!ok) { note("Это не файл прогресса лекций. Выберите файл progress_python_lectures_….json, скачанный на этом сайте."); return; }
        var when = new Date(j.saved);
        ask("Загрузить прогресс из файла?",
          "<p>Файл сохранен " + (isNaN(when) ? "в неизвестную дату" : esc(when.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" }))) +
          ". Прогресс в этом браузере заменится прогрессом из файла.</p>",
          [{ text: "Загрузить", cls: "btn-primary", act: function () { replaceAll(j.data); } }]);
      };
      r.readAsText(f);
    });
    document.getElementById("reset").addEventListener("click", function () {
      var saved = false;
      ask("Сбросить прогресс?",
        "<p>В этом браузере будут удалены:</p><ul><li>отметки «Пройдена», мини-тесты и разборы задач;</li>" +
        "<li>результаты итоговых тестов;</li><li>код, измененный в редакторах;</li><li>тема оформления.</li></ul>" +
        '<p class="pg-warn"><b>Отменить сброс нельзя.</b> Если не сохранить файл, он скачается сам перед сбросом. Вернуть прогресс можно кнопкой «Загрузить прогресс».</p>',
        [{ text: "Сохранить в файл", icon: DL, act: function (el) { exportProgress(); saved = true; el.lastChild.textContent = "Файл сохранен"; el.disabled = true; return false; } },
         { text: "Сбросить все", cls: "btn-danger", act: function (el) {
           el.disabled = true; if (!saved) exportProgress();
           setTimeout(function () { replaceAll({}); }, 700);
           return false;
         } }]);
    });
  }

  // Подвал на всех страницах: строка copyright из course.js и условия лицензии
  function footer(where, after) {
    if (!C.copyright || !where) return;
    var f = document.createElement("footer");
    f.className = "site-foot";
    f.innerHTML = "<p>" + esc(C.copyright.replace(/\.?$/, ".")) + "</p><p>Материалы доступны по лицензии " +
      '<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.ru" target="_blank" rel="noopener license">CC BY-NC 4.0</a>: ' +
      "их можно использовать и изменять в некоммерческих целях со ссылкой на автора и этот сайт. Цитаты и примеры из книг принадлежат их авторам.</p>";
    if (after) where.after(f); else where.appendChild(f);
  }

  // Обложка: медленные «контурные» линии — две переплетенные волны, как на логотипе.
  function coverArt(cv) {
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d"), w, h, t = 0, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function size() { var r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var k = 0; k < 26; k++) {
        var p = k / 25, warm = k % 6 === 0;
        ctx.beginPath();
        for (var x = -10; x <= w + 10; x += 8) {
          var y = h * (0.08 + p * 0.62) + Math.sin(x / (120 + k * 3) + t + k * 0.35) * (18 + 26 * p) + Math.sin(x / 47 - t * 1.6 + k) * 4;
          x < -5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = warm ? "rgba(243,205,94," + (0.5 - p * 0.25) + ")" : "rgba(134,166,255," + (0.08 + (1 - p) * 0.16) + ")";
        ctx.lineWidth = warm ? 1.4 : 1;
        ctx.stroke();
      }
      t += 0.004;
      if (!still) requestAnimationFrame(frame);
    }
    size(); addEventListener("resize", size); frame();
  }

  /* ---------- Лекция ---------- */
  function initLecture(id) {
    var me = all.filter(function (l) { return l.id === id; })[0];
    var mod = C.modules[me.module];
    var s = lec(id);
    var main = document.querySelector(".lecture");
    var sections = [].slice.call(main.querySelectorAll("section[id]"));

    // Номера разделов и шапка
    sections.forEach(function (sec, i) { var h = sec.querySelector("h2"); h.insertAdjacentHTML("afterbegin", '<span class="sec">' + (i + 1 < 10 ? "0" : "") + (i + 1) + "</span>"); });
    document.querySelector("[data-slot=eyebrow]").textContent = "Модуль " + modNum(me.module) + " · " + mod.title;
    document.querySelector(".topbar .crumbs").innerHTML = '<a href="' + HOME + '">' + esc(C.short) + "</a><span>/</span><b>" + me.id + ". " + esc(me.title) + "</b>";
    document.title = me.title + " · " + C.short;

    // Боковая навигация
    var side = '<a class="side-course" href="' + HOME + '">' + ring(courseShare(), false) + "<span><b>" + esc(C.short) + '</b><span class="course-pct"></span></span></a>';
    C.modules.forEach(function (m, mi) {
      side += '<div class="side-mod"><p>Модуль ' + modNum(mi) + '</p><ul class="side-list">';
      m.lectures.forEach(function (l) {
        var st = status(l), cls = (l.id === id ? "current" : "") + (st ? " is-" + st : "");
        var num = '<span class="num"' + (st && st !== "soon" ? ' title="' + STATUS[st] + '"' : "") + ">" + l.id + "</span>";
        side += l.soon ? '<li><span class="off">' + num + "<span>" + esc(l.title) + "</span></span></li>" :
          '<li><a class="' + cls + '" href="' + l.file + '"' + (l.id === id ? ' aria-current="page"' : "") + ">" + num + "<span>" + esc(l.title) + "</span></a>" +
          (l.id === id ? '<ol class="side-secs">' + sections.map(function (sec) {
            return '<li><a href="#' + sec.id + '">' + esc(sec.querySelector("h2").textContent.replace(/^\d+/, "")) + "</a></li>";
          }).join("") + "</ol>" : "") + "</li>";
      });
      side += "</ul></div>";
    });
    var sideEl = document.getElementById("sidebar");
    sideEl.innerHTML = side;
    function refreshCourse() {
      var v = courseShare();
      sideEl.querySelector(".side-course").firstChild.outerHTML = ring(v, v === 1);
      sideEl.querySelector(".course-pct").textContent = "Курс пройден на " + Math.round(v * 100) + "%";
    }

    // Мобильное меню
    var scrim = document.querySelector(".scrim");
    document.querySelector(".menu-btn").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
    function closeNav() { document.body.classList.remove("nav-open"); }
    scrim.addEventListener("click", closeNav);
    addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    sideEl.addEventListener("click", function (e) { if (e.target.closest(".side-secs a")) closeNav(); });

    main.querySelectorAll(".slides[data-src]").forEach(initSlides);
    main.querySelectorAll(".more").forEach(function (m) { m.insertAdjacentHTML("afterbegin", '<span class="more-tag">Подробнее</span>'); });

    // Подсветка статического кода
    main.querySelectorAll("pre.code").forEach(function (p) {
      p.innerHTML = highlight(p.textContent.replace(/^\n|\n\s*$/g, ""));
      if (p.dataset.lines) lineFx(p);
    });

    // Интерактив
    var items = [];
    main.querySelectorAll(".quiz").forEach(function (q, i) { items.push(initQuiz(q, i, onSolve)); });
    main.querySelectorAll(".runner").forEach(function (r, i) { var it = initRunner(r, i, onSolve); if (it) items.push(it); });
    main.querySelectorAll(".ask").forEach(initAsk);
    main.querySelectorAll(".walk").forEach(initWalk);
    main.querySelectorAll(".anim").forEach(function (a) { var it = initAnim(a, onSolve); if (it) items.push(it); });
    s.best = s.best || {};
    main.querySelectorAll(".final-test").forEach(function (t) {
      items.push(initFinalTest(t, s.best, function (key, score) {
        s.best[key] = Math.max(s.best[key] || 0, score); persist(); refresh();
      }, onSolve));
    });
    // Итоговый тест с таймером и попытками (add3d.js): засчитывается по событию add3d:solved
    main.querySelectorAll(".exam[data-id]").forEach(function (x) { items.push(x.dataset.id); });
    document.addEventListener("add3d:solved", function (e) { onSolve(e.detail); });
    s.total = items.length;
    Object.keys(s.items).forEach(function (k) { if (items.indexOf(k) < 0) delete s.items[k]; });
    persist();

    var meta = document.querySelector("[data-slot=meta]");
    var nQ = main.querySelectorAll(".quiz").length, nT = main.querySelectorAll(".runner[data-expect]").length, nR = main.querySelectorAll(".runner").length - nT;
    var nF = main.querySelectorAll(".final-test .ft-q").length, nW = main.querySelectorAll(".walk").length;
    meta.innerHTML = "<span>" + ICON.clock + me.minutes + " мин</span>" +
      (nR ? "<span>" + ICON.code + plural(nR, "пример", "примера", "примеров") + "</span>" : "") +
      (nQ ? "<span>" + ICON.quiz + plural(nQ, "вопрос", "вопроса", "вопросов") + " в мини-тестах</span>" : "") +
      (nT ? "<span>" + ICON.flag + plural(nT, "задача", "задачи", "задач") + "</span>" : "") +
      (nW ? "<span>" + ICON.flag + "разбор задач: " + nW + "</span>" : "") +
      (nF ? "<span>" + ICON.flag + "итоговый тест: " + plural(nF, "вопрос", "вопроса", "вопросов") + "</span>" : "") +
      (window.EXAM ? "<span>" + ICON.flag + "итоговый тест: " + plural(window.EXAM.questions.length, "вопрос", "вопроса", "вопросов") + ", " + window.EXAM.minutes + " мин</span>" : "");

    // Оглавление со слежением за прокруткой
    var toc = document.querySelector("[data-slot=toc]");
    toc.innerHTML = "<p>На этой странице</p><ol>" + sections.map(function (sec) {
      return '<li><a href="#' + sec.id + '">' + esc(sec.querySelector("h2").textContent.replace(/^\d+/, "")) + "</a></li>";
    }).join("") + '</ol><div class="toc-stats"></div>';
    var links = toc.querySelectorAll("a");
    var sideSecs = sideEl.querySelectorAll(".side-secs a");
    var bar = document.querySelector(".read-progress i");
    function onScroll() { var d = document.documentElement, max = d.scrollHeight - d.clientHeight; bar.style.width = (max > 0 ? d.scrollTop / max * 100 : 0) + "%";
      var line = innerHeight * 0.3, act = -1;
      sections.forEach(function (sec, i) { if (sec.getBoundingClientRect().top < line) act = i; });
      if (max - d.scrollTop < 4) act = sections.length - 1;
      links.forEach(function (a, i) { a.classList.toggle("active", i === act); });
      sideSecs.forEach(function (a, i) { a.classList.toggle("active", i === act); });
    }
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // Конец лекции: отметка и соседние лекции
    var idx = open.indexOf(me), prev = open[idx - 1], next = open[idx + 1] || all[all.indexOf(me) + 1];
    var fin = document.querySelector("[data-slot=finish]");
    footer(document.querySelector(".layout"), true);  // после макета: липкая навигация не заходит на подвал
    fin.innerHTML = '<div class="finish-card">' + ring(share(id), s.done) + '<div class="txt"><b></b><span></span></div><button class="btn btn-primary done-btn" type="button"></button></div>' +
      (me.practice ? '<a class="practice-card" target="_blank" rel="noopener" href="' + esc(me.practice.url) + '"><span class="eyebrow">Практика к лекции</span><b>' + esc(me.practice.title) +
        '</b><span>Практическое занятие курса. Откроется в новой вкладке.</span><span class="go" aria-hidden="true">↗</span></a>' : "") +
      '<nav class="pager" aria-label="Соседние лекции">' +
      (prev ? '<a href="' + prev.file + '"><small>← Назад</small>' + prev.id + ". " + esc(prev.title) + "</a>" : '<a href="' + HOME + '"><small>← Все лекции</small>Список лекций</a>') +
      (next ? (next.soon ? '<span class="next"><small>Далее · скоро</small>' + next.id + ". " + esc(next.title) + "</span>" :
        '<a class="next" href="' + next.file + '"><small>Далее →</small>' + next.id + ". " + esc(next.title) + "</a>") : '<a class="next" href="' + HOME + '"><small>Все лекции →</small>Список лекций</a>') + "</nav>";
    var doneBtn = fin.querySelector(".done-btn");
    doneBtn.addEventListener("click", function () { s.done = !s.done; persist(); refresh(); });

    function refresh() {
      var n = solved(id);
      fin.querySelector(".ring").outerHTML = ring(share(id), s.done);
      var all_ = s.total && n === s.total;
      fin.querySelector(".txt b").textContent = s.done ? "Лекция пройдена" : all_ ? "Все мини-тесты и итоговый тест пройдены" : "Закончили читать?";
      fin.querySelector(".txt span").textContent = "Выполнено: " + n + " из " + s.total + ". " +
        (s.done ? (all_ ? "Отметку можно снять, если захотите вернуться к лекции." : "Нерешенные можно решить и после отметки.") :
         all_ ? "Отметьте лекцию пройденной." : "Отметьте лекцию, когда разберетесь с материалом.");
      doneBtn.textContent = s.done ? "Снять отметку" : "Отметить пройденной";
      doneBtn.className = "btn done-btn " + (s.done ? "btn-ghost" : "btn-primary") + (all_ && !s.done ? " nudge" : "");
      fin.querySelector(".finish-card").classList.toggle("is-done", !!s.done);
      toc.querySelector(".toc-stats").innerHTML = "Решено: <b>" + n + "/" + s.total + "</b><br>Лекция: <b>" + (s.done ? "пройдена" : Math.round(share(id) * 100) + "%") + "</b>";
      var cur = sideEl.querySelector("a.current");
      if (cur) {
        var st = status(me);
        cur.classList.remove("is-done", "is-go"); if (st) cur.classList.add("is-" + st);
        cur.querySelector(".num").title = st ? STATUS[st] : "";
      }
      refreshCourse();
    }
    function onSolve(key) { if (!s.items[key]) { s.items[key] = 1; persist(); refresh(); } }
    refresh();
    // Ранее решенные задания
    items.forEach(function (k) { if (s.items[k]) document.dispatchEvent(new CustomEvent("pylec:restore", { detail: k })); });
  }

  function initQuiz(q, i, onSolve) {
    var key = q.dataset.id || "q" + (i + 1);
    var opts = [].slice.call(q.querySelectorAll("li"));
    var why = q.querySelector(".quiz-why");
    var box = document.createElement("div");
    box.className = "quiz-opts";
    opts.forEach(function (li, j) {
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<span class="key">' + "АБВГДЕ"[j] + "</span><span>" + li.innerHTML + "</span>";
      if (li.hasAttribute("data-correct")) b.dataset.correct = "";
      b.addEventListener("click", function () { pick(b); });
      box.appendChild(b);
    });
    q.querySelector("ul").replaceWith(box);
    q.insertAdjacentHTML("afterbegin", '<div class="quiz-top"><span class="eyebrow">Мини-тест · вопрос ' + (i + 1) + '</span><span class="eyebrow quiz-state"></span></div>');
    if (why) why.hidden = true;
    function finish(b) {
      box.querySelectorAll(".wrong").forEach(function (x) { x.classList.remove("wrong"); });
      b.classList.add("right");
      box.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
      q.classList.add("solved"); q.querySelector(".quiz-state").textContent = "Верно";
      if (why) why.hidden = false;
    }
    function pick(b) {
      if ("correct" in b.dataset) { finish(b); onSolve(key); return; }
      b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
      q.querySelector(".quiz-state").textContent = "Попробуйте еще раз";
    }
    document.addEventListener("pylec:restore", function (e) { if (e.detail === key) finish(box.querySelector("[data-correct]")); });
    return key;
  }

  // Итоговый тест: ответы на все вопросы, затем «Проверить»; результат N из M, разбор, «Пройти заново».
  // Зачет (data-pass, по умолчанию 0.8 - доля верных ответов) засчитывается в прогресс лекции.
  function initFinalTest(box, best, onScore, onSolve) {
    var key = box.dataset.id || "final", pass = parseFloat(box.dataset.pass || "0.8");
    var qs = [].slice.call(box.querySelectorAll(".ft-q")), total = qs.length, need = Math.ceil(total * pass);
    qs.forEach(function (q, i) {
      var opts = document.createElement("div");
      opts.className = "quiz-opts";
      q.querySelectorAll("li").forEach(function (li, j) {
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.innerHTML = '<span class="key">' + "АБВГДЕ"[j] + "</span><span>" + li.innerHTML + "</span>";
        if (li.hasAttribute("data-correct")) b.dataset.correct = "";
        b.addEventListener("click", function () {
          if (box.classList.contains("checked")) return;
          opts.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          q.classList.add("answered"); count(); advance(i);
        });
        opts.appendChild(b);
      });
      q.querySelector("ul").replaceWith(opts);
      if (q.querySelector("pre.code")) q.classList.add("has-code");  // код слева, варианты справа
      q.querySelectorAll(".quiz-q code, .quiz-opts code").forEach(function (c) {
        if (!c.children.length) { c.innerHTML = highlight(c.textContent); c.classList.add("hl"); }
      });
      q.insertAdjacentHTML("afterbegin", '<span class="eyebrow">Вопрос ' + (i + 1) + " из " + total + "</span>");
      var why = q.querySelector(".quiz-why"); if (why) why.hidden = true;
    });
    box.insertAdjacentHTML("afterbegin", '<div class="ft-head"><span class="eyebrow">Итоговый тест · зачет от ' + need + " из " + total +
      '</span><span class="eyebrow ft-best"></span></div>');
    box.insertAdjacentHTML("beforeend", '<div class="ft-result" hidden></div><div class="ft-foot"><span class="ft-count"></span><button class="btn btn-primary ft-btn" type="button"></button></div>');
    var btn = box.querySelector(".ft-btn"), res = box.querySelector(".ft-result");
    // Карточки: виден один вопрос, номера вопросов над ним в одну строку, «Назад» и «Далее», после ответа переход к следующему неотвеченному
    var cur = 0, timer = 0, nav = document.createElement("nav"), pager = document.createElement("div");
    nav.className = "ft-nav"; nav.setAttribute("aria-label", "Вопросы теста"); nav.style.setProperty("--n", total);
    nav.innerHTML = qs.map(function (q, i) { return '<button type="button" aria-label="Вопрос ' + (i + 1) + '">' + (i + 1) + "</button>"; }).join("");
    pager.className = "ft-pager";
    pager.innerHTML = '<span class="eyebrow ft-pos"></span><span class="ft-arrows"><button class="btn btn-ghost" type="button" data-step="-1" aria-label="Назад">← <span>Назад</span></button>' +
      '<button class="btn btn-ghost" type="button" data-step="1" aria-label="Далее"><span>Далее</span> →</button></span>';
    var pos = pager.querySelector(".ft-pos"), steps = pager.querySelectorAll("[data-step]");
    var dots = [].slice.call(nav.children);
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    pager.addEventListener("click", function (e) { var b = e.target.closest("[data-step]"); if (b) go(cur + Number(b.dataset.step)); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(cur + (e.key === "ArrowRight" ? 1 : -1)); }
    });
    box.querySelector(".ft-head").after(nav); nav.after(pager); box.classList.add("ft-cards");
    // Две колонки, только если код и самый длинный вариант помещаются рядом, каждый в одну строку; иначе код над вариантами.
    // Колонка кода - половина ширины, если варианты помещаются в другую половину, и не уже самого кода
    var coded = qs.filter(function (q) { return q.classList.contains("has-code"); });
    function fitCode() {
      coded.forEach(function (q) {
        var cs = getComputedStyle(q), pre = q.querySelector("pre.code"), opts = q.querySelector(".quiz-opts");
        q.style.display = "grid"; q.style.gridTemplateColumns = "max-content max-content";
        var c = Math.ceil(pre.getBoundingClientRect().width), o = Math.ceil(opts.getBoundingClientRect().width) + 1;  // +1: запас на дробные пиксели
        q.style.gridTemplateColumns = "";
        var w = q.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (parseFloat(cs.columnGap) || 0);
        q.style.display = "";
        q.classList.toggle("stack", c + o > w);
        q.style.setProperty("--code-w", Math.floor(Math.max(c, Math.min(w / 2, w - o))) + "px");
      });
    }
    if (coded.length) { fitCode(); addEventListener("resize", fitCode); if (document.fonts) document.fonts.ready.then(fitCode); }
    function go(i) {
      clearTimeout(timer);
      if (i < 0 || i >= total) return;
      var hadFocus = qs[cur].contains(document.activeElement) || pager.contains(document.activeElement);
      cur = i;
      qs.forEach(function (q, j) { q.classList.toggle("off", j !== i); });
      dots.forEach(function (d, j) { if (j === i) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current"); });
      steps[0].disabled = i === 0; steps[1].disabled = i === total - 1;
      pos.textContent = qs[i].querySelector(".eyebrow").textContent;  // «Вопрос N из M» над карточкой, рядом со стрелками
      pos.className = "eyebrow ft-pos" + (qs[i].classList.contains("is-right") ? " is-right" : qs[i].classList.contains("is-wrong") ? " is-wrong" : "");
      if (hadFocus && !pager.contains(document.activeElement)) qs[i].querySelector("button").focus({ preventScroll: true });
    }
    function advance(i) {
      clearTimeout(timer);
      for (var k = 1; k < total; k++) {
        var j = (i + k) % total;
        if (!qs[j].classList.contains("answered")) { timer = setTimeout(go, 500, j); return; }
      }
    }
    function paintBest() {
      var b = best[key];
      box.querySelector(".ft-best").textContent = b != null ? "Лучший результат: " + b + " из " + total + (b >= need ? " · зачтено" : "") : "";
    }
    function count() {
      var n = box.querySelectorAll(".ft-q.answered").length;
      box.querySelector(".ft-count").textContent = "Отвечено " + n + " из " + total;
      btn.disabled = n < total;
      dots.forEach(function (d, j) { d.classList.toggle("done", qs[j].classList.contains("answered")); });
    }
    function reset() {
      box.classList.remove("checked"); res.hidden = true;
      qs.forEach(function (q) {
        q.classList.remove("answered", "is-right", "is-wrong");
        q.querySelectorAll("button").forEach(function (b) { b.classList.remove("right", "wrong"); b.disabled = false; b.setAttribute("aria-pressed", "false"); });
        var why = q.querySelector(".quiz-why"); if (why) why.hidden = true;
      });
      dots.forEach(function (d) { d.classList.remove("right", "wrong"); });
      btn.textContent = "Проверить"; count(); go(0);
    }
    btn.addEventListener("click", function () {
      if (box.classList.contains("checked")) { reset(); box.scrollIntoView({ block: "start" }); return; }
      var score = 0, firstWrong = -1;
      qs.forEach(function (q, j) {
        var picked = q.querySelector('button[aria-pressed="true"]'), ok = picked && "correct" in picked.dataset;
        if (ok) score++; else if (firstWrong < 0) firstWrong = j;
        q.classList.add(ok ? "is-right" : "is-wrong"); dots[j].classList.add(ok ? "right" : "wrong");
        q.querySelectorAll("button").forEach(function (b) {
          b.disabled = true;
          if ("correct" in b.dataset) b.classList.add("right"); else if (b === picked) b.classList.add("wrong");
        });
        var why = q.querySelector(".quiz-why"); if (why) why.hidden = false;
      });
      box.classList.add("checked");
      var passed = score >= need;
      res.className = "ft-result " + (passed ? "ok" : "no"); res.hidden = false;
      res.innerHTML = "<b>" + score + " из " + total + "</b><span>" + (passed ? "Тест зачтен. Под каждым вопросом теперь разбор, ошибки отмечены красным в номерах вопросов." :
        "Для зачета нужно " + need + " из " + total + ". Ошибки отмечены красным в номерах вопросов: посмотрите разбор, перечитайте разделы и пройдите тест заново.") + "</span>";
      btn.textContent = "Пройти заново"; btn.disabled = false; go(firstWrong < 0 ? 0 : firstWrong);
      onScore(key, score); paintBest();
      if (passed) onSolve(key);
    });
    paintBest(); reset();
    return key;
  }

  // Вопрос-переход из презентации: открытый вопрос, ответ по кнопке. В прогресс не идет.
  function initAsk(a) {
    var ans = a.querySelector(".ask-a");
    a.insertAdjacentHTML("afterbegin", '<span class="eyebrow">Вопрос для размышления</span>');
    if (!ans) return;
    ans.hidden = true;
    ans.insertAdjacentHTML("beforebegin", '<button type="button" class="btn ask-btn">Показать ответ</button>');
    var b = a.querySelector(".ask-btn");
    b.addEventListener("click", function () { ans.hidden = !ans.hidden; b.textContent = ans.hidden ? "Показать ответ" : "Скрыть ответ"; });
  }

  // Разбор задачи свернут в спойлер: в строке номер задачи и отметка «разобрана», вопрос внутри.
  function initWalk(w) {
    var task = w.querySelector(".task"), num = task && task.querySelector("b");
    var title = num ? num.textContent.replace(/\.\s*$/, "") : "Задача";
    if (num) num.remove(); // номер уже в строке спойлера
    if (task) task.innerHTML = task.innerHTML.trim();
    var d = document.createElement("details");
    d.className = "walk-fold";
    d.innerHTML = '<summary><span class="walk-num">' + esc(title) + '</span><span class="walk-state">Разбор по шагам</span></summary>';
    while (w.firstChild) d.appendChild(w.firstChild);
    w.appendChild(d);
  }
  function markDone(box) {
    box.classList.add("done");
    var w = box.closest(".walk"); if (!w) return;
    w.classList.add("done"); w.querySelector(".walk-state").textContent = "✓ Разобрана";
  }

  // Строки кода как отдельные элементы анимации: data-lines="2-3:mark@1 5:in@2".
  // shortcut: делит подсвеченный HTML по \n, многострочная строка """...""" разорвет span; если понадобится - подсвечивать по строкам.
  function lineFx(p) {
    var lines = p.innerHTML.split("\n").map(function (h) { return '<span class="ln">' + (h || " ") + "</span>"; });
    p.innerHTML = lines.join("");
    var spans = p.querySelectorAll(".ln");
    p.dataset.lines.trim().split(/\s+/).forEach(function (t) {
      var m = /^(\d+)(?:-(\d+))?:(\S+)$/.exec(t); if (!m) { console.warn("data-lines: " + t); return; }
      for (var n = +m[1]; n <= +(m[2] || m[1]); n++) {
        var el = spans[n - 1]; if (!el) continue;
        el.setAttribute("data-fx", ((el.getAttribute("data-fx") || "") + " " + m[3]).trim());
      }
    });
  }

  // Кадры по щелчку, как анимации слайдов. Элементы внутри .anim получают data-fx из токенов «эффект@шаг»:
  // in - появляется, out - исчезает, mark / ok / bad - заливка (акцент, зеленая, красная), plain - снять заливку,
  // to(x,y) - сдвиг на x, y (любые единицы CSS). Шаг 0 - исходный кадр. data-id: последний шаг идет в прогресс.
  var FX = /^(in|out|mark|ok|bad|plain|to\(([^,()]+),([^,()]+)\))@(\d+)$/;
  function initAnim(box, onSolve) {
    var key = box.dataset.id || null, els = [].slice.call(box.querySelectorAll("[data-fx]")), last = 0;
    var plan = els.map(function (el) {
      return el.getAttribute("data-fx").trim().split(/\s+/).map(function (t) {
        var m = FX.exec(t); if (!m) { console.warn("data-fx: " + t); return null; }
        last = Math.max(last, +m[4]);
        return { fx: m[2] ? "to" : m[1], x: m[2], y: m[3], k: +m[4] };
      }).filter(Boolean).sort(function (a, b) { return a.k - b.k; });
    });
    box.dataset.steps = last;
    // Появляющийся элемент не занимает места, пока скрыт: блок растет по шагам. Место держат только
    // элементы, которые двигаются (to), и строки кода, иначе рисунок прыгал бы.
    var grow = plan.map(function (p, j) {
      return p.some(function (x) { return x.fx === "in"; }) && !p.some(function (x) { return x.fx === "to"; }) && !els[j].classList.contains("ln");
    });
    var stage = document.createElement("div");
    stage.className = "anim-stage";
    while (box.firstChild) stage.appendChild(box.firstChild);
    box.appendChild(stage);
    box.insertAdjacentHTML("afterbegin", '<div class="anim-bar"><span class="eyebrow">' + esc(box.dataset.title || "Анимация") +
      '</span><span class="anim-count"></span><button type="button" class="btn anim-prev" aria-label="Назад">←</button>' +
      '<button type="button" class="btn btn-primary anim-next">Дальше →</button><button type="button" class="btn anim-all">Все шаги</button>' +
      '<button type="button" class="btn anim-reset">Сначала</button></div>');
    // Подсказка на шаге 0: строкой в таблице, где скрыты все строки, иначе абзацем в конце рисунка.
    var hints = [];
    [].forEach.call(stage.querySelectorAll("tbody"), function (tb) {
      var rows = [].slice.call(tb.children);
      if (!rows.length || !rows.every(function (r) { var j = els.indexOf(r); return j >= 0 && grow[j]; })) return;
      var cols = tb.closest("table").querySelectorAll("tr")[0].children.length;
      tb.insertAdjacentHTML("afterbegin", '<tr class="anim-hint"><td colspan="' + cols + '">Нажмите «Дальше», чтобы открыть первый шаг.</td></tr>');
      hints.push(tb.firstChild);
    });
    if (!hints.length && grow.some(Boolean)) {
      stage.insertAdjacentHTML("beforeend", '<p class="anim-hint">Нажмите «Дальше», чтобы открыть первый шаг.</p>');
      hints.push(stage.lastChild);
    }
    box.tabIndex = 0;
    var step = 0, prev = box.querySelector(".anim-prev"), next = box.querySelector(".anim-next"), all = box.querySelector(".anim-all"),
      count = box.querySelector(".anim-count");
    function show(n) {
      step = Math.max(0, Math.min(last, n));
      els.forEach(function (el, j) {
        var vis = !plan[j].some(function (p) { return p.fx === "in"; }), tone = "", pos = "";
        plan[j].forEach(function (p) {
          if (p.k > step) return;
          if (p.fx === "in") vis = true; else if (p.fx === "out") vis = false;
          else if (p.fx === "to") pos = "translate(" + p.x + "," + p.y + ")";
          else tone = p.fx === "plain" ? "" : p.fx;
        });
        var was = el.classList.contains("fx-gone");
        el.classList.add("fx");
        el.classList.toggle("fx-hide", !vis);
        el.classList.toggle("fx-gone", !vis && grow[j]);
        if (was && vis) { el.classList.remove("fx-pop"); void el.offsetWidth; el.classList.add("fx-pop"); }
        if (tone) el.setAttribute("data-tone", tone); else el.removeAttribute("data-tone");
        el.style.transform = pos;
      });
      hints.forEach(function (h) { h.hidden = step > 0; });
      count.textContent = "Шаг " + step + " из " + last;
      prev.disabled = step === 0; next.disabled = all.disabled = step === last;
      if (step === last && last) { markDone(box); if (key) onSolve(key); }
    }
    all.addEventListener("click", function () { show(last); });
    next.addEventListener("click", function () { show(step + 1); });
    prev.addEventListener("click", function () { show(step - 1); });
    box.querySelector(".anim-reset").addEventListener("click", function () { show(0); });
    stage.addEventListener("click", function (e) { if (!e.target.closest("a, button, textarea")) show(step + 1); });
    box.addEventListener("keydown", function (e) {
      if (e.target !== box) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); show(step + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(step - 1); }
      else if (e.key === "End") { e.preventDefault(); show(last); }
      else if (e.key === "Home") { e.preventDefault(); show(0); }
    });
    if (key) document.addEventListener("pylec:restore", function (e) { if (e.detail === key) markDone(box); });
    show(0);
    return key;
  }

  function highlight(code) {
    return window.hljs ? window.hljs.highlight(code, { language: "python", ignoreIllegals: true }).value : esc(code);
  }

  /* ---------- Запуск Python ---------- */
  var py = { worker: null, ready: false, version: "", waiters: [], jobs: {}, seq: 0 };
  function startPython() {
    if (py.worker) return;
    py.worker = new Worker("assets/py-worker.js");
    py.worker.onmessage = function (e) {
      var m = e.data;
      if (m.type === "ready") { py.ready = true; py.version = m.version; py.waiters.splice(0).forEach(function (f) { f(); }); return; }
      if (m.type === "fail") { py.waiters.splice(0).forEach(function (f) { f(m.text); }); return; }
      var job = py.jobs[m.id]; if (!job) return;
      if (m.type === "out" || m.type === "err") job.chunk(m.type, m.text);
      if (m.type === "done") { clearTimeout(job.timer); delete py.jobs[m.id]; job.end(m.ok, m.text); }
    };
    py.worker.onerror = function (e) { py.waiters.splice(0).forEach(function (f) { f(e.message || "не удалось запустить Python"); }); };
  }
  function whenReady(cb) { startPython(); if (py.ready) cb(); else py.waiters.push(cb); }
  function restartPython() { py.worker.terminate(); py.worker = null; py.ready = false; py.jobs = {}; startPython(); }

  function initRunner(r, i, onSolve) {
    var id0 = r.getAttribute("data-id");
    var src = r.querySelector("textarea");
    var initial = src.value.replace(/^\n/, "").replace(/\s+$/, "");
    var expect = r.getAttribute("data-expect");
    var key = expect != null ? id0 || "t" + (i + 1) : null;
    var file = r.getAttribute("data-file") || "main.py";
    var stdinText = r.getAttribute("data-stdin");

    r.innerHTML = '<div class="runner-bar"><span class="file">' + esc(file) + "</span>" + (key ? '<span class="kind">Задача</span>' : "") +
      '<button class="reset" type="button" title="Вернуть исходный код" aria-label="Вернуть исходный код">' + ICON.undo + '</button><button class="run" type="button" title="Ctrl+Enter">' + ICON.play + '<span class="spin" aria-hidden="true"></span><span>Запустить</span></button></div>' +
      '<div class="editor"><pre aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Код на Python, ' + esc(file) + '"></textarea></div>' +
      (stdinText != null ? '<label class="stdin">Ввод<textarea rows="2" spellcheck="false"></textarea></label>' : "") +
      '<div class="output" aria-live="polite"><div><div class="label"><span>Вывод</span><span class="time"></span></div><pre></pre><div class="verdict"></div></div></div>';
    var ta = r.querySelector(".editor textarea"), pre = r.querySelector(".editor pre");
    var out = r.querySelector(".output"), outPre = out.querySelector("pre"), verdict = out.querySelector(".verdict"), time = out.querySelector(".time");
    var runBtn = r.querySelector(".run");
    var stdinBox = r.querySelector(".stdin textarea");
    var draftKey = "code:" + document.body.dataset.lecture + ":" + (id0 || i);
    ta.value = load(draftKey, initial);
    if (stdinBox) stdinBox.value = stdinText.replace(/\\n/g, "\n");
    if (ta.id === "") ta.id = "code-" + document.body.dataset.lecture + "-" + i;

    function paint() { pre.innerHTML = highlight(ta.value) + "\n"; }
    ta.addEventListener("input", function () { paint(); save(draftKey, ta.value); });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); document.execCommand("insertText", false, "    ") || insert("    "); }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
    });
    function insert(t) { var a = ta.selectionStart; ta.setRangeText(t, a, ta.selectionEnd, "end"); paint(); }
    r.querySelector(".reset").addEventListener("click", function () { ta.value = initial; paint(); save(draftKey, initial); });
    runBtn.addEventListener("click", run);
    paint();

    function show(html, cls) { outPre.innerHTML = html; outPre.className = cls || ""; out.classList.add("open"); }
    function run() {
      if (runBtn.disabled) return;
      if (location.protocol === "file:") {
        show("Python не запускается, когда страница открыта как файл: браузер запрещает ему загрузку интерпретатора. " +
          "Откройте сайт через «Запустить сайт.bat» (или команду python -m http.server в папке сайта) либо по адресу на GitHub Pages.", "err");
        return;
      }
      runBtn.disabled = true; r.classList.add("busy"); verdict.textContent = ""; verdict.className = "verdict"; time.textContent = "";
      if (!py.ready) show("Загружаем интерпретатор Python (около 14 МБ, только при первом запуске)…", "muted");
      whenReady(function (err) {
        if (err) { runBtn.disabled = false; r.classList.remove("busy"); show("Не удалось загрузить Python: " + esc(err), "err"); return; }
        var id = ++py.seq, text = "", t0 = performance.now();
        show("", "");
        var job = py.jobs[id] = {
          chunk: function (kind, t) { text += t; outPre.insertAdjacentHTML("beforeend", kind === "err" ? '<span class="err">' + esc(t) + "</span>" : esc(t)); },
          end: function (ok, errText) {
            runBtn.disabled = false; r.classList.remove("busy");
            time.textContent = "Python " + py.version + " · " + Math.round(performance.now() - t0) + " мс";
            if (!ok) outPre.insertAdjacentHTML("beforeend", '<span class="err">' + esc(errText) + "</span>");
            if (!text && ok) outPre.innerHTML = '<span class="muted">Программа ничего не вывела</span>';
            if (key) check(ok, text);
          }
        };
        job.timer = setTimeout(function () {
          delete py.jobs[id]; restartPython();
          job.end(false, "Остановлено: программа работает дольше 10 секунд. Возможно, это бесконечный цикл.");
        }, 10000);
        py.worker.postMessage({ id: id, code: ta.value, stdin: stdinBox ? stdinBox.value + "\n" : "" });
      });
    }
    function check(ok, text) {
      var good = ok && text.replace(/\s+$/, "") === expect.replace(/\\n/g, "\n");
      verdict.className = "verdict " + (good ? "ok" : "no");
      verdict.textContent = good ? "✓ Задача решена" : ok ? "Вывод не совпадает с ожидаемым. Ожидается: " + expect.replace(/\\n/g, " ⏎ ") : "Исправьте ошибку и запустите снова";
      if (good) { r.classList.add("passed"); onSolve(key); }
    }
    document.addEventListener("pylec:restore", function (e) { if (e.detail === key) r.classList.add("passed"); });
    return key;
  }

  // Кнопки «Наверх» и «Вниз»: видны на длинных страницах; поднимаются над липкой строкой итогового теста и над подвалом
  function jumpButtons() {
    var box = document.createElement("div"), arrow = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
    };
    box.className = "jump";
    box.innerHTML = '<button type="button" aria-label="Наверх" title="Наверх">' + arrow("M12 19V5M6 11l6-6 6 6") + "</button>" +
      '<button type="button" aria-label="Вниз" title="Вниз">' + arrow("M12 5v14M6 13l6 6 6-6") + "</button>";
    var up = box.children[0], down = box.children[1], de = document.documentElement;
    var smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    up.addEventListener("click", function () { scrollTo({ top: 0, behavior: smooth }); });
    down.addEventListener("click", function () { scrollTo({ top: de.scrollHeight, behavior: smooth }); });
    document.body.appendChild(box);
    function update() {
      var y = scrollY, max = de.scrollHeight - innerHeight, lift = 0;
      up.hidden = y < 400; down.hidden = max - y < 400;
      document.querySelectorAll(".ft-foot").forEach(function (f) {
        var r = f.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > innerHeight - 2) lift = Math.max(lift, innerHeight - r.top);
      });
      var foot = document.querySelector(".site-foot");   // и над подвалом страницы
      if (foot && foot.getBoundingClientRect().top < innerHeight) lift = Math.max(lift, innerHeight - foot.getBoundingClientRect().top);
      box.style.bottom = lift ? "calc(" + Math.round(lift + 12) + "px + env(safe-area-inset-bottom, 0px))" : "";
    }
    addEventListener("scroll", update, { passive: true }); addEventListener("resize", update); addEventListener("load", update); update();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPrefs(); applyPrefs();
    jumpButtons();
    var id = document.body.dataset.lecture;
    if (id) initLecture(id); else if (document.getElementById("modules")) initHome();
  });
})();
