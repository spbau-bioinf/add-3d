/* ==========================================================================
   mesh-viewer.js — просмотрщик сеток (разметка: _includes/mesh-viewer.html).
   Нужен mesh-core.js. Файл читается только в браузере.
   Вращение: перетаскивание; масштаб: колесо. Адрес вида mesh-viewer.html#holed
   сразу открывает готовую модель.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("mv");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var PRESETS = {
    finger: "Фаланга (исправная)", holed: "Дыры", flipped: "Перевернутые грани", two_cubes: "Два куба (общее ребро)",
    shells: "Мусор", ring: "Кольцо", bone_a: "bone_a", bone_b: "bone_b"
  };
  var ABOUT = {
    finger: "Исправная сетка фаланги пальца: замкнута, ориентирована согласованно, одна оболочка. " +
      "Это образец для сравнения: у каждого ребра ровно 2 грани, V − E + F = 2, все счетчики дефектов равны нулю. " +
      "Удалите или разверните грань и посмотрите, какие счетчики изменятся.",
    holed: "Та же фаланга, из которой удалены 7 граней: получились две дыры. Края дыр выделены красным: " +
      "у этих ребер только одна грань. Поверните модель, чтобы увидеть обе дыры.",
    flipped: "Та же фаланга, в которой у 5 соседних граней обратный порядок вершин: они смотрят внутрь. " +
      "Дыр нет, тест 2E = 3F выполнен, но соседи проходят 7 общих ребер в одну сторону, а объем занижен. " +
      "Перевернутые грани выделены янтарным.",
    two_cubes: "Два куба со стороной 10 мм, поставленные вплотную по одному ребру. Дыр нет, но к общему " +
      "вертикальному ребру примыкают 4 грани вместо 2: это сингулярное ребро, оно выделено темно-синим. " +
      "Сетка немногообразна, поэтому 2E ≠ 3F, и слайсер не может однозначно решить, где тело.",
    shells: "Фаланга с мусором: снаружи крошка-сфера, внутри кубик, плюс две вырожденные грани. " +
      "Все оболочки, кроме крупнейшей, выделены фиолетовым. Кубик скрыт внутри, его выдает только счетчик оболочек.",
    ring: "Исправное кольцо-тор: одна «ручка», поэтому V − E + F = 0. Габариты около 1,4 единицы: " +
      "модель экспортирована в дюймах, в миллиметрах это 36 мм.",
    bone_a: "Модель для итогового задания task 2-7 (миллиметры): найдите все ее дефекты.",
    bone_b: "Модель для итогового задания task 2-7 (дюймы): найдите все ее дефекты."
  };
  var COL = {face: [124, 198, 144], flip: [239, 159, 39], shell: [127, 119, 221]};
  var cv = $("mv-canvas"), ctx = cv.getContext("2d");
  var M = null, orig = null, S = null, name = "", rx = -0.3, rz = Math.PI + 0.5, zoom = 1, ctr, span;

  function fmt(v, d) { return v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}); }

  function stat(label, value, bad) {
    return '<div class="gv__stat' + (bad ? " mv__stat--bad" : "") + '"><span class="gv__stat-k">' + label +
      '</span><span class="gv__stat-v">' + value + "</span></div>";
  }

  function update() {
    S = MeshCore.analyze(M);
    var dims = [0, 1, 2].map(function (k) { return fmt(S.hi[k] - S.lo[k], 2); }).join(" × ");
    $("mv-stats").innerHTML =
      stat("V, E, F", S.V + ", " + S.E + ", " + S.F) +
      stat("V − E + F", S.V - S.E + S.F) +
      stat("2E = 3F", 2 * S.E === 3 * S.F ? "да" : "нет", 2 * S.E !== 3 * S.F) +
      stat("Краевых ребер", S.boundary.length, S.boundary.length > 0) +
      stat("Сингулярных ребер", S.singular.length, S.singular.length > 0) +
      stat("Ребер с одним направлением", S.sameDir, S.sameDir > 0) +
      stat("Оболочек", S.shells, S.shells > 1) +
      stat("Вырожденных граней", S.degenerate, S.degenerate > 0) +
      stat("Объем со знаком", fmt(S.volume, 2)) +
      stat("Габариты", dims);
    render();
  }

  // Проекция: экранные x, y в пикселях холста и глубина z (больше = дальше от зрителя).
  function proj(p, W, H) {
    var x = p[0] - ctr[0], y = p[1] - ctr[1], z = p[2] - ctr[2];
    var x1 = x * Math.cos(rz) - y * Math.sin(rz), y1 = x * Math.sin(rz) + y * Math.cos(rz);
    var y2 = y1 * Math.cos(rx) - z * Math.sin(rx), z2 = y1 * Math.sin(rx) + z * Math.cos(rx);
    var sc = Math.min(W, H) / span * 0.92 * zoom;
    return [W / 2 + x1 * sc, H / 2 - z2 * sc, y2 * sc];
  }

  var idbuf = null, bufW = 0;

  // Растеризация с буфером глубины: грани не перекрывают друг друга неправильно,
  // даже если они крупные (как у кубов). idbuf хранит номер грани в каждом пикселе для выбора щелчком.
  function render() {
    if (!M) return;
    var dpr = window.devicePixelRatio || 1;
    var W = Math.max(1, Math.round(cv.clientWidth * dpr)), H = Math.max(1, Math.round(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    var img = ctx.createImageData(W, H), px = img.data;
    var zb = new Float32Array(W * H).fill(Infinity);
    idbuf = new Int32Array(W * H).fill(-1); bufW = W;
    var P = M.V.map(function (v) { return proj(v, W, H); });
    M.F.forEach(function (f, fi) {
      var a = P[f[0]], b = P[f[1]], c = P[f[2]];
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var l = 0.55 + 0.45 * Math.abs(nz) / (Math.hypot(nx, ny, nz) || 1);
      var base = S.flip[fi] ? COL.flip : (S.shellOf[fi] > 0 ? COL.shell : COL.face);
      var r = base[0] * l, g = base[1] * l, bl = base[2] * l;
      var x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      var y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      var den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-9) return;
      var la = Math.hypot(b[0] - c[0], b[1] - c[1]), lb = Math.hypot(c[0] - a[0], c[1] - a[1]), lc = Math.hypot(a[0] - b[0], a[1] - b[1]);
      var ad = Math.abs(den), lw = 0.7 * dpr;
      for (var y = y0; y <= y1; y++) {
        for (var x = x0; x <= x1; x++) {
          var X = x + 0.5, Y = y + 0.5;
          var w0 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / den;
          var w1 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / den;
          var w2 = 1 - w0 - w1;
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
          var z = w0 * a[2] + w1 * b[2] + w2 * c[2], k = y * W + x;
          if (z >= zb[k]) continue;
          zb[k] = z; idbuf[k] = fi;
          var e = (w0 * ad / la < lw || w1 * ad / lb < lw || w2 * ad / lc < lw) ? 0.85 : 1;   // линии ребер толщиной около 1 px
          px[4 * k] = r * e; px[4 * k + 1] = g * e; px[4 * k + 2] = bl * e; px[4 * k + 3] = 255;
        }
      }
    });
    // ребра с дефектами: рисуются там, где их не закрывает поверхность
    function edges(list, rgb, w) {
      var half = Math.max(1, Math.round(w * dpr / 2)), tol = span * 0.02 * Math.min(W, H) / span;
      list.forEach(function (e) {
        var q = e.split("_"), A = P[+q[0]], B = P[+q[1]];
        var n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])) + 1;
        for (var i = 0; i <= n; i++) {
          var t = i / n, x = Math.round(A[0] + (B[0] - A[0]) * t), y = Math.round(A[1] + (B[1] - A[1]) * t), z = A[2] + (B[2] - A[2]) * t;
          if (x < 0 || y < 0 || x >= W || y >= H || z > zb[y * W + x] + tol) continue;
          for (var dy = -half; dy <= half; dy++) for (var dx = -half; dx <= half; dx++) {
            var xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            var k = yy * W + xx;
            px[4 * k] = rgb[0]; px[4 * k + 1] = rgb[1]; px[4 * k + 2] = rgb[2]; px[4 * k + 3] = 255;
          }
        }
      });
    }
    edges(S.boundary, [180, 47, 47], 3);
    edges(S.singular, [31, 59, 115], 4);
    ctx.putImageData(img, 0, 0);
  }

  function setMesh(tris, label) {
    if (!tris.length) { $("mv-line").textContent = "В файле не найдено ни одной грани."; return; }
    orig = MeshCore.index(tris);
    name = label;
    reset();
    $("mv-empty").style.display = "none";
  }

  function reset() {
    M = {V: orig.V, F: orig.F.map(function (f) { return f.slice(); })};
    var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    M.V.forEach(function (v) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } });
    ctr = [0, 1, 2].map(function (k) { return (lo[k] + hi[k]) / 2; });
    span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
    zoom = 1;
    $("mv-line").textContent = "Модель: " + name;
    update();
  }

  function about(key) {
    $("mv-about").textContent = ABOUT[key] || "";
    $("mv-about").hidden = !ABOUT[key];
    bar.querySelectorAll("button[data-key]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-key") === key);
    });
  }

  // начальный поворот: по умолчанию фаланга повернута дефектами к зрителю,
  // два куба видны со стороны пустого угла, чтобы общее ребро было открыто
  var VIEW = {two_cubes: [0.4, -Math.PI / 4 + 0.2]};

  function loadPreset(key) {
    var v = VIEW[key] || [-0.3, Math.PI + 0.5];
    rx = v[0]; rz = v[1];
    if (window.MV_FILES && window.MV_FILES[key]) {          // встроенные модели (автономная версия страниц)
      var bin = atob(window.MV_FILES[key]), buf = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      setMesh(MeshCore.parseSTL(buf.buffer).tris, key + ".stl");
      about(key);
      return;
    }
    var base = root.getAttribute("data-root");
    fetch(base + "assets/files/" + key + ".stl").then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
      .then(function (buf) { setMesh(MeshCore.parseSTL(buf).tris, key + ".stl"); about(key); })
      .catch(function () {
        // страница открыта с диска: браузер не дает читать файлы, берем встроенные модели (подгружаются один раз)
        if (window.MV_FILES) { $("mv-line").textContent = "Модель не найдена: " + key + ".stl"; return; }
        var s = document.createElement("script");
        s.src = base + "assets/js/mesh-files.js";
        s.onload = function () { if (window.MV_FILES && window.MV_FILES[key]) loadPreset(key); };
        s.onerror = function () {
          $("mv-line").textContent = "Модель не загрузилась. Скачайте " + key + ".stl и откройте его кнопкой «Открыть STL…».";
        };
        document.head.appendChild(s);
      });
  }

  var bar = $("mv-presets");
  root.getAttribute("data-presets").split(",").forEach(function (key) {
    key = key.trim();
    if (!PRESETS[key]) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "tool-btn"; b.textContent = PRESETS[key];
    b.setAttribute("data-key", key);
    b.addEventListener("click", function () { loadPreset(key); });
    bar.appendChild(b);
  });

  $("mv-file").addEventListener("change", function () {
    var f = this.files[0];
    if (!f) return;
    f.arrayBuffer().then(function (buf) { setMesh(MeshCore.parseSTL(buf).tris, f.name); about(""); });
  });
  $("mv-reset").addEventListener("click", function () { if (orig) reset(); });

  var drag = null, moved = false;
  cv.addEventListener("pointerdown", function (e) { drag = [e.clientX, e.clientY]; moved = false; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag[0], dy = e.clientY - drag[1];
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    rz += dx * 0.01; rx += dy * 0.01; drag = [e.clientX, e.clientY];
    render();
  });
  cv.addEventListener("wheel", function (e) {
    if (!M) return;
    e.preventDefault();
    zoom = Math.min(8, Math.max(0.3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    render();
  }, {passive: false});

  cv.addEventListener("pointerup", function (e) {
    var was = drag; drag = null;
    if (!was || moved || !M || !idbuf) return;
    var mode = root.querySelector("input[name=mv-mode]:checked").value;
    if (mode === "rot") return;
    var r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
    var fi = idbuf[Math.floor((e.clientY - r.top) * dpr) * bufW + Math.floor((e.clientX - r.left) * dpr)];
    if (fi === undefined || fi < 0) return;
    if (mode === "del") M.F.splice(fi, 1);
    else { var f = M.F[fi]; M.F[fi] = [f[0], f[2], f[1]]; }
    $("mv-line").textContent = "Модель: " + name + " (изменена: " + (mode === "del" ? "удалена грань" : "развернута грань") + ")";
    update();
  });
  window.addEventListener("resize", render);

  window.MeshViewerOpen = loadPreset;
  window.addEventListener("hashchange", function () {
    var h = location.hash.slice(1);
    if (PRESETS[h]) loadPreset(h);
  });
  var hash = location.hash.slice(1);
  if (PRESETS[hash]) loadPreset(hash);
  else if (PRESETS[root.getAttribute("data-default")]) loadPreset(root.getAttribute("data-default"));
})();
