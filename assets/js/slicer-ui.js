/* slicer-ui.js — страница учебного слайсера (разметка: _includes/slicer.html).
   Нужны clipper.js, slicer-core.js и, для показа результата, просмотрщик
   (gcode-core.js, gcode-viewer.js публикует window.gvLoadText). */
(function () {
  "use strict";
  var root = document.getElementById("sl"); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var tris = null, name = "", gcode = "";
  var status = $("sl-status");
  function setModel(buf, n) {
    try {
      tris = SlicerCore.parseSTL(buf); name = n.replace(/\.stl$/i, "");
      var b = SlicerCore.bounds(tris);
      status.textContent = "Модель " + n + ": " + tris.length + " треугольников, габариты " + (b.maxX - b.minX).toFixed(1) + " × " + (b.maxY - b.minY).toFixed(1) + " × " + (b.maxZ - b.minZ).toFixed(1) + " мм.";
      $("sl-run").classList.remove("tool-btn--off");
    } catch (e) { status.textContent = "Не удалось прочитать STL: " + e; }
  }
  $("sl-file").addEventListener("change", function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { setModel(r.result, f.name); }; r.readAsArrayBuffer(f); ev.target.value = "";
  });
  $("sl-sample").addEventListener("click", function () {
    var b64 = root.getAttribute("data-sample-b64");
    if (b64) {                                     // модель вшита в страницу: работает и с диска
      var bin = atob(b64), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      setModel(arr.buffer, "t_bracket.stl"); return;
    }
    var url = root.getAttribute("data-sample");
    status.textContent = "Загрузка модели…";
    fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (b) { setModel(b, "t_bracket.stl"); },
      function () { status.textContent = "Модель не загрузилась: откройте страницу с сайта или выберите файл STL вручную."; });
  });
  ["sl-h", "sl-w", "sl-p", "sl-inf", "sl-solid"].forEach(function (id) {
    var el = $(id), out = $(id + "-v");
    var show = function () { out.textContent = id === "sl-inf" ? el.value + " %" : el.value; };
    el.addEventListener("input", show); show();
  });
  $("sl-run").addEventListener("click", function () {
    if (!tris) { status.textContent = "Сначала загрузите модель: кнопкой «Кронштейн t_bracket.stl» или свой файл STL."; return; }
    var opt = {H: +$("sl-h").value, W: +$("sl-w").value, perimeters: +$("sl-p").value, infill: +$("sl-inf").value / 100, solidLayers: +$("sl-solid").value, name: name};
    status.textContent = "Нарезка…";
    var t0 = performance.now(), r;
    try { r = SlicerCore.slice(tris, opt); } catch (e) { status.textContent = "Ошибка нарезки: " + (e.message || e); return; }
    status.textContent = "Модель " + name + ".stl нарезана: " + r.nLayers + " слоев.";
    gcode = r.gcode;
    var M = parseGcode(gcode), mass = M.eSum * Math.PI * Math.pow(1.75 / 2, 2) / 1000 * 1.24;
    $("sl-result").innerHTML = "";
    [["Слоев", r.nLayers], ["Строк G-кода", gcode.split("\n").length], ["Нить E, мм", M.eSum.toFixed(1)], ["Масса PLA, г", mass.toFixed(2)], ["Путь печати, м", (M.extLen / 1000).toFixed(2)], ["Холостые, м", (M.travLen / 1000).toFixed(2)], ["Время нарезки, с", ((performance.now() - t0) / 1000).toFixed(2)]].forEach(function (kv) {
      var d = document.createElement("div"); d.className = "gv__stat";
      d.innerHTML = "<span class=\"gv__stat-k\"></span><span class=\"gv__stat-v\"></span>";
      d.firstChild.textContent = kv[0]; d.lastChild.textContent = kv[1]; $("sl-result").appendChild(d);
    });
    $("sl-out").hidden = false;
    var fname = name + "_" + Math.round(opt.infill * 100) + ".gcode";
    $("sl-dl").textContent = "Скачать " + fname;
    $("sl-dl").onclick = function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([gcode], {type: "text/plain"})); a.download = fname; a.click(); };
    $("sl-view").onclick = function () { if (window.gvLoadText) { window.gvLoadText(gcode); $("gv").scrollIntoView({behavior: "smooth"}); } };
  });
})();
