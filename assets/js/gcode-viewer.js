/* ==========================================================================
   gcode-viewer.js — просмотрщик G-кода (разметка: _includes/gcode-viewer.html).
   Нужен gcode-core.js. Файлы читаются только в браузере и никуда не отправляются.
   Текст в поле запоминается для каждой страницы отдельно (localStorage).
   Адрес вида viewer.html#square сразу открывает готовый файл
   (two, broken, square, scaffold).
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("gv");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (v, d) {
    return isFinite(v) ? v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}) : "—";
  };
  var css = function (n, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || fb;
  };
  var KEY = "gv:" + location.pathname;
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* хранилище недоступно */ } }
  };

  var cv = $("gv-canvas"), ctx = cv.getContext("2d");
  var ta = $("gv-text"), layerR = $("gv-layer"), progR = $("gv-prog");
  var M = null, byLayer = [], bounds = null;

  // ---------- кнопки готовых файлов ----------
  var bar = $("gv-presets");
  (root.getAttribute("data-presets") || "two,square,scaffold").split(",").forEach(function (key) {
    key = key.trim();
    var p = GCODE_PRESETS[key];
    if (!p) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "tool-btn"; b.textContent = p.label;
    b.addEventListener("click", function () { loadText(p.text()); });
    bar.appendChild(b);
  });

  function viewMode() { return root.querySelector('input[name="gv-view"]:checked').value; }

  function loadText(t) { ta.value = t; store.set(t); render(true); }

  function render(resetLayer) {
    M = parseGcode(ta.value);
    var n = M.zs.length;
    byLayer = [];
    for (var i = 0; i < Math.max(n, 1); i++) byLayer.push([]);
    M.segs.forEach(function (s) { if (s.layer >= 0 && s.layer < byLayer.length) byLayer[s.layer].push(s); });
    var ext = M.segs.filter(function (s) { return s.ext; });
    var src = ext.length ? ext : M.segs;
    if (src.length) {
      var b = {x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity};
      src.forEach(function (s) {
        b.x0 = Math.min(b.x0, s.x0, s.x1); b.x1 = Math.max(b.x1, s.x0, s.x1);
        b.y0 = Math.min(b.y0, s.y0, s.y1); b.y1 = Math.max(b.y1, s.y0, s.y1);
      });
      b.z1 = n ? M.zs[n - 1] : 0;
      bounds = b;
    } else bounds = null;
    layerR.max = Math.max(0, n - 1);
    if (resetLayer) layerR.value = 0;
    if (+layerR.value > n - 1) layerR.value = Math.max(0, n - 1);
    setProgressMax(true);
    stats();
    draw();
  }

  function setProgressMax(toEnd) {
    var L = byLayer[+layerR.value] || [];
    progR.max = L.length;
    if (toEnd || +progR.value > L.length) progR.value = L.length;
  }

  function filArea() {
    var d = parseFloat($("gv-fd").value) || 1.75;
    return Math.PI * (d / 2) * (d / 2);
  }

  function roadWidth() {
    if (!M || !M.hLayer) return 0.4;
    var w = M.medEperMM * filArea() / M.hLayer;
    return (w > 0.1 && w < 2) ? w : 0.4;
  }

  function stats() {
    var box = $("gv-stats"), wl = $("gv-warns");
    box.innerHTML = ""; wl.innerHTML = "";
    var hasExt = M && M.segs.some(function (s) { return s.ext; });
    $("gv-empty").style.display = hasExt ? "none" : "grid";
    if (!M || !M.segs.length) return;
    var rho = parseFloat($("gv-rho").value) || 1.24;
    var mass = M.eSum * filArea() / 1000 * rho;
    [["Слоёв", String(M.zs.length)],
     ["Высота слоя, мм", fmt(M.hLayer, 2)],
     ["Нить E, мм", fmt(M.eSum, M.eSum < 100 ? 2 : 1)],
     ["Масса, г", fmt(mass, mass < 10 ? 3 : 1)],
     ["Путь печати, м", fmt(M.extLen / 1000, 2)],
     ["Холостые, м", fmt(M.travLen / 1000, 2)],
     ["E на 1 мм пути", fmt(M.medEperMM, 5)],
     ["Ширина дорожки по E, мм", hasExt ? fmt(M.medEperMM * filArea() / (M.hLayer || 1), 2) : "—"]
    ].forEach(function (kv) {
      var el = document.createElement("div"); el.className = "gv__stat";
      var k = document.createElement("span"); k.className = "gv__stat-k"; k.textContent = kv[0];
      var v = document.createElement("span"); v.className = "gv__stat-v"; v.textContent = kv[1];
      el.appendChild(k); el.appendChild(v); box.appendChild(el);
    });
    if (M.warnings.length) {
      M.warnings.forEach(function (w) { var li = document.createElement("li"); li.textContent = w.msg; wl.appendChild(li); });
    } else {
      var li = document.createElement("li"); li.className = "gv__ok"; li.textContent = "Предупреждений нет"; wl.appendChild(li);
    }
  }

  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 600;
    var h = Math.min(520, Math.max(260, Math.round(w * 0.72)));
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {w: w, h: h};
  }

  function niceStep(span) {
    var raw = span / 8, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var m = [1, 2, 5, 10];
    for (var i = 0; i < m.length; i++) if (m[i] * p >= raw) return m[i] * p;
    return 10 * p;
  }

  function colors() {
    return {road: css("--c-accent", "#1b7f3b"), prev: "#cfe9d6", alt: "#7cc690", alt2: "#b7e0c3",
            muted: "#8a95a3", grid: "#eef1f5", seam: css("--c-bad", "#b42f2f"), ink: css("--c-text", "#1d2430")};
  }

  function draw() {
    var sz = sizeCanvas(), w = sz.w, h = sz.h;
    ctx.clearRect(0, 0, w, h);
    var lv = $("gv-layer-v"), pv = $("gv-prog-v"), cl = $("gv-line");
    if (!M || !bounds) { lv.textContent = "—"; pv.textContent = "—"; cl.textContent = ""; return; }
    var li = +layerR.value, pr = +progR.value, L = byLayer[li] || [];
    lv.textContent = M.zs.length ? (li + 1) + " из " + M.zs.length + ", Z " + fmt(M.zs[li], 2) : "—";
    pv.textContent = pr + " из " + L.length;
    var cur = pr > 0 ? L[pr - 1] : null;
    cl.textContent = cur ? "строка " + (cur.line + 1) + ":  " + M.lines[cur.line].trim() : "";
    var C = colors(), rw = roadWidth(), showT = $("gv-travel").checked;
    if (viewMode() === "top") drawTop(w, h, li, pr, L, showT, C, rw);
    else drawIso(w, h, li, pr, L, showT, C, rw);
  }

  function strokeSegs(list, upto, pick, T, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (var i = 0; i < upto; i++) {
      var s = list[i];
      if (!pick(s)) continue;
      var a = T(s.x0, s.y0, s.z), b = T(s.x1, s.y1, s.z);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  var isExt = function (s) { return s.ext; };
  var isTrav = function (s) { return !s.ext; };

  function drawTop(w, h, li, pr, L, showT, C, rw) {
    var pad = 26;
    var bx = Math.max(bounds.x1 - bounds.x0, 1), by = Math.max(bounds.y1 - bounds.y0, 1);
    var sc = Math.min((w - 2 * pad) / bx, (h - 2 * pad) / by);
    var ox = (w - bx * sc) / 2 - bounds.x0 * sc, oy = (h + by * sc) / 2 + bounds.y0 * sc;
    var T = function (x, y) { return [ox + x * sc, oy - y * sc]; };
    var st = niceStep(Math.max(bx, by)), g;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (g = Math.ceil((bounds.x0 - pad / sc) / st) * st; T(g, 0)[0] < w; g += st) { ctx.moveTo(T(g, 0)[0], 0); ctx.lineTo(T(g, 0)[0], h); }
    for (g = Math.ceil((bounds.y0 - pad / sc) / st) * st; T(0, g)[1] > 0; g += st) { ctx.moveTo(0, T(0, g)[1]); ctx.lineTo(w, T(0, g)[1]); }
    ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "12px sans-serif";
    ctx.fillText("клетка " + fmt(st, st < 1 ? 1 : 0) + " мм", 8, h - 8);
    var lw = Math.max(1, rw * sc);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (li > 0) strokeSegs(byLayer[li - 1], byLayer[li - 1].length, isExt, T, C.prev, lw);
    strokeSegs(L, pr, isExt, T, C.road, lw);
    if (showT) strokeSegs(L, pr, isTrav, T, C.muted, 1.2, [5, 5]);
    markers(L, pr, C, T, Math.max(7, lw * 0.9));
  }

  function drawIso(w, h, li, pr, L, showT, C, rw) {
    var c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    var cx = (bounds.x0 + bounds.x1) / 2, cy = (bounds.y0 + bounds.y1) / 2;
    var xy = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0, 1);
    var zTop = bounds.z1 || 1;
    var zk = zTop < 0.35 * xy ? (0.35 * xy) / zTop : 1;
    var P = function (x, y, z) { return [(x - cx - (y - cy)) * c30, -((x - cx + (y - cy)) * s30) - z * zk]; };
    var u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    [[bounds.x0, bounds.y0], [bounds.x1, bounds.y0], [bounds.x0, bounds.y1], [bounds.x1, bounds.y1]].forEach(function (q) {
      [0, zTop].forEach(function (z) {
        var p = P(q[0], q[1], z);
        u0 = Math.min(u0, p[0]); u1 = Math.max(u1, p[0]); v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]);
      });
    });
    var pad = 24, sc = Math.min((w - 2 * pad) / Math.max(u1 - u0, 1e-6), (h - 2 * pad) / Math.max(v1 - v0, 1e-6));
    var ox = (w - (u1 - u0) * sc) / 2 - u0 * sc, oy = (h - (v1 - v0) * sc) / 2 - v0 * sc;
    var T = function (x, y, z) { var p = P(x, y, z); return [ox + p[0] * sc, oy + p[1] * sc]; };
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1.5; ctx.beginPath();
    [[bounds.x0, bounds.y0], [bounds.x1, bounds.y0], [bounds.x1, bounds.y1], [bounds.x0, bounds.y1], [bounds.x0, bounds.y0]]
      .forEach(function (q, i) { var p = T(q[0], q[1], 0); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "12px sans-serif";
    ctx.fillText("масштаб Z ×" + fmt(zk, 0), 8, h - 8);
    var lw = Math.max(1, Math.min(rw * sc * 0.85, 6));
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var k = 0; k < li; k++) strokeSegs(byLayer[k], byLayer[k].length, isExt, T, k % 2 ? C.alt : C.alt2, lw);
    strokeSegs(L, pr, isExt, T, C.road, lw);
    if (showT) strokeSegs(L, pr, isTrav, T, C.muted, 1, [4, 4]);
    markers(L, pr, C, T, 7);
  }

  function markers(L, pr, C, T, r) {
    var first = null;
    for (var i = 0; i < L.length; i++) if (L[i].ext) { first = L[i]; break; }
    if (first) {
      var a = T(first.x0, first.y0, first.z);
      ctx.strokeStyle = C.seam; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(a[0], a[1], r, 0, 2 * Math.PI); ctx.stroke();
    }
    if (pr > 0) {
      var s = L[pr - 1], b = T(s.x1, s.y1, s.z);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(b[0], b[1], 4.5, 0, 2 * Math.PI); ctx.fill();
    }
  }

  // ---------- события ----------
  $("gv-draw").addEventListener("click", function () { store.set(ta.value); render(false); });
  $("gv-file").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { loadText(String(r.result)); };
    r.readAsText(f);
    e.target.value = "";
  });
  layerR.addEventListener("input", function () { setProgressMax(true); draw(); });
  progR.addEventListener("input", draw);
  Array.prototype.forEach.call(root.querySelectorAll('input[name="gv-view"]'), function (r) { r.addEventListener("change", draw); });
  $("gv-travel").addEventListener("change", draw);
  ["gv-fd", "gv-rho"].forEach(function (id) { $(id).addEventListener("input", function () { stats(); draw(); }); });
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 120); });

  // ---------- старт: адрес #ключ → сохранённый текст → файл по умолчанию ----------
  var hash = location.hash.replace("#", "");
  var saved = store.get();
  if (GCODE_PRESETS[hash]) loadText(GCODE_PRESETS[hash].text());
  else if (saved) { ta.value = saved; render(true); }
  else if (GCODE_PRESETS[root.getAttribute("data-default")]) loadText(GCODE_PRESETS[root.getAttribute("data-default")].text());
  else { sizeCanvas(); }
})();
