/* pyrun.js — запуск Python прямо на странице.
   Код выполняется настоящим CPython (Pyodide) в браузере: интерпретатор
   загружается с cdn.jsdelivr.net при первом нажатии «Запустить» и общий
   для всех окон страницы. Перед запуском в виртуальную файловую систему
   кладутся gen.py и stats.py из assets/files, поэтому import из них работает.
   Файлы, которые программа записала (например, .gcode), перечисляются под
   окном; кнопка «В просмотрщик» открывает их во встроенном просмотрщике,
   если он есть на странице (gcode-viewer.js публикует window.gvLoadText).
   Исходники модулей берутся из тегов <script type="text/plain" data-pymod="…"> на странице
   (их вставляет _includes/pyrun-modules.html), а если их нет — загружаются из assets/files.
   Разметка: <div class="pyrun" data-file="имя.py" data-stdin="строки ввода">
               <textarea class="pyrun__code">…</textarea> … <pre class="pyrun__expected">…</pre> */
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
  var root = (document.querySelector('script[src$="assets/js/pyrun.js"]') || {}).src || "";
  root = root.replace(/assets\/js\/pyrun\.js.*$/, "");
  var MODULES = ["gen.py", "stats.py"];
  var pyPromise = null;

  function getPy(status) {
    if (pyPromise) return pyPromise;
    status.textContent = "Загрузка Python (около 10 МБ, один раз на страницу)…";
    pyPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = INDEX_URL + "pyodide.js";
      s.onload = function () {
        loadPyodide({indexURL: INDEX_URL}).then(function (py) {
          var HOME = "/home/pyodide";
          try { py.FS.chdir(HOME); } catch (e) { /* каталог уже текущий */ }
          py.runPython("import sys\nif '" + HOME + "' not in sys.path: sys.path.insert(0, '" + HOME + "')");
          return Promise.all(MODULES.map(function (m) {
            var tag = document.querySelector('script[data-pymod="' + m + '"]');   // исходник вшит в страницу
            var src = tag ? Promise.resolve(tag.textContent) : fetch(root + "assets/files/" + m).then(function (r) { return r.ok ? r.text() : ""; }, function () { return ""; });
            return src.then(function (t) { if (t) py.FS.writeFile(HOME + "/" + m, t.trim() + "\n"); });
          })).then(function () {
            try { py.runPython("import runpy; runpy.run_path('gen.py', run_name='__main__')"); } catch (e) { /* square.gcode и scaffold.gcode не созданы */ }
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

  function listFiles(py) {
    try { return py.FS.readdir("/home/pyodide").filter(function (f) { return f !== "." && f !== ".."; }); } catch (e) { return []; }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".pyrun"), function (box) {
    var code = box.querySelector(".pyrun__code"), run = box.querySelector(".pyrun__run");
    var reset = box.querySelector(".pyrun__reset"), out = box.querySelector(".pyrun__out");
    var status = box.querySelector(".pyrun__status"), verdict = box.querySelector(".pyrun__verdict");
    var expected = box.querySelector(".pyrun__expected"), files = box.querySelector(".pyrun__files");
    var initial = code.value, gutter = box.querySelector(".pyrun__gutter"), copyBtn = box.querySelector(".pyrun__copy");
    var hlPre = box.querySelector(".pyrun__hl"), editor = box.querySelector(".pyrun__editor"), grip = box.querySelector(".pyrun__grip");
    function fit() {                      // высота по тексту (без вертикальной прокрутки), подсветка и номера строк
      code.style.height = "auto"; code.style.height = (code.scrollHeight + 2) + "px";
      if (hlPre) { hlPre.innerHTML = highlight(code.value) + "\n"; hlPre.style.height = (code.scrollHeight + 2) + "px"; hlPre.style.width = Math.max(code.scrollWidth, code.clientWidth) + "px"; }
      if (gutter) { var n = code.value.split("\n").length, g = []; for (var i = 1; i <= n; i++) g.push(i); gutter.textContent = g.join("\n"); }
    }
    fit(); code.addEventListener("input", fit);
    window.addEventListener("resize", fit);
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
    if (reset) reset.addEventListener("click", function () {   // исходный код, исходный размер и пустой вывод
      code.value = initial; if (editor) { editor.style.height = ""; editor.style.overflow = ""; }
      var sc = box.querySelector(".pyrun__scroll"); if (sc) { sc.scrollLeft = 0; sc.scrollTop = 0; }
      fit(); out.textContent = ""; verdict.textContent = ""; verdict.className = "pyrun__verdict";
      if (files) files.innerHTML = "";
    });
    code.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var st = code.selectionStart; code.setRangeText("    ", st, code.selectionEnd, "end"); }
    });
    run.addEventListener("click", function () {
      run.disabled = true; verdict.textContent = ""; verdict.className = "pyrun__verdict"; out.textContent = "";
      getPy(status).then(function (py) {
        status.textContent = "Python готов (Pyodide " + VERSION + ").";
        var before = listFiles(py), buf = [];
        py.setStdout({batched: function (line) { buf.push(line); }});
        py.setStderr({batched: function (line) { buf.push(line); }});
        var stdin = (box.getAttribute("data-stdin") || "").split("\\n"), si = 0;
        py.setStdin({stdin: function () { return si < stdin.length ? stdin[si++] : null; }});
        try { py.runPython(code.value); }
        catch (e) { buf.push(String(e.message || e).trim().split("\n").slice(-3).join("\n")); }
        var text = buf.join("\n");
        out.textContent = text || "(программа ничего не вывела)";
        if (expected) {
          var norm = function (t) { return t.replace(/[ \t]+$/gm, "").trim(); };
          if (norm(text) === norm(expected.textContent)) { verdict.textContent = "Вывод совпадает с требуемым."; verdict.classList.add("pyrun__verdict--ok"); }
          else { verdict.textContent = "Вывод отличается от требуемого: сравните с образцом ниже."; verdict.classList.add("pyrun__verdict--bad"); }
        }
        if (files) {
          files.innerHTML = "";
          var created = listFiles(py).filter(function (f) { return before.indexOf(f) < 0 || /\.gcode$/.test(f); });
          created = created.filter(function (f) { return MODULES.indexOf(f) < 0; });
          if (created.length) {                                        // файлы столбиком: имя и кнопка в каждой строке
            var title = document.createElement("div"); title.className = "pyrun__files-title"; title.textContent = "Файлы, записанные программой:"; files.appendChild(title);
            created.forEach(function (f) {
              var row = document.createElement("div"); row.className = "pyrun__file";
              var nm = document.createElement("code"); nm.textContent = f; row.appendChild(nm);
              var isG = /\.gcode$/.test(f) && window.gvLoadText;
              var b = document.createElement("button"); b.type = "button"; b.className = "tool-btn"; b.textContent = isG ? "В просмотрщик" : "Скачать";
              b.addEventListener("click", function () {
                var t = py.FS.readFile(f, {encoding: "utf8"});
                if (isG) { window.gvLoadText(t); document.getElementById("gv").scrollIntoView({behavior: "smooth"}); }
                else { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], {type: "text/plain"})); a.download = f; a.click(); }
              });
              row.appendChild(b); files.appendChild(row);
            });
          }
        }
        run.disabled = false;
      }, function (e) {
        status.textContent = "Python не загрузился: " + (e.message || e) + ". Запустите программу на своем компьютере.";
        run.disabled = false;
      });
    });
  });
})();
