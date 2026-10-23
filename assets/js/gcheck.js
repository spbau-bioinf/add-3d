/* gcheck.js — проверка своего файла G-кода по таблице «Проверьте себя».
   В блоке .check с таблицей «Показатель | Значение | …», где есть строки G-кода
   (Слоев, Нить E, мм, E на 1 мм пути, Путь печати, м, Холостые, м, Высота слоя, мм, Масса, г,
   Предупреждения), появляется кнопка «Проверить файл …»: файл разбирается тем же parseGcode,
   что и просмотрщик (assets/js/gcode-core.js, подгружается при необходимости), и каждое число
   сравнивается со значением таблицы при той же точности записи. Строки таблицы, которые
   скрипт не считает (например, «Линий в слое (по картинке)»), проверяются по просмотрщику. */
(function () {
  "use strict";
  var root = ((document.querySelector('script[src$="assets/js/gcheck.js"]') || {}).src || "").replace(/assets\/js\/gcheck\.js.*$/, "");
  var KEYS = {
    "Слоев": function (M) { return M.zs.length; },
    "Нить E, мм": function (M) { return M.eSum; },
    "E на 1 мм пути": function (M) { return M.medEperMM; },
    "Путь печати, м": function (M) { return M.extLen / 1000; },
    "Холостые, м": function (M) { return M.travLen / 1000; },
    "Высота слоя, мм": function (M) { return M.hLayer; },
    "Масса, г": function (M) { return M.eSum * Math.PI * 0.875 * 0.875 / 1000 * 1.24; }
  };
  function core() {
    if (window.parseGcode) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement("script"); s.src = root + "assets/js/gcode-core.js";
      s.onload = ok; s.onerror = bad; document.head.appendChild(s);
    });
  }
  function dec(v) { var m = /[.,](\d+)/.exec(v); return m ? m[1].length : 0; }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function fmt(x, d) { return x.toFixed(d).replace(".", ","); }

  Array.prototype.forEach.call(document.querySelectorAll(".check"), function (box) {
    var table = box.querySelector("table"); if (!table) return;
    var head = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
    if (head[0] !== "Показатель" || head[1] !== "Значение") return;
    var rows = Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (tr) {
      return [tr.cells[0].textContent.trim(), tr.cells[1].textContent.trim(), tr.cells[2] ? tr.cells[2].textContent.trim() : ""];
    });
    if (!rows.some(function (r) { return KEYS[r[0]]; })) return;           // таблица не про G-код
    var task = box.closest(".task, .final-task, .section, .subsection");
    var names = task ? Array.prototype.map.call(task.querySelectorAll(".task__file"), function (s) { return s.textContent.trim(); })
      .filter(function (n) { return /\.gcode$/.test(n); }) : [];
    if (!names.length && task) {                                       // файл назван в тексте: последний `….gcode` перед блоком
      Array.prototype.forEach.call(task.querySelectorAll("code"), function (c) {
        if (/^[\w.-]+\.gcode$/.test(c.textContent.trim()) && (c.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)) names.push(c.textContent.trim());
      });
    }
    var name = names.length ? names[names.length - 1] : "G-кода";
    var bar = document.createElement("div"); bar.className = "gcheck";
    bar.innerHTML = '<label class="tool-btn tool-btn--main">Проверить файл ' + name + '<input type="file" accept=".gcode,.gco,.g,.txt"></label>' +
      '<span class="gcheck__note">Файл разбирается в браузере и никуда не отправляется.</span><div class="gcheck__res" aria-live="polite"></div>';
    box.appendChild(bar);
    var input = bar.querySelector("input"), res = bar.querySelector(".gcheck__res");
    input.addEventListener("change", function () {
      var f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        core().then(function () {
          var M = window.parseGcode(String(r.result)), bad = [], skipped = [];
          rows.forEach(function (row) {
            var k = row[0], want = row[1];
            if (k === "Предупреждения") {
              var got = M.warnings.length ? M.warnings.map(function (w) { return w.msg; }).join("; ") : "нет";
              if ((want === "нет") !== (got === "нет")) bad.push([k, want, got, row[2]]);
            } else if (KEYS[k]) {
              var d = dec(want), v = fmt(KEYS[k](M), d);
              if (v !== want) bad.push([k, want, v, row[2]]);
            } else skipped.push(k);
          });
          var html = "<span class=\"gcheck__" + (bad.length ? "bad\">Есть расхождения" : "ok\">Все числа таблицы совпали") + "</span> (файл " + esc(f.name) + ").";
          if (bad.length) html += "<ul>" + bad.map(function (b) {
            return "<li>" + esc(b[0]) + ": в файле " + esc(b[2]) + ", ожидается " + b[1] + (b[3] ? ". Возможная причина: " + b[3] : "") + "</li>";
          }).join("") + "</ul>";
          if (skipped.length) html += " Проверьте по просмотрщику: " + skipped.join(", ") + ".";
          res.innerHTML = html;
          if (!bad.length) bar.dispatchEvent(new CustomEvent("add3d:part", {bubbles: true}));   // прогресс (settings.js)
        }, function () { res.textContent = "Не удалось загрузить разбор G-кода: откройте файл в просмотрщике."; });
      };
      r.readAsText(f);
      input.value = "";
    });
  });
})();
