/* pyrun.js — запуск и проверка программ Python прямо на странице.
   Код выполняется настоящим CPython (Pyodide) в браузере: интерпретатор
   загружается с cdn.jsdelivr.net при первом нажатии «Запустить» и общий
   для всех окон страницы. Перед запуском в виртуальную файловую систему
   кладутся модули страницы (по умолчанию gen.py и stats.py) и ее модели .stl,
   поэтому import и open() работают.
   Файлы, которые программа записала (например, .gcode), перечисляются под
   окном; кнопка «В просмотрщик» открывает их во встроенном просмотрщике,
   если он есть на странице (gcode-viewer.js публикует window.gvLoadText).
   Исходники модулей берутся из тегов <script type="text/plain" data-pymod="…"> на странице,
   модели — из тегов data-pyfile в base64 (их вставляет _includes/pyrun-modules.html по полям
   страницы pymods и pyfiles); если тегов модулей нет, gen.py и stats.py загружаются из assets/files.
   Разметка: <div class="pyrun" data-file="имя.py" data-stdin="строки ввода">
               <textarea class="pyrun__code">…</textarea> … <pre class="pyrun__expected">…</pre> </div>

   Кнопки окна: «▶ Запустить» (вывод сравнивается с «Требуемым выводом»), «✓ Проверить» (тесты),
   «Выбрать файл .py» (текст своего файла в окно), «↺ Сбросить» (исходный код, пустой вывод).
   Каждый запуск идет в чистом пространстве имен с __name__ == "__main__" и sys.argv = [имя файла],
   файлы страницы перед запуском восстанавливаются: программы не мешают друг другу.

   ТЕСТЫ (<script type="application/json" class="pyrun__tests">, их пишет tools/build_tests.py
   из _data/tests/<страница>.json):
     {"order": "any",                 // необязательно: порядок строк вывода не важен
      "prefix": true,                 // необязательно: сравниваются только первые строки, сколько их в ожидаемом выводе
      "tests": [ТЕСТ, …]}             // первый тест без подстановок — данные из условия
     ТЕСТ: {"note": "что проверяет", "output": "ожидаемый вывод",
            "files": {"holed.stl": "ring.stl"},  // перед запуском файл заменяется другим файлом страницы
            "set": {"porosity": "0.6"},          // строка «porosity = …» программы заменяется значением
            "input": "0.7\n10\n20",            // ввод для input(); без поля — data-stdin окна
            "call": "print(len(holes(faces)))"}  // код, выполняемый после программы в ее пространстве имен;
                                                 // проверяется только его вывод
   Сравнение: строки без хвостовых пробелов. Если отличаются только числа и напечатанное
   число округляется до ожидаемого, подсказка называет нужное число знаков после запятой.

   ФАЙЛЫ ДЛЯ ЗАПУСКА. По начальному коду окна (import модулей курса, имена файлов в кавычках,
   ввод data-stdin) под окном печатается строка «Для запуска рядом с программой нужны: …»
   со ссылками на assets/files (список файлов сайта — window.ADD3D_FILES из шаблона), а в начале
   страницы — блок «Файлы для этой страницы»: программа → что положить рядом. */
