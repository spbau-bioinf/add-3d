/* ==========================================================================
   stl-check.js — страница «Проверка STL» (практика 4): габариты, объем и
   замкнутость сетки студента против эталона с допуском.
   Чтение файла и подсчеты — MeshCore (mesh-core.js). Эталоны и допуски — REFS.
   ========================================================================== */
var StlCheck = (function () {
  "use strict";

  var TOL_D = 0.2;   // допуск по каждому габариту, мм
  // dims — габариты эталона по возрастанию, мм; vol — объем, мм³ (null: эталон еще не снят); tolV — допуск по объему, доля
  var REFS = {
    stand: {title: "Подставка", dims: [34.01, 43.14, 76.46], vol: 19293.5, tolV: 0.02,
      dimHint: "Габарит 34,01 задают расстояние выдавливания и шаг массива, два других — длины и углы отрезков профиля и радиус скругления (task 4-2, task 4-3).",
      more: "Материала больше, чем в эталоне: проверьте толщину стенки (3 и 6) и число ребер (15).",
      less: "Материала меньше, чем в эталоне: нет части ребер или вместо ребер вырезаны пазы (task 4-3, разделы 2 и 3)."},
    cage: {title: "Кейдж", dims: [7.88, 9, 22], vol: 851.7, tolV: 0.01,
      dimHint: "Длину 22 и высоту 7,88 задает профиль клина со скругленным носом, ширину 9 — расстояние выдавливания (task 4-6).",
      more: "Материала больше, чем в эталоне: нет окна, ряда зубцов или отверстия (task 4-8, раздел 3).",
      less: "Материала меньше, чем в эталоне: лишний вырез или отверстие вышло в окно (task 4-7, раздел 4)."}
  };

  function fmt(x, d) { return x.toFixed(d).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }

  // a — результат MeshCore.analyze; возвращает габариты, объем и строки заключения {ok, text}
  function evaluate(a, ref) {
    var dims = [0, 1, 2].map(function (k) { return a.hi[k] - a.lo[k]; }).sort(function (x, y) { return x - y; });
    var vol = Math.abs(a.volume), rows = [];
    var open = a.boundary.length + a.singular.length;
    rows.push(open === 0
      ? {ok: true, text: "Сетка замкнута: у каждого ребра две грани."}
      : {ok: false, text: "Сетка не замкнута: ребер не с двумя гранями — " + open + ". Объем такой сетки считается неверно. Повторите экспорт: «Добавить все тела», формат STL."});
    var dimOk = dims.every(function (d, k) { return Math.abs(d - ref.dims[k]) <= TOL_D; });
    var twice = dims.every(function (d, k) { return Math.abs(d / ref.dims[k] - 2) <= 0.03; });
    rows.push(dimOk
      ? {ok: true, text: "Габариты в допуске ±" + fmt(TOL_D, 1) + " мм."}
      : {ok: false, text: "Габариты не в допуске: эталон " + ref.dims.map(function (d) { return fmt(d, 2); }).join(" × ") + " мм. " +
          (twice ? "Модель ровно вдвое больше эталона: в CAD она строится в реальном размере, масштаб задается в слайсере." : ref.dimHint)});
    if (ref.vol === null) {
      rows.push({ok: null, text: "Объем эталона для этой детали уточняется: пока сверяются только габариты и замкнутость."});
    } else {
      var dev = (vol - ref.vol) / ref.vol, sign = Math.abs(dev) < 5e-5 ? "" : dev > 0 ? "+" : "−";
      var head = "эталон " + fmt(ref.vol, 1) + " мм³, отклонение " + sign + fmt(Math.abs(dev) * 100, 2) + " %, допуск ±" + fmt(ref.tolV * 100, 0) + " %.";
      rows.push(Math.abs(dev) <= ref.tolV
        ? {ok: true, text: "Объем в допуске: " + head}
        : {ok: false, text: "Объем не в допуске: " + head + " " + (dev > 0 ? ref.more : ref.less)});
    }
    return {dims: dims, vol: vol, faces: a.F, rows: rows,
      passed: rows.every(function (r) { return r.ok !== false; }) && ref.vol !== null};
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () {
    var box = document.getElementById("sc"); if (!box) return;
    var $ = function (id) { return document.getElementById(id); }, last = null;
    function part() { return box.querySelector("input[name=sc-part]:checked").value; }
    function stat(k, v) { return '<div class="gv__stat"><span class="gv__stat-k">' + k + '</span><span class="gv__stat-v">' + v + "</span></div>"; }
    function show() {
      if (!last) return;
      var ref = REFS[part()], r = evaluate(last.a, ref);
      $("sc-stats").innerHTML =
        stat("Габариты, мм", r.dims.map(function (d) { return fmt(d, 2); }).join(" × ")) +
        stat("Объем, мм³", fmt(r.vol, 1)) + stat("Граней", fmt(r.faces, 0)) +
        stat("Файл", last.binary ? "двоичный STL" : "текстовый STL");
      var notes = r.rows.filter(function (x) { return x.ok === null; }).map(function (x) { return x.text; });
      $("sc-warns").innerHTML = r.rows.filter(function (x) { return x.ok !== null; })
        .map(function (x) { return "<li" + (x.ok ? ' class="gv__ok"' : "") + ">" + x.text + "</li>"; }).join("");
      $("sc-line").textContent = ref.title + ", файл " + last.name + ": " +
        (r.passed ? "модель совпадает с эталоном в пределах допуска." :
          notes.length && r.rows.every(function (x) { return x.ok !== false; }) ? notes.join(" ") : "есть расхождения с эталоном, смотрите строки выше.");
    }
    $("sc-file").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      f.arrayBuffer().then(function (buf) {
        var p = MeshCore.parseSTL(buf);
        if (!p.tris.length) { last = null; $("sc-stats").innerHTML = ""; $("sc-warns").innerHTML = ""; $("sc-line").textContent = "В файле " + f.name + " не найдено ни одной грани: это не файл STL."; return; }
        last = {a: MeshCore.analyze(MeshCore.index(p.tris)), binary: p.binary, name: f.name};
        show();
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll("input[name=sc-part]"), function (r) { r.addEventListener("change", show); });
    var want = location.hash.slice(1);   // ссылка stl-check.html#cage сразу выбирает деталь
    if (REFS[want]) box.querySelector("input[value=" + want + "]").checked = true;
  });

  return {evaluate: evaluate, REFS: REFS};
})();
if (typeof module !== "undefined") module.exports = StlCheck;
