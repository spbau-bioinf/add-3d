/* Итоговый тест лекции и мини-тесты разделов из одного банка вопросов (window.EXAM, файл lecture-NN-exam.js).

   Мини-тесты: <div class="quiz" data-q="ID вопроса"></div> превращается в разметку мини-теста app.js
   (вопрос, варианты, разбор); data-id мини-теста = "mt-" + ID. Скрипт подключается в конце body,
   до app.js-инициализации (DOMContentLoaded), поэтому app.js видит готовые мини-тесты.

   Итоговый тест: <div class="exam" data-id="exam"></div>. Перед началом - экран с правилами, затем попытка
   в полноэкранном слое поверх лекции: таймер, сетка вопросов, «Вернуться позже», клавиши 1-4 и ← →.
   Попыток EXAM.attempts, засчитывается лучшая; зачет от EXAM.pass %. Начатая попытка расходуется:
   перезагрузка и закрытие страницы таймер не останавливают. После попытки видны балл и номера ошибок;
   правильные ответы с разбором - после зачета или после последней попытки. Протокол .txt до открытия
   разбора содержит только баллы и сведения о попытках (без правильных ответов).
   Хранение: localStorage "lec3d:exam:<id>" в браузере студента; это самоотчет, а не защищенный учет. */
(function () {
  "use strict";
  var E = window.EXAM;
  if (!E) return;
  var N = E.questions.length, KEY = "lec3d:exam:" + E.id, MS = E.minutes * 60000;
  var NEED = Math.ceil(N * E.pass / 100);
  var byId = {};
  E.questions.forEach(function (q, i) { q.i = i; byId[q.id] = q; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function typo(s) { return esc(s).replace(/ (—|–) /g, "\u00a0$1 "); }   // неразрывный пробел перед тире
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seeded(seed) { return function () { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909); return ((seed ^= seed >>> 16) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { a = a.slice(); rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function when(ts) { var d = new Date(ts); return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
  function pct(x) { return String(Math.round(x * 10) / 10).replace(".", ","); }

  /* ---------- мини-тесты разделов ---------- */
  // Раздел автолекции может брать свой набор прямо из банка, без второго списка ID в HTML.
  document.querySelectorAll("[data-mini-section]").forEach(function (group) {
    var section = Number(group.dataset.miniSection);
    E.questions.forEach(function (q) {
      if (!q.mini || q.s !== section) return;
      var box = document.createElement("div");
      box.className = "quiz";
      box.dataset.q = q.id;
      group.appendChild(box);
    });
  });
  document.querySelectorAll(".quiz[data-q]").forEach(function (box) {
    var q = byId[box.dataset.q];
    if (!q) { box.textContent = "Нет вопроса " + box.dataset.q + " в банке."; return; }
    // порядок вариантов: как на слайде (ord) или постоянный для вопроса, чтобы верный стоял не всегда первым
    var ord = q.ord || shuffle([0, 1, 2, 3], seeded(hash(q.id)));
    box.dataset.id = "mt-" + q.id;
    if (q.slide) box.dataset.slide = q.slide;
    box.innerHTML = '<p class="quiz-q">' + typo(q.q) + "</p><ul>" + ord.map(function (k) {
      return "<li" + (k === 0 ? " data-correct" : "") + ">" + typo(q.a[k]) + "</li>";
    }).join("") + '</ul><p class="quiz-why">' + typo(q.why) + "</p>";
  });

  /* ---------- итоговый тест ---------- */
  var host = document.querySelector(".exam[data-id]");
  if (!host) return;
  var EXAM_ID = host.dataset.id;
  var S = load();
  var stage = null, tick = 0;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { name: "", tries: [] }; } catch (e) { return { name: "", tries: [] }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* хранилище недоступно */ } }
  function cur() { var t = S.tries[S.tries.length - 1]; return t && !t.end ? t : null; }
  function done() { return S.tries.filter(function (t) { return t.end; }); }
  function score(t) { return t.ans.reduce(function (n, a) { return n + (a === 0 ? 1 : 0); }, 0); }
  function best() { return done().reduce(function (b, t) { return Math.max(b, score(t)); }, 0); }
  function passed() { return best() >= NEED; }
  function left() { return E.attempts - S.tries.length; }
  // Разбор с ключом открывается после зачета или после последней попытки. Чтобы ключ нельзя было
  // использовать для повышения балла, после зачета новые попытки закрыты (canStart).
  function reviewOpen() { return passed() || (left() <= 0 && !cur()); }
  function canStart() { return left() > 0 && !passed() && !cur(); }
  function solved() { if (passed()) document.dispatchEvent(new CustomEvent("add3d:solved", { detail: EXAM_ID })); }

  // ---- экран до и после попыток (на странице лекции)
  function renderHome() {
    var d = done(), h = '<div class="exam-in">';
    if (!d.length) {
      h += "<h3>" + esc(E.title) + "</h3>" +
        '<p>Тест проверяет усвоение всей лекции. Перед началом прочитайте условия: начатая попытка расходуется, даже если закрыть страницу.</p>' +
        '<div class="exam-cards"><div class="exam-card"><b>' + N + '</b><span>вопросов, один верный ответ из четырех</span></div>' +
        '<div class="exam-card"><b>' + E.minutes + ' мин</b><span>на одну попытку, таймер вверху экрана</span></div>' +
        '<div class="exam-card"><b>' + E.attempts + '</b><span>попытки; засчитывается лучшая, зачет от ' + NEED + " верных (" + E.pass + " %)</span></div></div>" + rules();
    } else {
      var b = best(), last = d[d.length - 1];
      h += "<h3>" + esc(E.title) + ': <span class="' + (passed() ? "exam-ok" : "exam-bad") + '">' + (passed() ? "зачтено" : "не зачтено") + "</span></h3>" +
        "<p>Лучший результат: <b>" + b + " из " + N + "</b> (" + pct(b / N * 100) + " %), для зачета нужно " + NEED + ". " +
        (passed() ? "Тест зачтен, новые попытки не нужны." : left() > 0 ? "Осталось " + plural(left(), "попытка", "попытки", "попыток") + "." : "Попытки израсходованы.") + "</p>" + triesTable(d);
      var wrong = last.order.map(function (qi, i) { return last.ans[i] === 0 ? 0 : i + 1; }).filter(Boolean);
      h += "<p>Попытка " + d.length + (last.expired ? " (время вышло)" : "") + ": " +
        (wrong.length ? "ошибки в вопросах № " + wrong.join(", ") + " (номера в порядке показа)." : "ошибок нет.") + "</p>";
      if (!reviewOpen()) h += '<p class="exam-note">Правильные ответы с разбором откроются после зачета или после ' + E.attempts + "-й попытки.</p>";
    }
    h += '<div class="exam-field"' + (d.length ? " hidden" : "") + '><label for="exam-name">Фамилия, имя, отчество</label><input id="exam-name" autocomplete="name" spellcheck="false" value="' + esc(S.name) + '"></div>' +
      '<p class="exam-err" id="exam-err"></p><div class="exam-row">';
    if (canStart()) h += '<button type="button" class="btn btn-primary" id="exam-go">' + (d.length ? "Начать попытку " + (S.tries.length + 1) + " из " + E.attempts : "Начать тест") + " →</button>";
    if (d.length) h += '<button type="button" class="btn btn-ghost" id="exam-dl">Скачать протокол</button>';
    h += "</div>";
    if (reviewOpen() && d.length) h += review(d[d.length - 1], d.length);
    host.innerHTML = h + "</div>";
    var go = host.querySelector("#exam-go"), dl = host.querySelector("#exam-dl");
    if (go) go.addEventListener("click", function () { d.length ? confirmStart() : start(); });
    if (dl) dl.addEventListener("click", protocol);
  }
  function rules() {
    return '<ul class="exam-rules">' +
      "<li>Вопросы и варианты ответов идут в случайном порядке. Отвечать можно в любом порядке: кнопки «Назад» и «Далее» или сетка номеров; ответ можно изменить до завершения.</li>" +
      "<li>Время на попытку " + E.minutes + " минут. Когда оно выйдет, тест завершится сам и засчитаются выбранные к этому моменту ответы; вопрос без ответа считается неверным.</li>" +
      "<li>Попыток " + E.attempts + ", засчитывается лучшая. Начатая попытка расходуется: перезагрузка или закрытие страницы не останавливают таймер.</li>" +
      "<li>Во время попытки материалы лекции скрыты. Тест проходят без конспектов, поиска и ИИ; уходы из окна теста записываются в протокол.</li>" +
      "<li>После попытки видны балл и номера вопросов с ошибками. Правильные ответы с разбором откроются после зачета или после последней попытки; после зачета новые попытки не предоставляются.</li>" +
      "<li>После каждой попытки скачайте протокол и передайте его преподавателю. Результаты хранятся только в этом браузере, поэтому все попытки проходите в нем.</li>" +
      "<li>Клавиши: <kbd>1</kbd>–<kbd>4</kbd> ответ, <kbd>←</kbd> <kbd>→</kbd> предыдущий и следующий вопрос, <kbd>F</kbd> вернуться позже.</li></ul>";
  }
  function triesTable(d) {
    var b = best();
    return '<div class="table-wrap"><table class="exam-tries"><thead><tr><th>Попытка</th><th>Дата</th><th>Верно</th><th>Время</th></tr></thead><tbody>' +
      d.map(function (t, i) {
        var sc = score(t);
        return '<tr class="' + (sc === b ? "best" : "") + '"><td>' + (i + 1) + "</td><td>" + when(t.start) + "</td><td>" + sc + " из " + N + " (" + pct(sc / N * 100) + " %)</td><td>" +
          mmss(t.end - t.start) + (t.expired ? ", время вышло" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function review(t, n) {
    return '<details class="exam-review-wrap"><summary>Разбор попытки ' + n + ": правильные ответы и пояснения</summary><div class=\"exam-review\">" +
      t.order.map(function (qi, i) {
        var q = E.questions[qi], a = t.ans[i], ok = a === 0;
        return '<div class="rv ' + (ok ? "ok" : "no") + '"><p><b>' + (i + 1) + ".</b> " + typo(q.q) + "</p>" +
          "<p>Ваш ответ: " + (a === null ? "нет ответа" : typo(q.a[a])) + (ok ? ' <span class="exam-ok">— верно</span>' : ' <span class="exam-bad">— неверно</span>') + "</p>" +
          (ok ? "" : "<p>Правильный ответ: <b>" + typo(q.a[0]) + "</b></p>") + '<p class="why">' + typo(q.why) + "</p></div>";
      }).join("") + "</div></details>";
  }
  function confirmStart() {
    dialog("Начать попытку " + (S.tries.length + 1) + " из " + E.attempts + "?",
      "<p>" + N + " вопросов, " + E.minutes + " минут. Таймер пойдет сразу и не остановится при перезагрузке или закрытии страницы. Засчитывается лучшая попытка.</p>",
      "Начать", start);
  }
  function dialog(title, html, okText, ok) {
    var d = document.createElement("dialog");
    d.className = "exam-dlg";
    d.innerHTML = "<h3>" + esc(title) + "</h3>" + html + '<div class="exam-row"><button type="button" class="btn btn-ghost" value="no">Вернуться</button><button type="button" class="btn btn-primary" value="ok">' + esc(okText) + "</button></div>";
    d.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      d.close(); if (b.value === "ok") ok();
    });
    d.addEventListener("close", function () { d.remove(); });
    (stage || document.body).appendChild(d); d.showModal();
  }

  // ---- попытка
  function start() {
    var nameEl = host.querySelector("#exam-name");
    if (!done().length) {
      var v = nameEl ? nameEl.value.trim() : "";
      if (v.length < 5 || v.split(/\s+/).length < 2) { host.querySelector("#exam-err").textContent = "Введите фамилию, имя и отчество."; nameEl.focus(); return; }
      S.name = v;
    }
    if (!canStart()) return;   // зачтено или попытки кончились: ключ уже мог быть показан
    var now = Date.now();
    S.tries.push({ start: now, deadline: now + MS, end: 0, expired: false, order: shuffle(E.questions.map(function (q) { return q.i; })),
      perms: E.questions.map(function () { return shuffle([0, 1, 2, 3]); }), ans: E.questions.map(function () { return null; }),
      flag: E.questions.map(function () { return false; }), at: 0, blur: 0, reload: 0 });
    save();
    openStage();
  }
  function openStage(notice) {
    var t = cur();
    document.documentElement.classList.add("exam-running");
    stage = document.createElement("div");
    stage.className = "exam-stage";
    stage.setAttribute("role", "dialog"); stage.setAttribute("aria-modal", "true"); stage.setAttribute("aria-label", E.title);
    stage.innerHTML = '<div class="exam-top"><b class="exam-brand">' + esc(E.title) + '</b><div class="exam-meter"><i></i><span></span></div>' +
      '<div class="exam-clock" aria-live="off"><small>осталось</small><b>' + mmss(t.deadline - Date.now()) + "</b></div>" +
      '<button type="button" class="btn btn-primary" data-act="finish">Завершить</button></div>' +
      '<div class="exam-body">' + (notice ? '<p class="exam-note">' + esc(notice) + "</p>" : "") +
      '<div class="exam-grid" role="group" aria-label="Вопросы">' + E.questions.map(function (q, i) { return '<button type="button" data-go="' + i + '">' + (i + 1) + "</button>"; }).join("") + "</div>" +
      '<div class="exam-card-q"><span class="eyebrow exam-num"></span><p class="exam-q"></p><div class="quiz-opts" role="radiogroup"></div>' +
      '<div class="exam-foot"><button type="button" class="btn btn-ghost" data-act="prev">← Назад</button><button type="button" class="btn btn-ghost btn-flag" data-act="flag" aria-pressed="false">Вернуться позже</button>' +
      '<span class="sp"></span><button type="button" class="btn btn-primary" data-act="next">Далее →</button></div>' +
      '<p class="exam-hint"><kbd>1</kbd>–<kbd>4</kbd> ответ · <kbd>←</kbd> <kbd>→</kbd> вопросы · <kbd>F</kbd> вернуться позже</p></div></div>';
    document.body.appendChild(stage);
    stage.addEventListener("click", onClick);
    draw(); lockHeights();
    if (document.fonts) document.fonts.ready.then(lockHeights);
    clearInterval(tick); tick = setInterval(clock, 250); clock();
    stage.querySelector(".exam-q").focus && stage.focus();
  }
  function closeStage() {
    clearInterval(tick);
    if (stage) stage.remove();
    stage = null;
    document.documentElement.classList.remove("exam-running");
  }
  function onClick(e) {
    var b = e.target.closest("button"); if (!b || !stage) return;
    var t = cur(); if (!t) return;
    if (b.dataset.go) go(+b.dataset.go);
    else if (b.dataset.p) choose(+b.dataset.p);
    else if (b.dataset.act === "prev") go(t.at - 1);
    else if (b.dataset.act === "next") t.at === N - 1 ? askFinish() : go(t.at + 1);
    else if (b.dataset.act === "flag") { t.flag[t.at] = !t.flag[t.at]; save(); draw(); }
    else if (b.dataset.act === "finish") askFinish();
  }
  function go(i) { var t = cur(); if (i < 0 || i >= N || i === t.at) return; t.at = i; save(); draw(); stage.scrollTop = 0; }
  function choose(p) {
    var t = cur();
    // Фоновая вкладка может получить ввод до очередного срабатывания таймера.
    if (Date.now() >= t.deadline) { finish(true); return; }
    t.ans[t.at] = t.perms[t.at][p]; save(); draw();
  }
  function draw() {
    var t = cur(), i = t.at, q = E.questions[t.order[i]], n = t.ans.filter(function (a) { return a !== null; }).length;
    stage.querySelector(".exam-num").textContent = "Вопрос " + (i + 1) + " из " + N;
    stage.querySelector(".exam-q").innerHTML = typo(q.q);
    stage.querySelector(".quiz-opts").innerHTML = t.perms[i].map(function (k, p) {
      return '<button type="button" role="radio" data-p="' + p + '" aria-checked="' + (t.ans[i] === k) + '"><span class="key">' + (p + 1) + "</span><span>" + typo(q.a[k]) + "</span></button>";
    }).join("");
    stage.querySelectorAll(".exam-grid button").forEach(function (c, k) {
      c.classList.toggle("a", t.ans[k] !== null); c.classList.toggle("f", t.flag[k]); c.setAttribute("aria-current", String(k === i));
    });
    stage.querySelector("[data-act=prev]").disabled = i === 0;
    stage.querySelector("[data-act=next]").textContent = i === N - 1 ? "К завершению →" : "Далее →";
    stage.querySelector("[data-act=flag]").setAttribute("aria-pressed", String(t.flag[i]));
    stage.querySelector(".exam-meter").style.setProperty("--p", n / N * 100 + "%");
    stage.querySelector(".exam-meter span").textContent = n + "/" + N;
  }
  // высота вопроса и вариантов - по самому длинному тексту банка, чтобы кнопки не прыгали между вопросами
  function lockHeights() {
    if (!stage) return;
    var qt = stage.querySelector(".exam-q"), opt = stage.querySelector(".quiz-opts button"), st = stage.style;
    if (!opt) return;
    var span = opt.lastElementChild, keep = [qt.innerHTML, span.innerHTML], hq = 0, ho = 0;
    st.removeProperty("--q-h"); st.removeProperty("--o-h");
    E.questions.forEach(function (q) {
      qt.innerHTML = typo(q.q); hq = Math.max(hq, qt.offsetHeight);
      q.a.forEach(function (a) { span.innerHTML = typo(a); ho = Math.max(ho, opt.offsetHeight); });
    });
    qt.innerHTML = keep[0]; span.innerHTML = keep[1];
    st.setProperty("--q-h", hq + "px"); st.setProperty("--o-h", ho + "px");
  }
  var rz = 0;
  addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(lockHeights, 150); });
  function clock() {
    var t = cur(); if (!t || !stage) return;
    var rest = t.deadline - Date.now(), c = stage.querySelector(".exam-clock");
    c.querySelector("b").textContent = mmss(rest);
    c.className = "exam-clock" + (rest <= 60000 ? " crit" : rest <= 5 * 60000 ? " low" : "");
    if (rest <= 0) finish(true);
  }
  function askFinish() {
    var t = cur(), empty = t.ans.filter(function (a) { return a === null; }).length, fl = t.flag.filter(Boolean).length;
    dialog("Завершить попытку?",
      "<p>" + (empty ? "Без ответа " + plural(empty, "вопрос", "вопроса", "вопросов") + ": они будут засчитаны как неверные. " : "Все вопросы отвечены. ") +
      (fl ? "Отмечено «вернуться позже»: " + fl + ". " : "") + "После завершения ответы изменить нельзя.</p>", "Завершить", function () { finish(false); });
  }
  function finish(expired) {
    var t = cur(); if (!t) return;
    var now = Date.now();
    t.end = Math.min(now, t.deadline); t.expired = expired || now >= t.deadline; save();
    var openDlg = stage && stage.querySelector("dialog[open]"); if (openDlg) openDlg.close();
    closeStage(); renderHome(); solved();
    host.scrollIntoView({ block: "start" });
  }

  // ---- протокол: до открытия разбора только баллы и сведения о попытках
  function protocol() {
    var d = done(), open = reviewOpen(), b = best();
    var L = ["ПРОТОКОЛ ИТОГОВОГО ТЕСТА", "Курс: Аддитивные технологии в биомедицине",
      "Лекция " + E.id + ": " + document.title.split(" · ")[0], "Студент: " + S.name, "",
      "Условия: " + N + " вопросов, " + E.minutes + " мин на попытку, попыток " + E.attempts + ", зачет от " + NEED + " верных (" + E.pass + " %)",
      "Лучший результат: " + b + " из " + N + " (" + pct(b / N * 100) + " %) - " + (passed() ? "ЗАЧТЕНО" : "НЕ ЗАЧТЕНО"),
      "Использовано попыток: " + d.length + " из " + E.attempts, ""];
    d.forEach(function (t, k) {
      var sc = score(t), wrong = t.order.map(function (qi, i) { return t.ans[i] === 0 ? 0 : i + 1; }).filter(Boolean);
      L.push("Попытка " + (k + 1) + ": " + when(t.start) + " - " + when(t.end) + ", " + mmss(t.end - t.start) + (t.expired ? " (время вышло)" : ""),
        "  верно " + sc + " из " + N + " (" + pct(sc / N * 100) + " %); без ответа " + t.ans.filter(function (a) { return a === null; }).length +
        "; уходов из окна теста " + t.blur + "; перезагрузок " + t.reload,
        "  ошибки в вопросах (номера в порядке показа): " + (wrong.length ? wrong.join(", ") : "нет"));
      var bySec = E.sections.map(function () { return [0, 0]; });
      t.order.forEach(function (qi, i) { var s = E.questions[qi].s - 1; bySec[s][1]++; if (t.ans[i] === 0) bySec[s][0]++; });
      L.push("  по разделам: " + bySec.map(function (x, s) { return (s + 1) + ") " + x[0] + "/" + x[1]; }).join("; "));
    });
    if (open && d.length) {
      var t = d[d.length - 1];
      L.push("", "ОТВЕТЫ ПОПЫТКИ " + d.length + " (разбор открыт)", "");
      t.order.forEach(function (qi, i) {
        var q = E.questions[qi], a = t.ans[i];
        L.push((i + 1) + ". " + q.q, "   Ответ: " + (a === null ? "нет ответа" : q.a[a]) + (a === 0 ? "  [верно]" : "  [неверно]"));
        if (a !== 0) L.push("   Правильно: " + q.a[0]);
      });
    } else L.push("", "Правильные ответы в протокол не входят до зачета или до последней попытки.");
    L.push("", "Протокол сформирован в браузере студента " + when(Date.now()) + ".");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + L.join("\r\n")], { type: "text/plain;charset=utf-8" }));
    a.download = "Протокол_лекция_" + E.id + "_" + S.name.replace(/[^\p{L}\p{N}]+/gu, "_") + "_" + new Date().toISOString().slice(0, 10) + ".txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---- клавиши и контроль
  document.addEventListener("keydown", function (e) {
    var t = cur();
    if (!t || !stage || stage.querySelector("dialog[open]") || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key >= "1" && e.key <= "4") choose(+e.key - 1);
    else if (e.key === "ArrowRight") go(t.at + 1);
    else if (e.key === "ArrowLeft") go(t.at - 1);
    else if (e.code === "KeyF") { t.flag[t.at] = !t.flag[t.at]; save(); draw(); }
    else return;
    e.preventDefault();
  });
  addEventListener("blur", function () { var t = cur(); if (t && stage) { t.blur++; save(); } });
  addEventListener("beforeunload", function (e) { if (cur()) { e.preventDefault(); e.returnValue = ""; } });

  // ---- запуск: незавершенная попытка продолжается, время шло и без страницы
  var t0 = cur();
  if (t0) {
    t0.reload++; save();
    if (Date.now() >= t0.deadline) { t0.end = t0.deadline; t0.expired = true; save(); renderHome(); }
    else { renderHome(); openStage("Страница была перезагружена. Ответы сохранены, таймер не останавливался."); }
  } else renderHome();
  addEventListener("load", solved);
})();