(function () {
  "use strict";
  function copyText(t, btn) {                                              // общая функция копирования (используется и copycode.js)
    var done = function () { btn.classList.add("is-done"); btn.title = "Скопировано"; setTimeout(function () { btn.classList.remove("is-done"); btn.title = "Скопировать код"; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { btn.title = "Выделите текст и скопируйте вручную"; });
    else btn.title = "Выделите текст и скопируйте вручную";
  }
  window.add3dCopyText = copyText;

  // ---------- подсветка синтаксиса Python (строки, комментарии, ключевые слова, числа, вызовы) ----------
  var KW = /\b(def|return|for|in|if|elif|else|while|import|from|as|with|class|pass|break|continue|and|or|not|is|None|True|False|lambda|try|except|finally|raise|yield|global|del|assert)\b/g;
  var BI = /\b(print|input|int|float|str|len|range|open|round|abs|min|max|sum|list|dict|set|tuple|math|enumerate|zip|sorted|isinstance|type|bool)\b/g;
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function plain(t) {
    return esc(t).replace(KW, '<span class="hl-kw">$1</span>').replace(BI, '<span class="hl-bi">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, '<span class="hl-num">$1</span>')
      .replace(/(^|[^\w>"])([A-Za-z_]\w*)(?=\()/g, function (s, pre, n) { return pre + '<span class="hl-fn">' + n + "</span>"; });
  }
  function highlight(src) {
    var out = "", re = /("""[\s\S]*?"""|'''[\s\S]*?'''|[fFrRbB]?"(?:\\.|[^"\\\n])*"|[fFrRbB]?'(?:\\.|[^'\\\n])*'|#[^\n]*)/g, last = 0, m;
    while ((m = re.exec(src))) {
      out += plain(src.slice(last, m.index));
      out += m[0][0] === "#" ? '<span class="hl-com">' + esc(m[0]) + "</span>" : '<span class="hl-str">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    return out + plain(src.slice(last));
  }
  var VERSION = "0.27.6";
  var INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v" + VERSION + "/full/";
  var HOME = "/home/pyodide";
  var root = (document.querySelector('script[src$="assets/js/pyrun.js"]') || {}).src || "";
  root = root.replace(/assets\/js\/pyrun\.js.*$/, "");
  var MODTAGS = document.querySelectorAll("script[data-pymod]");
  var MODULES = MODTAGS.length ? Array.prototype.map.call(MODTAGS, function (t) { return t.getAttribute("data-pymod"); }) : ["gen.py", "stats.py"];
  var DATAFILES = Array.prototype.map.call(document.querySelectorAll("script[data-pyfile]"), function (t) { return t.getAttribute("data-pyfile"); });
  var SITE_FILES = window.ADD3D_FILES || [];
  function b64bytes(t) { var s = atob(t.replace(/\s+/g, "")), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  var pyPromise = null, SNAP = null;

  function listFiles(py) {
    try { return py.FS.readdir(HOME).filter(function (f) { return f !== "." && f !== ".." && py.FS.isFile(py.FS.stat(HOME + "/" + f).mode); }); } catch (e) { return []; }
  }
  function restore(py) {                 // файлы страницы как после загрузки: удалить записанное программами, вернуть исходные
    listFiles(py).forEach(function (f) { if (!(f in SNAP)) try { py.FS.unlink(HOME + "/" + f); } catch (e) { /* занят */ } });
    Object.keys(SNAP).forEach(function (f) { py.FS.writeFile(HOME + "/" + f, SNAP[f]); py.FS.utime(HOME + "/" + f, 0, 0); });   // время 0: записанное программой видно по времени
  }

  function getPy(status) {
    if (pyPromise) return pyPromise;
    status.textContent = "Загрузка Python (около 10 МБ, один раз на страницу)…";
    pyPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = INDEX_URL + "pyodide.js";
      s.onload = function () {
        loadPyodide({indexURL: INDEX_URL}).then(function (py) {
          try { py.FS.chdir(HOME); } catch (e) { /* каталог уже текущий */ }
          py.runPython("import sys\nif '" + HOME + "' not in sys.path: sys.path.insert(0, '" + HOME + "')");
          return Promise.all(MODULES.map(function (m) {
            var tag = document.querySelector('script[data-pymod="' + m + '"]');   // исходник вшит в страницу
            var src = tag ? Promise.resolve(tag.textContent) : fetch(root + "assets/files/" + m).then(function (r) { return r.ok ? r.text() : ""; }, function () { return ""; });
            return src.then(function (t) { if (t) py.FS.writeFile(HOME + "/" + m, t.trim() + "\n"); });
          })).then(function () {
            Array.prototype.forEach.call(document.querySelectorAll("script[data-pyfile]"), function (t) {   // модели страницы
              py.FS.writeFile(HOME + "/" + t.getAttribute("data-pyfile"), b64bytes(t.textContent));
            });
            if (MODULES.indexOf("gen.py") >= 0) {
              try { py.runPython("import runpy, contextlib, io\nwith contextlib.redirect_stdout(io.StringIO()):\n    runpy.run_path('gen.py', run_name='__main__')"); } catch (e) { /* square.gcode и scaffold.gcode не созданы */ }
            }
            SNAP = {};
            listFiles(py).forEach(function (f) { SNAP[f] = py.FS.readFile(HOME + "/" + f); });
            resolve(py);
          });
        }, reject);
      };
      s.onerror = function () { reject(new Error("не удалось загрузить Pyodide")); };
      document.head.appendChild(s);
    });
    pyPromise.catch(function () { pyPromise = null; });
    return pyPromise;
  }

  /* Один запуск: восстановить файлы, подставить данные теста, выполнить в чистом пространстве имен.
     Возвращает {out, err}: out — напечатанное (для теста с call — только вывод call). */
  function execute(py, code, file, t, stdinText) {
    restore(py);
    var miss = [];
    var src = {};                                                   // сначала читаются все источники: замены можно менять местами
    Object.keys(t.files || {}).forEach(function (dst) {
      try { src[dst] = py.FS.readFile(HOME + "/" + t.files[dst]); } catch (e) { miss.push(t.files[dst]); }
    });
    Object.keys(src).forEach(function (dst) { py.FS.writeFile(HOME + "/" + dst, src[dst]); });
    Object.keys(t.set || {}).forEach(function (name) {
      var re = new RegExp("^" + name + "\\s*=.*$", "m");
      if (re.test(code)) code = code.replace(re, name + " = " + t.set[name]);
      else miss.push("строка «" + name + " = …»");
    });
    if (miss.length) return {out: "", err: "Тест не запущен: в программе нет " + miss.join(", ") + "."};
    var buf = [];
    py.setStdout({batched: function (line) { buf.push(line); }});
    py.setStderr({batched: function (line) { buf.push(line); }});
    // input(): в тестах приглашение не печатается и лишний вопрос — ошибка EOFError;
    // при запуске кнопкой «Запустить» приглашение и ответ печатаются, как в терминале,
    // а когда ввод кончился, отвечается пустая строка (значение по умолчанию)
    var test = t.output !== undefined;
    var lines = (t.input !== undefined ? t.input : stdinText).split("\n");
    if (lines.length === 1 && lines[0] === "") lines = [];
    window.__pyrunInput = function (prompt) {
      if (lines.length) { var v = lines.shift(); if (!test) buf.push(String(prompt) + v); return v; }
      if (test) return null;
      buf.push(String(prompt)); return "";
    };
    var ns = py.globals.get("dict")();
    ns.set("__name__", "__main__");
    var err = "";
    try {
      py.runPython("import sys, builtins, js\nsys.argv = [" + JSON.stringify(file) + "]\n" +
        "def _pyrun_input(prompt=''):\n    v = js.__pyrunInput(str(prompt))\n    if v is None:\n        raise EOFError('EOF when reading a line')\n    return v\n" +
        "builtins.input = _pyrun_input");
      py.runPython(code, {globals: ns});
      if (t.call) { buf = []; py.runPython(t.call, {globals: ns}); }
    } catch (e) {
      var msg = String(e.message || e).trim().split("\n");
      err = msg.slice(-3).join("\n");
      if (/EOFError/.test(err)) err += "\n(программа просит больше данных, чем дано в тесте)";
    }
    ns.destroy();
    return {out: buf.join("\n"), err: err};
  }

  /* ---------- сравнение вывода ---------- */
  function norm(t) { return t.replace(/\r/g, "").replace(/[ \t]+$/gm, "").replace(/\s+$/, "").replace(/^\n+/, ""); }
  var NUM = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  function decimals(s) { var m = /\.(\d+)/.exec(s); return m && !/[eE]/.test(s) ? m[1].length : 0; }
  /* null — совпало; иначе текст подсказки */
  function compare(got, exp, order, prefix) {
    var g = norm(got).split("\n"), e = norm(exp).split("\n");
    if (prefix) g = g.slice(0, e.length);                          // дополнительные строки после требуемых не мешают
    if (order === "any") { g.sort(); e.sort(); }
    if (g.join("\n") === e.join("\n")) return null;
    if (g.length !== e.length) return "Ожидается строк вывода: " + e.length + ", напечатано: " + (norm(got) ? g.length : 0) + ".";
    for (var i = 0; i < e.length; i++) {
      if (g[i] === e[i]) continue;
      var gn = g[i].match(NUM) || [], en = e[i].match(NUM) || [];
      var sameText = g[i].replace(NUM, "#") === e[i].replace(NUM, "#") && gn.length === en.length;
      if (sameText) {
        for (var k = 0; k < en.length; k++) {
          if (gn[k] === en[k]) continue;
          var d = decimals(en[k]), a = parseFloat(gn[k]), b = parseFloat(en[k]);
          if (Math.abs(a - b) <= 0.5 * Math.pow(10, -d) + 1e-12)
            return "Строка " + (i + 1) + ": значение верное, но записано иначе: напечатано " + gn[k] + ", ожидается " + en[k] +
              (d ? " (" + d + " " + (d === 1 ? "знак" : d < 5 ? "знака" : "знаков") + " после точки, например f\"{x:." + d + "f}\")" : " (целое число)") + ".";
          return "Строка " + (i + 1) + ": неверное число: напечатано " + gn[k] + ", ожидается " + en[k] + ".";
        }
      }
      return "Строка " + (i + 1) + " отличается: напечатано «" + g[i] + "», ожидается «" + e[i] + "».";
    }
    return "Порядок строк отличается от требуемого.";
  }

  /* ---------- файлы для запуска ---------- */
  function depsOf(code, stdin) {
    var mods = {}, files = [], seen = {}, outRe = /open\(\s*["']([\w.-]+)["']\s*,\s*["'][wa]/g, outs = {}, m;
    function add(f) { if (!seen[f] && SITE_FILES.indexOf(f) >= 0) { seen[f] = 1; files.push(f); } }
    function scan(src) {
      var re = /^\s*(?:from\s+(\w+)\s+import|import\s+([\w, ]+))/gm;
      while ((m = re.exec(src))) (m[1] ? [m[1]] : m[2].split(",")).forEach(function (n) {
        n = n.trim().split(/\s+/)[0] + ".py";
        if (SITE_FILES.indexOf(n) >= 0 && !mods[n]) {
          mods[n] = 1; add(n);
          var tag = document.querySelector('script[data-pymod="' + n + '"]');
          if (tag) scan(tag.textContent);                               // модули курса тянут свои модули
        }
      });
    }
    scan(code);
    while ((m = outRe.exec(code))) outs[m[1]] = 1;
    var lit = /["']([\w.-]+\.(?:stl|gcode|3mf|obj|txt|csv))["']/g;
    while ((m = lit.exec(code))) if (!outs[m[1]]) add(m[1]);
    (stdin || "").split("\\n").forEach(function (s) { add(s.trim()); });
    return files;
  }
  function dlLink(f) { return '<a class="dl-link" href="' + root + "assets/files/" + f + '" download>' + f + "</a>"; }
  var pageRows = [];

  Array.prototype.forEach.call(document.querySelectorAll(".pyrun"), function (box) {
    var code = box.querySelector(".pyrun__code"), run = box.querySelector(".pyrun__run");
    var check = box.querySelector(".pyrun__check"), fileIn = box.querySelector(".pyrun__file-in");
    var reset = box.querySelector(".pyrun__reset"), out = box.querySelector(".pyrun__out");
    var status = box.querySelector(".pyrun__status"), verdict = box.querySelector(".pyrun__verdict");
    var expected = box.querySelector(".pyrun__expected"), files = box.querySelector(".pyrun__files");
    var testsRes = box.querySelector(".pyrun__tests-res"), testsTag = box.querySelector(".pyrun__tests");
    var spec = testsTag ? JSON.parse(testsTag.textContent) : null;
    var file = box.getAttribute("data-file") || "program.py", stdinText = (box.getAttribute("data-stdin") || "").split("\\n").join("\n");
    var initial = code.value, gutter = box.querySelector(".pyrun__gutter"), copyBtn = box.querySelector(".pyrun__copy");
    var hlPre = box.querySelector(".pyrun__hl"), editor = box.querySelector(".pyrun__editor"), grip = box.querySelector(".pyrun__grip");

    // файлы для запуска: строка под окном и строка таблицы в начале страницы
    var deps = depsOf(initial, box.getAttribute("data-stdin")), depsP = box.querySelector(".pyrun__deps");
    if (deps.length && depsP) { depsP.innerHTML = "Для запуска рядом с <code>" + file + "</code> нужны: " + deps.map(dlLink).join(", ") + "."; depsP.hidden = false; }
    pageRows.push([file, deps, box.closest(".task, .final-task, .capstone")]);

    // размер поля — ровно по тексту: высота по числу строк, ширина по самой длинной строке, но не уже окна.
    // Слой подсветки получает тот же размер, поэтому окно прокручивается, только если строка длиннее окна
    // (раньше слой был на 2 px выше поля и сохранял ширину, посчитанную до раскладки страницы, и браузер
    // показывал полосы прокрутки без надобности).
    // Ширина берется по слою подсветки: scrollWidth у textarea не включает правый отступ, у pre включает,
    // и по одной textarea конец длинной строки уходил под отступ, а слой подсветки получал свою полосу прокрутки.
    function fit() {                      // высота по тексту (без вертикальной прокрутки), подсветка и номера строк
      code.style.height = "auto"; code.style.width = "100%";
      if (hlPre) { hlPre.innerHTML = highlight(code.value) + "\n"; hlPre.style.width = "100%"; hlPre.style.height = "auto"; }
      var padR = parseFloat(getComputedStyle(code).paddingRight) || 0;
      var w = Math.max(code.scrollWidth, hlPre ? hlPre.scrollWidth : 0), h = code.scrollHeight, wide = w - padR > code.clientWidth;   // полоса — только если не помещается сам текст
      code.style.width = wide ? w + "px" : "100%";   // без длинных строк ширина в процентах: окно меняет ширину — поле тоже
      code.style.height = h + "px";
      if (hlPre) { hlPre.style.height = h + "px"; hlPre.style.width = wide ? w + "px" : "100%"; }
      if (gutter) { var n = code.value.split("\n").length, g = []; for (var i = 1; i <= n; i++) g.push(i); gutter.textContent = g.join("\n"); }
    }
    fit(); code.addEventListener("input", fit);
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);   // моноширинный шрифт загрузился — размеры пересчитываются
    if (grip && editor) {                 // ручка изменения высоты окна кода (мышью и пальцем)
      grip.addEventListener("pointerdown", function (e) {
        e.preventDefault(); grip.setPointerCapture(e.pointerId);
        var startY = e.clientY, startH = editor.getBoundingClientRect().height, minH = Math.min(startH, 6 * 24);
        function move(ev) { editor.style.height = Math.max(minH, startH + ev.clientY - startY) + "px"; editor.style.overflow = "auto"; }
        function up() { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); }
        grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
      });
    }
    if (copyBtn) copyBtn.addEventListener("click", function () { copyText(code.value, copyBtn); });
    function clearOut() {
      out.textContent = ""; verdict.textContent = ""; verdict.className = "pyrun__verdict";
      if (testsRes) testsRes.innerHTML = "";
      if (files) files.innerHTML = "";
    }
    if (reset) reset.addEventListener("click", function () {   // исходный код, исходный размер и пустой вывод
      code.value = initial; if (editor) { editor.style.height = ""; editor.style.overflow = ""; }
      var sc = box.querySelector(".pyrun__scroll"); if (sc) { sc.scrollLeft = 0; sc.scrollTop = 0; }
      fit(); clearOut();
      status.textContent = "Исходный код восстановлен.";
    });
    if (fileIn) fileIn.addEventListener("change", function () {
      var f = fileIn.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        code.value = String(r.result).replace(/\r\n/g, "\n"); fit(); clearOut();
        status.textContent = "Загружен файл " + f.name + (f.name === file ? "." : " (окно рассчитано на " + file + ").");
      };
      r.readAsText(f, "utf-8");
      fileIn.value = "";
    });
    code.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var st = code.selectionStart; code.setRangeText("    ", st, code.selectionEnd, "end"); }
    });

    function withPy(btn, job) {
      run.disabled = true; if (check) check.disabled = true; clearOut();
      getPy(status).then(function (py) {
        status.textContent = "Python готов (Pyodide " + VERSION + ").";
        try { job(py); } finally { run.disabled = false; if (check) check.disabled = false; }
      }, function (e) {
        status.textContent = "Python не загрузился: " + (e.message || e) + ". Запустите программу на своем компьютере.";
        run.disabled = false; if (check) check.disabled = false;
      });
    }

    run.addEventListener("click", function () {
      withPy(run, function (py) {
        var r = execute(py, code.value, file, {}, stdinText);
        var text = r.out + (r.err ? (r.out ? "\n" : "") + r.err : "");
        out.textContent = text || "(программа ничего не вывела)";
        if (expected) {
          var hint = r.err ? "программа завершилась с ошибкой" : compare(r.out, expected.textContent, spec && spec.order, spec && spec.prefix);
          if (!hint) { verdict.textContent = "Вывод совпадает с требуемым."; verdict.classList.add("pyrun__verdict--ok"); }
          else { verdict.textContent = "Вывод отличается от требуемого: " + hint.charAt(0).toLowerCase() + hint.slice(1); verdict.classList.add("pyrun__verdict--bad"); }
        }
        showFiles(py);
      });
    });

    if (check) check.addEventListener("click", function () {
      withPy(check, function (py) {
        var ok = 0;
        spec.tests.forEach(function (t, i) {
          var r = execute(py, code.value, file, t, stdinText);
          var hint = r.err || compare(r.out, t.output, spec.order, spec.prefix);
          if (!hint) ok++;
          var d = document.createElement("div"); d.className = "pyrun__test pyrun__test--" + (hint ? "bad" : "ok");
          var h = document.createElement("div");
          h.innerHTML = "<b>Тест " + (i + 1) + "</b>" + (t.note ? ": " + t.note : "") + " — ";
          var v = document.createElement("span"); v.className = hint ? "pyrun__test-bad" : "pyrun__test-ok"; v.textContent = hint ? "неверно" : "верно";
          h.appendChild(v); d.appendChild(h);
          if (hint) {
            var p = document.createElement("p"); p.className = "pyrun__hint"; p.textContent = hint; d.appendChild(p);
            var det = document.createElement("details"), sm = document.createElement("summary");
            sm.textContent = "Вывод программы и ожидаемый вывод"; det.appendChild(sm);
            var p1 = document.createElement("pre"); p1.textContent = "напечатано:\n" + (r.out || "(ничего)"); det.appendChild(p1);
            var p2 = document.createElement("pre"); p2.textContent = "ожидается:\n" + t.output; det.appendChild(p2);
            d.appendChild(det);
          }
          testsRes.appendChild(d);
        });
        restore(py);
        out.textContent = "Пройдено тестов: " + ok + " из " + spec.tests.length + ".";
        verdict.textContent = ok === spec.tests.length ? "Все тесты пройдены." : "Есть непройденные тесты: подсказки ниже.";
        verdict.classList.add(ok === spec.tests.length ? "pyrun__verdict--ok" : "pyrun__verdict--bad");
        if (ok === spec.tests.length) box.dispatchEvent(new CustomEvent("add3d:part", {bubbles: true}));   // прогресс (settings.js)
      });
    });

    function showFiles(py) {
      if (!files) return;
      files.innerHTML = "";
      var created = listFiles(py).filter(function (f) {              // файлы, записанные за последний запуск
        if (MODULES.indexOf(f) >= 0) return false;
        return py.FS.stat(HOME + "/" + f).mtime.getTime() > 0;
      });
      if (!created.length) return;
      var title = document.createElement("div"); title.className = "pyrun__files-title"; title.textContent = "Файлы, записанные программой:"; files.appendChild(title);
      created.forEach(function (f) {                                    // файлы столбиком: имя и кнопка в каждой строке
        var data = py.FS.readFile(HOME + "/" + f);
        var row = document.createElement("div"); row.className = "pyrun__file";
        var nm = document.createElement("code"); nm.textContent = f; row.appendChild(nm);
        var isG = /\.gcode$/.test(f) && window.gvLoadText;
        var b = document.createElement("button"); b.type = "button"; b.className = "tool-btn"; b.textContent = isG ? "В просмотрщик" : "Скачать";
        b.addEventListener("click", function () {
          if (isG) { window.gvLoadText(new TextDecoder().decode(data)); document.getElementById("gv").scrollIntoView({behavior: "smooth"}); }
          else {                                                        // двоичные файлы (.stl) скачиваются байтами
            var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type: "application/octet-stream"})); a.download = f; a.click();
          }
        });
        row.appendChild(b); files.appendChild(row);
      });
    }
  });

  /* ---------- блок «Файлы для этой страницы» после цели работы ---------- */
  (function () {
    var rows = pageRows.filter(function (r) { return r[2] && r[1].length; });
    var main = document.querySelector("main");
    if (!rows.length || !main) return;
    var all = [];
    rows.forEach(function (r) { r[1].forEach(function (f) { if (all.indexOf(f) < 0) all.push(f); }); });
    var box = document.createElement("section"); box.className = "page-files";
    var html = '<p class="page-files__title">Файлы для этой страницы</p><p>Скачайте в рабочую папку: ' + all.map(dlLink).join(", ") +
      ".</p><p>Каждая программа запускается, только если рядом с ней лежат файлы из таблицы. Модули курса не меняйте: функции, которые вы пишете, остаются в файле задания.</p>" +
      '<div class="table-scroll"><table><thead><tr><th>Программа</th><th>Что положить рядом</th></tr></thead><tbody>';
    rows.forEach(function (r) { html += "<tr><td><code>" + r[0] + "</code></td><td>" + r[1].map(dlLink).join(", ") + "</td></tr>"; });
    box.innerHTML = html + "</tbody></table></div>";
    var anchor = main.querySelector(":scope > .callout") || main.querySelector(":scope > .goal");
    if (anchor) anchor.parentNode.insertBefore(box, anchor.nextSibling); else main.insertBefore(box, main.firstChild);
  })();
})();
