/* Интерактивные демонстрации task 3-0a: ступенька, свесы, сечение треугольника, сборка контура.
   Стили — блок .mdemo из assets/css/mesh-demo.css (практика 2). */
(function () {
  "use strict";
  function noSelect(on) { document.documentElement.classList.toggle("no-select", on); if (on && window.getSelection) window.getSelection().removeAllRanges(); }
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(tag, attrs, s, parent) { var e = el(tag, attrs, parent); e.textContent = s; return e; }
  function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  function fmt(x, d) { return (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d === undefined ? 2 : d).replace(".", ",").replace("-", "−"); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function $(id) { return document.getElementById(id); }
  /* состояния блока лежат в одной ячейке сетки, видно одно: высота не меняется при переключении */
  function stack(box, list) {
    clear(box); box.classList.add("stack");
    list.forEach(function (s) { var d = document.createElement("div"); d.innerHTML = s; box.appendChild(d); });
  }
  function showIn(box, i) { Array.prototype.forEach.call(box.children, function (d, k) { d.classList.toggle("on", k === i); }); }

  /* Ортогональная проекция с вращением мышью (как в mesh-demo.js практики 2): z — вверх.
     o.zoom — id ползунка масштаба, рядом <output id="<id>v">; v.reset() — исходный вид и 100 %. */
  function View(svg, o) {
    var v = {yaw: o.yaw, pitch: o.pitch, zoom: 1};
    v.p = function (q) {
      var x = q[0] - o.c[0], y = q[1] - o.c[1], z = q[2] - o.c[2];
      var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      var x1 = x * cy - y * sy, y1 = x * sy + y * cy, s = o.s * v.zoom;
      return [o.cx + s * x1, o.cy - s * (y1 * sp + z * cp), y1 * cp - z * sp];
    };
    var drag = null;
    svg.addEventListener("pointerdown", function (e) { e.preventDefault(); noSelect(true); drag = {x: e.clientX, y: e.clientY, yaw: v.yaw, pitch: v.pitch}; });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      v.yaw = drag.yaw - (e.clientX - drag.x) * 0.01;
      v.pitch = Math.max(-1.45, Math.min(1.45, drag.pitch + (e.clientY - drag.y) * 0.01));
      o.redraw();
    });
    window.addEventListener("pointerup", function () { if (drag) noSelect(false); drag = null; });
    var zin = $(o.zoom), zout = $(o.zoom + "v");
    v.setZoom = function (k) { zin.value = k; v.zoom = zin.value / 100; zout.textContent = zin.value + " %"; };
    zin.addEventListener("input", function () { v.setZoom(+zin.value); o.redraw(); });
    svg.addEventListener("wheel", function (e) { e.preventDefault(); v.setZoom(+zin.value + (e.deltaY < 0 ? 10 : -10)); o.redraw(); }, {passive: false});
    v.reset = function () { v.yaw = o.yaw; v.pitch = o.pitch; v.setZoom(100); };
    return v;
  }

  /* ---------- модели ---------- */
  // фаланга: та же поверхность вращения, что finger.stl (tools/make_models.py, bone())
  function finger() {
    var L = 40, nt = 24, nth = 24, x0 = 60, y0 = 50, V = [[x0, y0, 0]], F = [], i, j;
    function r4(x) { return Math.round(x * 1e4) / 1e4; }
    for (i = 1; i < nt; i++) {
      var t = Math.PI * i / nt, z = L * (1 - Math.cos(t)) / 2;
      var r = (6 - 2 * Math.sin(Math.PI * z / L)) * Math.sqrt(Math.sin(t));
      for (j = 0; j < nth; j++) { var a = 2 * Math.PI * j / nth; V.push([r4(x0 + r * Math.cos(a)), r4(y0 + r * Math.sin(a)), r4(z)]); }
    }
    V.push([x0, y0, L]);
    function ring(i, j) { return 1 + (i - 1) * nth + (j % nth); }
    for (j = 0; j < nth; j++) F.push([0, ring(1, j + 1), ring(1, j)]);
    for (i = 1; i < nt - 1; i++) for (j = 0; j < nth; j++) {
      var p = ring(i, j), q = ring(i, j + 1), s = ring(i + 1, j + 1), u = ring(i + 1, j);
      F.push([p, q, s]); F.push([p, s, u]);
    }
    var top = V.length - 1;
    for (j = 0; j < nth; j++) F.push([top, ring(nt - 1, j), ring(nt - 1, j + 1)]);
    return F.map(function (f) { return [V[f[0]], V[f[1]], V[f[2]]]; });
  }
  // кронштейн t_bracket.stl и клин ramp.stl: грани из файлов
  var BRACKET = [[[12,0,0],[24,0,0],[24,0,18]],[[12,12,0],[24,12,18],[24,12,0]],[[12,0,0],[24,0,18],[12,0,18]],[[12,12,0],[12,12,18],[24,12,18]],[[36,0,22],[0,0,22],[0,0,18]],[[36,12,22],[0,12,18],[0,12,22]],[[36,0,22],[0,0,18],[12,0,18]],[[36,12,22],[12,12,18],[0,12,18]],[[36,0,22],[12,0,18],[24,0,18]],[[36,12,22],[24,12,18],[12,12,18]],[[36,0,22],[24,0,18],[36,0,18]],[[36,12,22],[36,12,18],[24,12,18]],[[12,0,0],[12,12,0],[24,12,0]],[[12,0,0],[24,12,0],[24,0,0]],[[24,0,0],[24,12,0],[24,12,18]],[[24,0,0],[24,12,18],[24,0,18]],[[24,0,18],[24,12,18],[36,12,18]],[[24,0,18],[36,12,18],[36,0,18]],[[36,0,18],[36,12,18],[36,12,22]],[[36,0,18],[36,12,22],[36,0,22]],[[36,0,22],[36,12,22],[0,12,22]],[[36,0,22],[0,12,22],[0,0,22]],[[0,0,22],[0,12,22],[0,12,18]],[[0,0,22],[0,12,18],[0,0,18]],[[0,0,18],[0,12,18],[12,12,18]],[[0,0,18],[12,12,18],[12,0,18]],[[12,0,18],[12,12,18],[12,12,0]],[[12,0,18],[12,12,0],[12,0,0]]];
  var A = 17.3205;
  var RAMP = [[[0,0,0],[A,10,0],[A,0,0]],[[0,0,0],[0,10,0],[A,10,0]],[[0,0,0],[0,0,10],[0,10,10]],[[0,0,0],[0,10,10],[0,10,0]],[[A,0,0],[A,10,0],[0,10,10]],[[A,0,0],[0,10,10],[0,0,10]],[[0,0,0],[A,0,0],[0,0,10]],[[0,10,0],[0,10,10],[A,10,0]]];
  var MODELS = {finger: finger(), bracket: BRACKET, ramp: RAMP};
  var TURNS = {"+Z": function (p) { return [p[0], p[1], p[2]]; }, "-Z": function (p) { return [p[0], -p[1], -p[2]]; },
               "+X": function (p) { return [-p[2], p[1], p[0]]; }, "-X": function (p) { return [p[2], p[1], -p[0]]; },
               "+Y": function (p) { return [p[0], -p[2], p[1]]; }, "-Y": function (p) { return [p[0], p[2], -p[1]]; }};
  function place(tris, f) {          // повернуть каждую точку функцией f и поставить на стол, центр по x, y в нуле
    var t = tris.map(function (tri) { return tri.map(f); }), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    t.forEach(function (tri) { tri.forEach(function (p) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } }); });
    var cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2;
    return {tris: t.map(function (tri) { return tri.map(function (p) { return [p[0] - cx, p[1] - cy, p[2] - lo[2]]; }); }), H: hi[2] - lo[2]};
  }
  function normalArea(tri) {
    var n = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])), L = Math.hypot(n[0], n[1], n[2]);
    return L ? {n: [n[0] / L, n[1] / L, n[2] / L], a: L / 2} : {n: [0, 0, 0], a: 0};
  }
  // цвета схем берутся из переменных блока (светлая и темная тема)
  function hex(box, name) {
    var s = getComputedStyle(box).getPropertyValue(name).trim();
    if (s.length === 4) s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return [1, 3, 5].map(function (k) { return parseInt(s.substr(k, 2), 16); });
  }
  function rgb(c, k) { return "rgb(" + c.map(function (x) { return Math.round(Math.max(0, Math.min(255, x * k))); }).join(",") + ")"; }
  function mix(a, b, t) { return [0, 1, 2].map(function (k) { return a[k] + (b[k] - a[k]) * t; }); }
  // грани модели по глубине: дальние раньше; color(i, n) — цвет грани i с нормалью n
  function drawMesh(g, view, tris, color) {
    var light = [-0.35, -0.55, 0.76];
    var order = tris.map(function (tri, i) {
      var P = tri.map(view.p);
      return {i: i, P: P, d: (P[0][2] + P[1][2] + P[2][2]) / 3};
    }).sort(function (a, b) { return b.d - a.d; });
    clear(g);
    var sy = Math.sin(view.yaw), cy = Math.cos(view.yaw), sp = Math.sin(view.pitch), cp = Math.cos(view.pitch);
    order.forEach(function (o) {
      var na = normalArea(tris[o.i]);
      if ((na.n[0] * sy + na.n[1] * cy) * cp - na.n[2] * sp > 1e-9) return;   // грань смотрит от наблюдателя: сетка замкнута, ее не видно
      var lam = Math.abs(na.n[0] * light[0] + na.n[1] * light[1] + na.n[2] * light[2]);
      el("polygon", {points: o.P.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "),
        style: "fill:" + rgb(color(o.i, na.n), 0.72 + 0.28 * lam) + ";stroke:" + rgb(color(o.i, na.n), 0.55) + ";stroke-width:0.4;stroke-linejoin:round"}, g);
    });
  }
  function bed(g, view, half, z) {
    var c = [[-half, -half, z], [half, -half, z], [half, half, z], [-half, half, z]].map(view.p);
    el("polygon", {points: c.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "),
      style: "fill: var(--md-plane); fill-opacity: 0.12; stroke: var(--md-plane); stroke-opacity: 0.5"}, g);
  }

  /* ---------- 1. Ступенька при повороте модели ---------- */
  (function () {
    var svg = $("cu3d"); if (!svg) return;
    var box = svg.closest(".mdemo"), form = $("cuform"), gBed = el("g", {}, svg), gM = el("g", {}, svg);
    var SIZE = {finger: 1, bracket: 1.1, ramp: 1.9};
    var view = View(svg, {c: [0, 0, 10], cx: 230, cy: 200, s: 6.5, yaw: -0.5, pitch: 0.38, zoom: "cuzoom", redraw: draw});
    function tilt(deg) { var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return function (p) { return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }; }
    function draw() {
      var name = $("cumodel").value, deg = +$("cutilt").value, l = +$("cul").value;
      $("cutiltv").textContent = deg + "°"; $("culv").textContent = fmt(l, 2) + " мм";
      var m = place(MODELS[name], tilt(deg)), face = hex(box, "--md-face"), hl = hex(box, "--md-hl");
      var sum = 0, area = 0, hs = m.tris.map(function (tri) {
        var na = normalArea(tri), c = Math.abs(na.n[2]), h = c > 1 - 1e-9 ? 0 : l * c;
        sum += h * na.a; area += na.a; return h / l;
      });
      var k = SIZE[name];
      view.p = function (q) { return baseP([q[0] * k, q[1] * k, q[2] * k]); };
      clear(gBed); bed(gBed, view, 20, 0);
      drawMesh(gM, view, m.tris, function (i) { return mix(face, hl, hs[i]); });
      inset(sum / area / l, l);
      var N = Math.ceil(Math.round(m.H / l * 1e9) / 1e9);
      $("custats").innerHTML = "<span class='stat'>высота <i>H</i> = " + fmt(m.H) + " мм</span><span class='stat'>слоев <i>N</i> = " + N +
        "</span><span class='stat'>средняя ступенька <i>h̄</i> = " + fmt(sum / area, 4) + " мм</span>";
    }
    var baseP = view.p;
    // вставка в правом верхнем углу: разрез у грани со средним |cos θ| — как выглядит ступенька при текущих параметрах
    var gIn = el("g", {}, svg), ICX = 392, ICY = 72, IR = 58, IPX = 110;   // 1 мм = 110 px
    var defs = el("defs", {}, svg), cpIn = el("clipPath", {id: "cu-inclip"}, defs);
    el("circle", {cx: ICX, cy: ICY, r: IR}, cpIn);
    function inset(c, l) {
      clear(gIn);
      el("circle", {cx: ICX, cy: ICY, r: IR, style: "fill: var(--c-bg); stroke: var(--c-border); stroke-width: 1.5"}, gIn);
      var g = el("g", {"clip-path": "url(#cu-inclip)"}, gIn), L = l * IPX, th = Math.acos(Math.min(1, c)), flat = c > 1 - 1e-6, vert = c < 1e-6;
      var xs = function (y) { return vert ? ICX : ICX - (y - ICY) / Math.tan(th); };   // поверхность через центр под углом θ к горизонтали
      for (var j = -4; j <= 4; j++) {
        var yb = ICY + j * L, yt = yb - L, xr = flat ? (yt >= ICY - 1e-6 ? ICX + IR : ICX - IR) : xs(yt);
        if (flat && yt < ICY - 1e-6) continue;
        el("rect", {x: ICX - IR, y: yt, width: Math.max(0, xr - ICX + IR), height: L, "class": "d-mface", style: "fill-opacity: 0.6; stroke: var(--md-stroke); stroke-opacity: 0.35"}, g);
      }
      if (flat) el("line", {x1: ICX - IR, y1: ICY, x2: ICX + IR, y2: ICY, style: "stroke: var(--md-stroke); stroke-width: 2.5"}, g);
      else el("line", {x1: xs(ICY + IR), y1: ICY + IR, x2: xs(ICY - IR), y2: ICY - IR, style: "stroke: var(--md-stroke); stroke-width: 2.5"}, g);
      if (!flat && !vert) {   // высота ступеньки у слоя, верх которого проходит через центр: от угла ступени перпендикулярно поверхности
        var ax = xs(ICY), ay = ICY + L, ux = Math.cos(th), uy = -Math.sin(th), t = (ax - ICX) * ux + (ay - ICY) * uy;
        el("line", {x1: ax, y1: ay, x2: ICX + t * ux, y2: ICY + t * uy, style: "stroke: var(--md-hl); stroke-width: 4; stroke-linecap: round"}, g);
      }
      txt("text", {x: 455, y: ICY + IR + 16, "text-anchor": "end", "class": "svg-muted"}, "средняя грань: θ = " + fmt(th * 180 / Math.PI, 0) + "°", gIn);
      txt("text", {x: 455, y: ICY + IR + 31, "text-anchor": "end", "class": "svg-muted"}, "h = " + fmt(l, 2) + " · " + fmt(c, 3) + " = " + fmt(l * c, 4) + " мм", gIn);
    }
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    $("cureset").addEventListener("click", function () { form.reset(); view.reset(); draw(); });
    draw();
  })();

  /* ---------- 2. Свесы и порог ---------- */
  (function () {
    var svg = $("ov3d"); if (!svg) return;
    var box = svg.closest(".mdemo"), form = $("ovform"), gBed = el("g", {}, svg), gM = el("g", {}, svg);
    var SIZE = {finger: 1, bracket: 1.1, ramp: 1.9};
    var view = View(svg, {c: [0, 0, 10], cx: 230, cy: 150, s: 6.5, yaw: -0.5, pitch: -0.32, zoom: "ovzoom", redraw: draw});   // вид снизу: видны грани, обращенные вниз
    var gSup = el("g", {}, svg);
    var baseP = view.p;
    function draw() {
      var name = $("ovmodel").value, up = $("ovup").value, th = +$("ovth").value;
      $("ovthv").textContent = th + "°";
      var m = place(MODELS[name], TURNS[up]), lim = Math.cos(th * Math.PI / 180);
      var face = hex(box, "--md-face"), bad = hex(box, "--md-face-bad");
      var n = 0, area = 0, vol = 0, need = m.tris.map(function (tri) {
        var na = normalArea(tri), top = Math.max(tri[0][2], tri[1][2], tri[2][2]);
        var yes = na.n[2] < 0 && -na.n[2] >= lim - 1e-9 && top > 1e-6;   // нормаль вниз, угол к горизонтали не больше порога; грани на столе не в счет
        if (yes) { n++; area += na.a; vol += na.a * -na.n[2] * (tri[0][2] + tri[1][2] + tri[2][2]) / 3; }
        return yes;
      });
      var k = SIZE[name];
      view.p = function (q) { return baseP([q[0] * k, q[1] * k, q[2] * k]); };
      clear(gBed); bed(gBed, view, 20, 0);
      drawMesh(gM, view, m.tris, function (i) { return need[i] ? bad : face; });
      clear(gSup);
      if ($("ovsup").checked) m.tris.forEach(function (tri, i) {   // поддержка — призма от грани вниз до стола
        if (!need[i]) return;
        var low = tri.map(function (p) { return [p[0], p[1], 0]; });
        for (var e = 0; e < 3; e++) {
          var q = [tri[e], tri[(e + 1) % 3], low[(e + 1) % 3], low[e]].map(view.p);
          el("polygon", {points: q.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: var(--md-normal-bad); fill-opacity: 0.12; stroke: var(--md-normal-bad); stroke-opacity: 0.55; stroke-width: 0.8"}, gSup);
        }
        var b = low.map(view.p);
        el("polygon", {points: b.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: var(--md-normal-bad); fill-opacity: 0.18; stroke: var(--md-normal-bad); stroke-opacity: 0.55; stroke-width: 0.8"}, gSup);
      });
      $("ovstats").innerHTML = "<span class='stat'>граней под поддержки: " + n + " из " + m.tris.length + "</span><span class='stat'>их площадь " + fmt(area, 1) +
        " мм²</span><span class='stat'>объем поддержек ≈ " + fmt(vol, 0) + " мм³</span>";
    }
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    $("ovreset").addEventListener("click", function () { form.reset(); view.reset(); draw(); });
    draw();
  })();

  /* ---------- 3. Пять случаев сечения треугольника ---------- */
  (function () {
    var svg = $("ct3d"); if (!svg) return;
    var form = $("ctform"), g = el("g", {}, svg), EPS = 0.005;
    var TRI = {general: [[0, 0, 0.4], [2.4, 0.3, 1.5], [1.0, 1.8, 1.9]],
               vertex: [[0, 0, 0.3], [2.4, 0.3, 1.0], [1.0, 1.8, 1.7]],
               touch: [[0, 0, 0.2], [2.4, 0.3, 0.6], [1.0, 1.8, 1.0]],
               edge: [[0, 0, 1.0], [2.4, 0.3, 1.0], [1.0, 1.8, 1.8]],
               flat: [[0, 0, 1.0], [2.4, 0.3, 1.0], [1.0, 1.8, 1.0]]};
    var view = View(svg, {c: [1.2, 0.9, 1.0], cx: 230, cy: 160, s: 95, yaw: -0.55, pitch: 0.42, zoom: "ctzoom", redraw: draw});
    function pt(p) { return "(" + fmt(p[0]) + "; " + fmt(p[1]) + ")"; }
    function draw() {
      var tri = TRI[$("cttri").value], zp = +$("ctz").value, eps = $("cteps").checked, z0 = zp;
      $("ctzv").textContent = fmt(zp, 2);
      var zs = tri.map(function (p) { return p[2]; });
      if (eps) { zs = zs.map(function (z) { return Math.round(z / (2 * EPS)) * 2 * EPS; }); zp = Math.floor(zp / (2 * EPS) + 1e-9) * 2 * EPS + EPS; }
      var above = 0, on = 0, below = 0;
      zs.forEach(function (z) { if (Math.abs(z - zp) < 1e-9) on++; else if (z > zp) above++; else below++; });
      // точки пересечения: вершины на плоскости и ребра, концы которых по разные стороны
      var pts = [];
      for (var i = 0; i < 3; i++) {
        var a = tri[i], b = tri[(i + 1) % 3], za = zs[i], zb = zs[(i + 1) % 3];
        if (Math.abs(za - zp) < 1e-9) pts.push(a);
        else if ((za - zp) * (zb - zp) < 0 && Math.abs(zb - zp) > 1e-9) { var t = (zp - za) / (zb - za); pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), zp]); }
      }
      var kind, res;
      if (on === 3) { kind = "4: все три вершины на плоскости"; res = "вся грань лежит в плоскости слоя"; }
      else if (on === 2) { kind = "3: две вершины на плоскости"; res = "ребро " + pt(pts[0]) + " — " + pt(pts[1]) + " целиком в контуре"; }
      else if (on === 1 && pts.length === 2) { kind = "2: одна вершина на плоскости, две другие по разные стороны"; res = "отрезок от вершины до противоположного ребра: " + pt(pts[0]) + " — " + pt(pts[1]); }
      else if (on === 1) { kind = "2: одна вершина на плоскости, две другие по одну сторону"; res = "одна точка " + pt(pts[0]) + ", отрезка нет"; }
      else if (pts.length === 2) { kind = "5: вершины по разные стороны плоскости"; res = "отрезок " + pt(pts[0]) + " — " + pt(pts[1]); }
      else { kind = "1: все вершины по одну сторону"; res = "пересечения нет"; }
      $("ctout").innerHTML = "<div>Плоскость <i>z</i> = " + fmt(zp, 3) + (eps ? " (после правила ε)" : "") + "; вершин выше: " + above + ", на плоскости: " + on + ", ниже: " + below + "</div>" +
        "<div>Случай " + kind + "</div><div>Результат: " + res + "</div>" +
        (eps ? "<div>Правило ε (ε = 0,005 мм): высоты вершин округлены до четных кратных ε, плоскость поднята с " + fmt(z0, 3) + " до ближайшего нечетного кратного " + fmt(zp, 3) +
               ". Сдвиг 0,005 мм на схеме почти не виден, но теперь ни одна вершина не лежит на плоскости, и остаются только случаи 1 и 5. Пунктир — плоскость до сдвига.</div>"
             : "<div>Правило ε выключено: плоскость на заданной высоте, вершины могут лежать на ней (случаи 2–4).</div>");
      clear(g);
      var c = [[-0.6, -0.6, zp], [3.0, -0.6, zp], [3.0, 2.4, zp], [-0.6, 2.4, zp]].map(view.p);
      var tp = tri.map(function (p, i) { return view.p([p[0], p[1], zs[i]]); });
      var behind = (tp[0][2] + tp[1][2] + tp[2][2]) / 3 > (c[0][2] + c[2][2]) / 2;
      function plane() { el("polygon", {points: c.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: var(--md-plane); fill-opacity: 0.16; stroke: var(--md-plane); stroke-opacity: 0.6"}, g); }
      function triangle() { el("polygon", {points: tp.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: var(--md-face); fill-opacity: 0.85; stroke: var(--md-stroke); stroke-width: 1.5"}, g); }
      if (behind) { triangle(); plane(); } else { plane(); triangle(); }
      if (eps) {   // плоскость до сдвига — пунктиром
        var c0 = [[-0.6, -0.6, z0], [3.0, -0.6, z0], [3.0, 2.4, z0], [-0.6, 2.4, z0]].map(view.p);
        el("polygon", {points: c0.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: none; stroke: var(--md-stroke); stroke-opacity: 0.7; stroke-dasharray: 5 4"}, g);
      }
      var P = pts.map(function (p) { return view.p([p[0], p[1], zp]); });
      if (on === 3) el("polygon", {points: tp.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: none; stroke: var(--md-hl); stroke-width: 5; stroke-linejoin: round"}, g);
      else if (P.length === 2) el("line", {x1: P[0][0], y1: P[0][1], x2: P[1][0], y2: P[1][1], style: "stroke: var(--md-hl); stroke-width: 5; stroke-linecap: round"}, g);
      P.forEach(function (p) { el("circle", {cx: p[0], cy: p[1], r: 5, style: "fill: var(--md-hl); stroke: var(--md-stroke)"}, g); });
      var cx = (tp[0][0] + tp[1][0] + tp[2][0]) / 3, cy = (tp[0][1] + tp[1][1] + tp[2][1]) / 3;
      tp.forEach(function (p, i) {   // подпись снаружи треугольника: по направлению от его центра
        var dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
        txt("text", {x: p[0] + 16 * dx / L, y: p[1] + 16 * dy / L + 4, "text-anchor": dx < 0 ? "end" : "start", "class": "svg-muted"}, "z = " + fmt(zs[i], 3), g);
      });
    }
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    $("ctreset").addEventListener("click", function () { form.reset(); view.reset(); draw(); });
    draw();
  })();

  /* ---------- 4. Сборка контура по шагам (Minetto et al., Algorithm 4) ---------- */
  (function () {
    var svg = $("lp2d"); if (!svg) return;
    var EPS = 0.005, gS = el("g", {}, svg), gP = el("g", {}, svg), gL = el("g", {}, svg);
    function X(x) { return 42 + x * 11; } function Y(y) { return 180 - y * 11; }
    // сечение кронштейна на высоте 20 мм с правилом ε: отрезки в порядке граней файла
    var zp, SEGS;
    function section(Z) {   // отрезки сечения на высоте Z с правилом ε, в порядке граней файла
      zp = Math.floor(Z / (2 * EPS) + 1e-9) * 2 * EPS + EPS; SEGS = [];
      BRACKET.forEach(function (tri) {
        var pts = [];
        for (var i = 0; i < 3; i++) {
          var a = tri[i], b = tri[(i + 1) % 3], za = Math.round(a[2] / (2 * EPS)) * 2 * EPS, zb = Math.round(b[2] / (2 * EPS)) * 2 * EPS;
          if ((za < zp) !== (zb < zp)) { var t = (zp - za) / (zb - za); pts.push([+(a[0] + t * (b[0] - a[0])).toFixed(3), +(a[1] + t * (b[1] - a[1])).toFixed(3)]); }
        }
        if (pts.length === 2) SEGS.push(pts);
      });
    }
    // модель кронштейна и секущая плоскость: поворот мышью, масштаб, «Сбросить»
    var svg3 = $("lp3d"), box3 = svg3.closest(".mdemo"), g3b = el("g", {}, svg3), g3m = el("g", {}, svg3), g3p = el("g", {}, svg3);
    var view3 = View(svg3, {c: [0, 0, 11], cx: 230, cy: 128, s: 7.2, yaw: -0.55, pitch: 0.42, zoom: "lpzoom", redraw: draw3});
    function draw3() {
      clear(g3b); clear(g3p); bed(g3b, view3, 24, 0);
      var face = hex(box3, "--md-face");
      drawMesh(g3m, view3, BRACKET.map(function (t) { return t.map(function (p) { return [p[0] - 18, p[1] - 6, p[2]]; }); }), function () { return face; });
      var c = [[-22, -10, zp], [22, -10, zp], [22, 10, zp], [-22, 10, zp]].map(view3.p);
      el("polygon", {points: c.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "), style: "fill: var(--md-plane); fill-opacity: 0.16; stroke: var(--md-plane); stroke-opacity: 0.6"}, g3p);
      SEGS.forEach(function (sg) {
        var a = view3.p([sg[0][0] - 18, sg[0][1] - 6, zp]), b = view3.p([sg[1][0] - 18, sg[1][1] - 6, zp]);
        el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: "stroke: var(--md-hl); stroke-width: 3; stroke-linecap: round"}, g3p);
      });
    }

    var states = [], names = {}, order = [];
    function key(p) { return p[0] + "," + p[1]; }
    function nm(p) { return names[key(p)]; }
    function build(hole) {
      var segs = SEGS.filter(function (s, i) { return !(hole && i === 6); });
      names = {}; order = [];
      segs.forEach(function (s) { s.forEach(function (p) { if (!(key(p) in names)) { names[key(p)] = String.fromCharCode(97 + order.length); order.push(p); } }); });
      var H = {}, list = [], st = [];
      function table(cur, path) {
        var rows = order.map(function (p) {
          var k = key(p), v = H[k] ? H[k].map(nm).join(", ") : "—", cls = "";
          if (path && path.indexOf(k) >= 0) cls = " class='picked'";
          if (cur === k) cls = " class='picked badrow'";
          return "<tr" + cls + "><td class='mono'>" + nm(p) + " (" + fmt(p[0], 3) + "; " + fmt(p[1], 3) + ")</td><td class='mono'>" + v + "</td></tr>";
        }).join("");
        return "<table><tr><th>Точка (ключ)</th><th>Соседи (значение)</th></tr>" + rows + "</table>";
      }
      st.push({segs: 0, path: [], tab: table(), log: "Шаг 2 дал " + segs.length + " отрезков в порядке граней файла. Таблица пока пуста."});
      segs.forEach(function (s, i) {
        var u = key(s[0]), v = key(s[1]);
        (H[u] = H[u] || []).push(s[1]); (H[v] = H[v] || []).push(s[0]);
        st.push({segs: i + 1, path: [], tab: table(), log: "Отрезок " + (i + 1) + " из " + segs.length + ": " + nm(s[0]) + "–" + nm(s[1]) + ". Точка " + nm(s[0]) + " получает соседа " + nm(s[1]) + ", точка " + nm(s[1]) + " — соседа " + nm(s[0]) + "."});
      });
      // обход: с точки, у которой один сосед (конец ломаной), иначе с первой точки таблицы
      var start = order.filter(function (p) { return H[key(p)].length === 1; })[0] || order[0];
      var path = [key(start)], prev = null, cur = start, closed = false;
      st.push({segs: segs.length, path: path.slice(), tab: table(key(start), path), log: (H[key(start)].length === 1 ? "У точки " + nm(start) + " один сосед: это конец ломаной, обход начинается с нее." : "Начало обхода — точка " + nm(start) + ". Ее второй сосед " + nm(H[key(start)][1]) + " станет последней точкой контура.")});
      for (var guard = 0; guard < 40; guard++) {
        var nb = H[key(cur)].filter(function (p) { return !prev || key(p) !== key(prev); });
        if (prev === null) nb = [H[key(cur)][0]];
        var nx = nb[0];
        if (!nx) { st.push({segs: segs.length, path: path.slice(), tab: table(null, path), log: "У точки " + nm(cur) + " больше нет соседей: ломаная не замкнута, ее концы " + nm(start) + " и " + nm(cur) + ". Корректный слайсер сообщает о разрыве и не завершается аварийно."}); break; }
        if (key(nx) === key(start)) { closed = true; st.push({segs: segs.length, path: path.concat([key(start)]), tab: table(null, path), log: "Следующая точка — снова " + nm(start) + ": последний отрезок " + nm(cur) + "–" + nm(start) + " замыкает контур, в нем " + path.length + " точек. Каждая точка таблицы использована один раз."}); break; }
        path.push(key(nx)); prev = cur; cur = nx;
        st.push({segs: segs.length, path: path.slice(), tab: table(key(cur), path), log: "Соседи точки " + nm(prev) + ": " + H[key(prev)].map(nm).join(" и ") + ". Одного уже прошли, следующая точка — " + nm(cur) + "."});
      }
      return {segs: segs, st: st, closed: closed};
    }
    var data, step = 0, timer = null;
    function render() {
      var s = data.st[step];
      clear(gS); clear(gP); clear(gL);
      data.segs.forEach(function (sg, i) {
        var on = i < s.segs;
        el("line", {x1: X(sg[0][0]), y1: Y(sg[0][1]), x2: X(sg[1][0]), y2: Y(sg[1][1]), style: "stroke: " + (on ? "var(--md-stroke)" : "var(--md-plane)") + "; stroke-width: " + (on ? 2.5 : 1.5) + "; stroke-dasharray: " + (on ? "none" : "4 4")}, gS);
      });
      for (var i = 1; i < s.path.length; i++) {
        var a = s.path[i - 1].split(",").map(Number), b = s.path[i].split(",").map(Number);
        el("line", {x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), style: "stroke: var(--md-hl); stroke-width: 6; stroke-linecap: round; opacity: 0.85"}, gP);
      }
      order.forEach(function (p, k) {
        var lab = Y(p[1]) > 120 ? Y(p[1]) + 20 : Y(p[1]) - 10;
        el("circle", {cx: X(p[0]), cy: Y(p[1]), r: 4, style: "fill: var(--md-stroke)"}, gL);
        txt("text", {x: X(p[0]) + (p[0] === 0 ? -14 : (p[0] === 36 ? 14 : 0)), y: p[0] === 0 || p[0] === 36 ? Y(p[1]) + 4 : lab, "text-anchor": "middle", "class": "svg-mono"}, String.fromCharCode(97 + k), gL);
      });
      showIn($("lptab"), step); showIn($("lplog"), step);
    }
    function reset() {
      if (timer) { clearInterval(timer); timer = null; $("lpplay").textContent = "Пуск"; }
      section(+$("lpz").value); draw3();
      data = build($("lpmode").value === "hole"); step = 0;
      stack($("lptab"), data.st.map(function (s) { return s.tab; }));
      stack($("lplog"), data.st.map(function (s) { return s.log; }));
      render();
    }
    function next() { if (step < data.st.length - 1) { step++; render(); } else if (timer) { clearInterval(timer); timer = null; $("lpplay").textContent = "Пуск"; } }
    $("lpstep").addEventListener("click", next);
    $("lpreset").addEventListener("click", reset);
    $("lpmode").addEventListener("change", reset);
    $("lpz").addEventListener("change", reset);
    $("lpall").addEventListener("click", function () { $("lpz").value = "20"; $("lpmode").value = "ok"; view3.reset(); reset(); });
    $("lpplay").addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = "Пуск"; return; }
      if (step >= data.st.length - 1) { step = 0; render(); }
      timer = setInterval(next, 700); this.textContent = "Пауза";
    });
    reset();
  })();
})();
