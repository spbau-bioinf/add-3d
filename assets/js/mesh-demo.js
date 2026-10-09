/* Интерактивные демонстрации task 2-0a: нормаль, связность, срезы сетки. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(tag, attrs, s, parent) { var e = el(tag, attrs, parent); e.textContent = s; return e; }
  function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  function fmt(x, d) { return (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d === undefined ? 3 : d).replace(".", ",").replace("-", "−"); }
  function fnum(x) { return Math.abs(x - Math.round(x)) < 1e-9 ? fmt(x, 0) : fmt(x, 2); }
  function vec(v) { return "(" + v.map(fnum).join("; ") + ")"; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function unit(n) { var L = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / L, n[1] / L, n[2] / L]; }
  /* Все состояния блока лежат друг на друге в одной ячейке сетки, видно одно:
     высота блока равна высоте самого большого состояния и не скачет при переключении. */
  function stack(box, list, html) {
    clear(box); box.classList.add("stack");
    list.forEach(function (s) { var d = document.createElement("div"); d[html ? "innerHTML" : "textContent"] = s; box.appendChild(d); });
  }
  function showIn(box, i) { Array.prototype.forEach.call(box.children, function (d, k) { d.classList.toggle("on", k === i); }); }
  function markers(svg, list) {
    var defs = el("defs", {}, svg);
    list.forEach(function (m) {
      var mk = el("marker", {id: m[0], viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: m[2] || 7, markerHeight: m[2] || 7, orient: "auto-start-reverse"}, defs);
      el("path", {d: "M0,0 L10,5 L0,10 z", style: "fill:" + m[1]}, mk);
    });
  }

  /* Ортогональная проекция с вращением мышью: z — вверх, наблюдатель со стороны −y.
     o.zoom — id ползунка масштаба (рядом <output id="<id>v">): ползунок и колесо над svg меняют v.zoom;
     v.reset() возвращает исходный поворот и масштаб 100 %. */
  function View(svg, o) {
    var v = {yaw: o.yaw, pitch: o.pitch, zoom: 1};
    v.p = function (q) {
      var x = q[0] - o.c[0], y = q[1] - o.c[1], z = q[2] - o.c[2];
      var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      var x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      var s = o.s * v.zoom;
      return [o.cx + s * x1, o.cy - s * (y1 * sp + z * cp), y1 * cp - z * sp];
    };
    v.away = function (n) { var y1 = n[0] * Math.sin(v.yaw) + n[1] * Math.cos(v.yaw); return y1 * Math.cos(v.pitch) - n[2] * Math.sin(v.pitch) > 0; };
    var drag = null;
    svg.addEventListener("pointerdown", function (e) { drag = {x: e.clientX, y: e.clientY, yaw: v.yaw, pitch: v.pitch}; });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      v.yaw = drag.yaw - (e.clientX - drag.x) * 0.01;
      v.pitch = Math.max(-1.45, Math.min(1.45, drag.pitch + (e.clientY - drag.y) * 0.01));
      o.redraw();
    });
    window.addEventListener("pointerup", function () { drag = null; });
    var zin = o.zoom && document.getElementById(o.zoom), zout = zin && document.getElementById(o.zoom + "v");
    v.setZoom = function (k) { if (!zin) return; zin.value = k; v.zoom = zin.value / 100; zout.textContent = zin.value + "\u00a0%"; };
    if (zin) {
      zin.addEventListener("input", function () { v.setZoom(+zin.value); o.redraw(); });
      svg.addEventListener("wheel", function (e) { e.preventDefault(); v.setZoom(+zin.value + (e.deltaY < 0 ? 10 : -10)); o.redraw(); }, {passive: false});
    }
    v.reset = function () { v.yaw = o.yaw; v.pitch = o.pitch; v.zoom = 1; v.setZoom(100); };
    return v;
  }

  /* ---------- 1. Пирамида ---------- */
  // Нумерация вершин — как у index_mesh для pyramid.stl (порядок первого появления в файле).
  var V = [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]];
  var F0 = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
  var F = F0.map(function (f) { return f.slice(); });
  var sel = 3, selEdge = "1-2";
  var svg = document.getElementById("pyr");
  var view = View(svg, {c: [0.25, 0.25, 0.25], cx: 260, cy: 205, s: 215, yaw: -65 * Math.PI / 180, pitch: 22 * Math.PI / 180, zoom: "pzoom", redraw: drawPyr});
  function normalOf(f) { return unit(cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]]))); }
  function flipped(i) { return F[i][1] !== F0[i][1]; }
  function centroid(f, P) { return [0, 1, 2].map(function (k) { return (P[f[0]][k] + P[f[1]][k] + P[f[2]][k]) / 3; }); }
  function edgeUses() {
    var uses = {};
    F.forEach(function (f, i) {
      [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
        var key = Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1]);
        (uses[key] = uses[key] || []).push({f: i, a: e[0], b: e[1]});
      });
    });
    return uses;
  }
  function drawPyr() {
    clear(svg);
    markers(svg, [["ah", "var(--md-normal)"], ["ahb", "var(--md-normal-bad)"], ["ahs", "var(--c-muted)", 5], ["ahg", "var(--c-accent)", 6], ["ahr", "var(--c-bad)", 6]]);
    var uses = edgeUses(), su = selEdge.split("-").map(Number), selOk = uses[selEdge][0].a === uses[selEdge][1].b;
    var adj = uses[selEdge].map(function (x) { return x.f; });
    var order = F.map(function (f, i) { var c = centroid(f, V); return {i: i, c: c, depth: view.p(c)[2]}; })
      .sort(function (p, q) { return q.depth - p.depth; });
    order.forEach(function (o) {
      var f = F[o.i], n = normalOf(f), away = view.away(n), bad = flipped(o.i);
      var tip = [o.c[0] + 0.42 * n[0], o.c[1] + 0.42 * n[1], o.c[2] + 0.42 * n[2]];
      var p0 = view.p(o.c), p1 = view.p(tip);
      function arrow() {
        el("line", {x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], "stroke-width": 2.5,
          style: "stroke:" + (bad ? "var(--md-normal-bad)" : "var(--md-normal)"), "marker-end": "url(#" + (bad ? "ahb" : "ah") + ")",
          "stroke-dasharray": away ? "5 4" : "none"}, svg);
      }
      if (away) arrow();
      var pts = f.map(function (k) { var p = view.p(V[k]); return p[0] + "," + p[1]; }).join(" ");
      var isAdj = adj.indexOf(o.i) >= 0;
      var poly = el("polygon", {points: pts, "stroke-width": isAdj ? 3.5 : (o.i === sel ? 3 : 1.5), "stroke-linejoin": "round",
        style: "cursor:pointer;fill-opacity:0.82;fill:" + (bad ? "var(--md-face-bad)" : (o.i === sel ? "var(--md-face-sel)" : "var(--md-face)")) + ";stroke:" + (isAdj ? "var(--md-hl)" : "var(--md-stroke)")}, svg);
      poly.addEventListener("click", function () { sel = o.i; update(); });
      if (!away) {
        // стрелки обхода вершин внутри грани
        [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (s) {
          var onSel = (Math.min(s[0], s[1]) === su[0] && Math.max(s[0], s[1]) === su[1]);
          var A = V[s[0]], B = V[s[1]], q = function (t) { return [0, 1, 2].map(function (k) { var m = A[k] + (B[k] - A[k]) * t; return m + (o.c[k] - m) * 0.28; }); };
          var a = view.p(q(0.3)), b = view.p(q(0.7));
          el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-width": onSel ? 2.6 : 1.3,
            style: "pointer-events:none;stroke:" + (onSel ? (selOk ? "var(--c-accent)" : "var(--c-bad)") : "var(--c-muted)"),
            "marker-end": "url(#" + (onSel ? (selOk ? "ahg" : "ahr") : "ahs") + ")"}, svg);
        });
      }
      var lab = view.p(o.c);
      txt("text", {x: lab[0], y: lab[1] + 4, "text-anchor": "middle", class: isAdj ? "svg-hl" : "svg-text", style: "pointer-events:none;font-weight:600;opacity:" + (away && !isAdj ? 0.45 : 1)}, "f" + o.i, svg);
      if (!away) arrow();
    });
    var A = view.p(V[su[0]]), B = view.p(V[su[1]]);
    el("line", {x1: A[0], y1: A[1], x2: B[0], y2: B[1], "stroke-width": 5, "stroke-linecap": "round", style: "pointer-events:none;stroke:var(--md-hl);opacity:0.75"}, svg);
    var C = view.p([0.25, 0.25, 0.25]), M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], mdx = M[0] - C[0], mdy = M[1] - C[1], mL = Math.hypot(mdx, mdy) || 1;
    document.getElementById("edgeinfo").innerHTML = "Выбрано <b>ребро (v" + su[0] + ", v" + su[1] + ")</b> — общая сторона <b>граней f" + adj[0] + " и f" + adj[1] + "</b>; на рисунке они выделены желтым.";
    V.forEach(function (v, k) {
      var p = view.p(v), dx = p[0] - C[0], dy = p[1] - C[1], L = Math.hypot(dx, dy) || 1;
      el("circle", {cx: p[0], cy: p[1], r: 3.5, style: "fill:var(--c-text)"}, svg);
      var tag = "v" + k + (k === su[0] ? " = u" : k === su[1] ? " = v" : "");
      txt("text", {x: p[0] + 22 * dx / L, y: p[1] + 22 * dy / L + 4, "text-anchor": "middle", class: (k === su[0] || k === su[1]) ? "svg-hl" : "svg-mono"}, tag, svg);
    });
    txt("text", {x: 8, y: 392, class: "svg-muted"}, "пунктир — нормаль от наблюдателя; желтое — выбранное ребро", svg);
  }
  // расчет нормали для каждой грани в обоих направлениях обхода: 8 состояний одного блока
  function calcText(i, fl) {
    var f = fl ? [F0[i][0], F0[i][2], F0[i][1]] : F0[i], a = V[f[0]], b = V[f[1]], c = V[f[2]], ab = sub(b, a), ac = sub(c, a), n = cross(ab, ac);
    return "Грань f" + i + ": вершины v" + f.join(", v") + (fl ? "   (развернута)" : "") + "\n" +
      "a = " + vec(a) + ", b = " + vec(b) + ", c = " + vec(c) + "\n" +
      "b − a = " + vec(ab) + ", c − a = " + vec(ac) + "\n" +
      "n = (b − a) × (c − a) = " + vec(n) + "\n" +
      (fl ? "Нормаль направлена внутрь пирамиды." : "Нормаль направлена наружу.");
  }
  var calcBox = document.getElementById("calc");
  stack(calcBox, [].concat.apply([], F0.map(function (f, i) { return [calcText(i, false), calcText(i, true)]; })), false);
  function update() {
    drawPyr();
    showIn(calcBox, sel * 2 + (flipped(sel) ? 1 : 0));
    var uses = edgeUses(), same = 0;
    var rows = "<tr><th>Ребро (u, v)</th><th>Первая грань</th><th>Вторая грань</th><th></th></tr>";
    Object.keys(uses).sort().forEach(function (key) {
      var u = uses[key], ok = u[0].a === u[1].b && u[0].b === u[1].a, uv = key.split("-");
      if (!ok) same++;
      var dir = function (x) { return "f" + x.f + ": " + (x.a == uv[0] ? "u → v" : "v → u"); };
      rows += "<tr class='pick" + (ok ? "" : " badrow") + (key === selEdge ? " picked" : "") + "' data-e='" + key + "'><td class='mono'>(v" + uv[0] + ", v" + uv[1] + ")</td>" +
        "<td>" + dir(u[0]) + "</td><td>" + dir(u[1]) + "</td>" +
        "<td class='" + (ok ? "ok'>в разные стороны" : "bad'>в одну сторону") + "</td></tr>";
    });
    var tbl = document.getElementById("edges");
    tbl.innerHTML = rows;
    Array.prototype.forEach.call(tbl.querySelectorAll("tr.pick"), function (tr) { tr.addEventListener("click", function () { selEdge = tr.getAttribute("data-e"); update(); }); });
    var nf = F.filter(function (f, i) { return flipped(i); }).length;
    document.getElementById("pyrstats").innerHTML =
      "<span class='stat'>Развернуто граней: " + nf + "</span>" +
      "<span class='stat'>Ребер с одним направлением обхода: <b class='" + (same ? "bad" : "ok") + "'>" + same + "</b></span>";
    updateVol();
  }
  function updateVol() {
    var oi = +document.getElementById("origin").value, o = [[0, 0, 0], [0.25, 0.25, 0.25], [55, 45, 0]][oi], vol = 0;
    var rows = "<tr><th>Грань</th><th>Вершины</th><th class='num'>Вклад a · (b × c) / 6</th></tr>";
    F.forEach(function (f, i) {
      var v = dot(sub(V[f[0]], o), cross(sub(V[f[1]], o), sub(V[f[2]], o))) / 6; vol += v;
      rows += "<tr" + (flipped(i) ? " class='badrow'" : "") + "><td>f" + i + (flipped(i) ? " (развернута)" : "") + "</td><td class='mono'>v" + f.join(", v") + "</td><td class='num'>" + fmt(v, 4) + "</td></tr>";
    });
    var ok = Math.abs(vol - 1 / 6) < 1e-9;
    rows += "<tr class='sumrow'><td colspan='2'>Сумма — объем со знаком</td><td class='num " + (ok ? "ok" : "bad") + "'>" + fmt(vol, 4) + "</td></tr>";
    document.getElementById("voltable").innerHTML = rows;
    document.getElementById("volcap").textContent = ok
      ? "Сетка исправна: сумма равна объему пирамиды 1/6 ≈ 0,1667 при любом начале координат. Меняются только вклады отдельных граней."
      : "В сетке есть развернутые грани: сумма уже не объем пирамиды и зависит от начала координат. Переключите начало и сравните.";
  }
  /* площадь квадрата треугольниками от точки O */
  var a2 = document.getElementById("area2d"), SQ = [[1, 1], [2, 1], [2, 2], [1, 2]], O2 = [0, 0];
  function AX(x) { return 110 + x * 110; } function AY(y) { return 275 - y * 110; }
  function drawArea() {
    clear(a2);
    markers(a2, [["aah", "var(--md-normal)", 6]]);
    el("line", {x1: AX(-0.9), y1: AY(0), x2: AX(3.9), y2: AY(0), style: "stroke:var(--c-border)"}, a2);
    el("line", {x1: AX(0), y1: AY(-0.4), x2: AX(0), y2: AY(2.4), style: "stroke:var(--c-border)"}, a2);
    var rows = "<tr><th>Сторона квадрата</th><th>Нормаль стороны</th><th class='num'>Площадь треугольника со знаком</th></tr>", sum = 0;
    var names = ["нижняя", "правая", "верхняя", "левая"], tris = [];
    SQ.forEach(function (p, i) {
      var q = SQ[(i + 1) % 4], x1 = p[0] - O2[0], y1 = p[1] - O2[1], x2 = q[0] - O2[0], y2 = q[1] - O2[1];
      var A = (x1 * y2 - x2 * y1) / 2; sum += A; tris.push({p: p, q: q, A: A});
      rows += "<tr><td>" + names[i] + "</td><td>" + (A > 1e-9 ? "смотрит от O" : A < -1e-9 ? "смотрит на O" : "O на линии стороны") + "</td><td class='num " + (A > 1e-9 ? "ok" : A < -1e-9 ? "bad" : "") + "'>" + fmt(A, 3) + "</td></tr>";
    });
    rows += "<tr class='sumrow'><td colspan='2'>Сумма</td><td class='num ok'>" + fmt(sum, 3) + "</td></tr>";
    document.getElementById("areatable").innerHTML = rows;
    tris.forEach(function (t) {
      if (Math.abs(t.A) < 1e-9) return;
      el("polygon", {points: [O2, t.p, t.q].map(function (r) { return AX(r[0]) + "," + AY(r[1]); }).join(" "),
        style: "fill:" + (t.A > 0 ? "var(--c-accent)" : "var(--c-bad)") + ";fill-opacity:0.18;stroke:" + (t.A > 0 ? "var(--c-accent)" : "var(--c-bad)") + ";stroke-width:1.2;stroke-dasharray:4 3"}, a2);
    });
    el("polygon", {points: SQ.map(function (r) { return AX(r[0]) + "," + AY(r[1]); }).join(" "), style: "fill:none;stroke:var(--md-stroke);stroke-width:3"}, a2);
    tris.forEach(function (t) {
      var m = [(t.p[0] + t.q[0]) / 2, (t.p[1] + t.q[1]) / 2], d = [t.q[0] - t.p[0], t.q[1] - t.p[1]], n = [d[1], -d[0]];
      el("line", {x1: AX(m[0]), y1: AY(m[1]), x2: AX(m[0] + 0.32 * n[0]), y2: AY(m[1] + 0.32 * n[1]), "stroke-width": 2.2, style: "stroke:var(--md-normal)", "marker-end": "url(#aah)"}, a2);
      var c = [(O2[0] + t.p[0] + t.q[0]) / 3, (O2[1] + t.p[1] + t.q[1]) / 3];
      if (Math.abs(t.A) > 0.04) txt("text", {x: AX(c[0]), y: AY(c[1]) + 5, "text-anchor": "middle", class: "svg-text", style: "font-size:16px;font-weight:800;paint-order:stroke;stroke:var(--c-bg);stroke-width:5px;stroke-linejoin:round;fill:" + (t.A > 0 ? "var(--c-accent)" : "var(--c-bad)")}, (t.A > 0 ? "+" : "") + fmt(t.A, 2), a2);
    });
    txt("text", {x: AX(1.5), y: AY(2) - 40, "text-anchor": "middle", class: "svg-muted"}, "квадрат, S = 1", a2);
    el("circle", {cx: AX(O2[0]), cy: AY(O2[1]), r: 9, style: "fill:var(--md-hl);stroke:var(--c-text);stroke-width:1.5;cursor:grab"}, a2);
    txt("text", {x: AX(O2[0]) - 14, y: AY(O2[1]) + 22, class: "svg-mono", style: "font-weight:700"}, "O (" + fmt(O2[0], 1) + "; " + fmt(O2[1], 1) + ")", a2);
  }
  var aDrag = false;
  function aPos(e) {
    var r = a2.getBoundingClientRect(), k = 560 / r.width;
    var x = ((e.clientX - r.left) * k - 110) / 110, y = (275 - (e.clientY - r.top) * k) / 110;
    O2 = [Math.max(-0.9, Math.min(3.8, Math.round(x * 10) / 10)), Math.max(-0.35, Math.min(2.4, Math.round(y * 10) / 10))];
    drawArea();
  }
  a2.addEventListener("pointerdown", function (e) { aDrag = true; aPos(e); });
  window.addEventListener("pointermove", function (e) { if (aDrag) aPos(e); });
  window.addEventListener("pointerup", function () { aDrag = false; });
  drawArea();

  document.getElementById("flip").addEventListener("click", function () { var f = F[sel], t = f[1]; f[1] = f[2]; f[2] = t; update(); });
  document.getElementById("reset").addEventListener("click", function () {
    // исходное состояние: грани без разворотов, исходные поворот и масштаб, выбраны грань f3 и ребро (v1, v2)
    F = F0.map(function (f) { return f.slice(); });
    view.reset();
    sel = 3; selEdge = "1-2";
    update();
  });
  document.getElementById("origin").addEventListener("change", updateVol);
  update();

  /* ---------- 2. Поддержки ---------- */
  // Контур обходится против часовой стрелки (ось y вверх), поэтому нормаль (dy, −dx) смотрит наружу.
  // Наклоны нижних граней полки — ровно 10° и 30°.
  var T10 = 20 * Math.tan(10 * Math.PI / 180), T30 = 20 * Math.tan(30 * Math.PI / 180);
  var P = [[20, 0], [40, 0], [40, 30], [60, 30 + T30], [60, 52], [0, 52], [0, 40 + T10], [20, 40]];
  var sup = document.getElementById("sup"), thr = document.getElementById("thr"), flipTop = document.getElementById("flipTop");
  function sx(x) { return 150 + x * 5; } function sy(y) { return 290 - y * 4.6; }
  function drawSup() {
    clear(sup);
    markers(sup, [["sah", "var(--md-normal)", 6], ["sahb", "var(--md-normal-bad)", 6]]);
    el("line", {x1: 40, y1: sy(0), x2: 520, y2: sy(0), "stroke-width": 3, style: "stroke:var(--c-muted)"}, sup);
    txt("text", {x: 44, y: sy(0) + 18, class: "svg-muted"}, "стол принтера", sup);
    var t = +thr.value; document.getElementById("thrv").textContent = t + "°";
    var segs = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      var n = [dy / L, -dx / L], top = (a[1] === 52 && b[1] === 52), wrong = top && flipTop.checked;
      if (wrong) n = [-n[0], -n[1]];
      var onBed = a[1] === 0 && b[1] === 0;
      var slope = Math.round(Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI * 1e6) / 1e6;
      var needs = !onBed && n[1] < -1e-9 && slope <= t;
      segs.push({a: a, b: b, n: n, needs: needs, slope: slope, wrong: wrong});
    }
    segs.forEach(function (s) {
      if (!s.needs) return;
      if (s.wrong) { txt("text", {x: sx(30), y: sy(52) - 34, "text-anchor": "middle", class: "svg-text", style: "fill:var(--md-warn);font-weight:600"}, "слайсер считает верх нависанием", sup); return; }
      var yTop = function (x) { return s.a[1] + (s.b[1] - s.a[1]) * (x - s.a[0]) / (s.b[0] - s.a[0]); };
      var x0 = Math.min(s.a[0], s.b[0]), x1 = Math.max(s.a[0], s.b[0]);
      for (var x = x0 + 1.5; x < x1; x += 3) el("line", {x1: sx(x), y1: sy(0), x2: sx(x), y2: sy(yTop(x)), "stroke-width": 1.5, style: "stroke:var(--md-warn);opacity:0.7"}, sup);
    });
    el("polygon", {points: P.map(function (p) { return sx(p[0]) + "," + sy(p[1]); }).join(" "), style: "fill:var(--md-face);fill-opacity:0.9;stroke:none"}, sup);
    segs.forEach(function (s) {
      el("line", {x1: sx(s.a[0]), y1: sy(s.a[1]), x2: sx(s.b[0]), y2: sy(s.b[1]), "stroke-width": s.needs ? 5 : 2.5, "stroke-linecap": "round",
        style: "stroke:" + (s.needs ? "var(--md-warn)" : "var(--md-stroke)")}, sup);
      var mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
      el("line", {x1: sx(mx), y1: sy(my), x2: sx(mx) + 34 * s.n[0], y2: sy(my) - 34 * s.n[1], "stroke-width": 2.2,
        style: "stroke:" + (s.wrong ? "var(--md-normal-bad)" : "var(--md-normal)"), "marker-end": "url(#" + (s.wrong ? "sahb" : "sah") + ")"}, sup);
      if (s.n[1] < -1e-9 && !(s.a[1] === 0 && s.b[1] === 0)) {
        txt("text", {x: sx(mx) + 48 * s.n[0] + (s.n[0] >= 0 ? 6 : -6), y: sy(my) - 48 * s.n[1] + 4, "text-anchor": s.n[0] >= 0 ? "start" : "end",
          class: "svg-text", style: "font-weight:600;fill:" + (s.needs ? "var(--md-warn)" : "var(--c-muted)")}, Math.round(s.slope) + "°", sup);
      }
    });
  }
  thr.addEventListener("input", drawSup); flipTop.addEventListener("change", drawSup); drawSup();

  /* ---------- 3. Шаги связности ---------- */
  var SOUP = [[[0, 0, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 0], [0, 1, 0], [1, 0, 0]], [[0, 0, 0], [0, 0, 1], [0, 1, 0]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]];
  var NORMALS = [[0, -1, 0], [0, 0, -1], [-1, 0, 0], [0.57735, 0.57735, 0.57735]];
  var verts = [], idx = {}, faces = SOUP.map(function (t) {
    return t.map(function (p) { var k = p.join(","); if (!(k in idx)) { idx[k] = verts.length; verts.push(p); } return idx[k]; });
  });
  var counts = verts.map(function (v, i) { var n = 0; faces.forEach(function (f) { f.forEach(function (k) { if (k === i) n++; }); }); return n; });
  var STEPS = ["1. Файл STL", "2. Слияние вершин", "3. Грани — номера", "4. Ребра и соседи"];
  var step = 0, box = document.getElementById("stepbox");
  function chip(p, colored) { var k = idx[p.join(",")]; return "<span class='chip " + (colored ? "c" + k : "plain") + "' data-v='" + k + "'>(" + p.join(", ") + ")</span>"; }
  function stepHtml(step) {
    var h = "";
    if (step === 0) {
      h += "<p>Так пирамида записана в <code>pyramid.stl</code>. У каждой грани свои три точки. Всего 4 · 3 = 12 записей вершин; программа пока не знает, что некоторые из них — одна и та же точка.</p>";
      h += "<table><tr><th>Грань</th><th>Вершина 1</th><th>Вершина 2</th><th>Вершина 3</th></tr>";
      SOUP.forEach(function (t, i) { h += "<tr><td>f" + i + "</td>" + t.map(function (p) { return "<td>" + chip(p, false) + "</td>"; }).join("") + "</tr>"; });
      h += "</table>";
    } else if (step === 1) {
      h += "<p>Программа идет по записям по порядку и ведет словарь «координаты → номер». Новые координаты получают следующий номер, уже известные — прежний. Одинаковые координаты окрашены одним цветом.</p>";
      h += "<div class='grid2'><div><table><tr><th>Грань</th><th>Вершина 1</th><th>Вершина 2</th><th>Вершина 3</th></tr>";
      SOUP.forEach(function (t, i) { h += "<tr><td>f" + i + "</td>" + t.map(function (p) { return "<td>" + chip(p, true) + "</td>"; }).join("") + "</tr>"; });
      h += "</table></div><div><table><tr><th>Номер</th><th>Координаты</th><th>Записей</th></tr>";
      verts.forEach(function (v, i) { h += "<tr><td class='mono'>v" + i + "</td><td>" + chip(v, true) + "</td><td>" + counts[i] + "</td></tr>"; });
      h += "</table><p class='caption'>12 записей → 4 вершины. Точка (0, 0, 0) записана трижды: она входит в три грани.</p></div></div>";
    } else if (step === 2) {
      h += "<p>Теперь грань хранит не координаты, а номера вершин. Это индексированная сетка: так устроены OBJ, OFF и 3MF. Порядок номеров внутри грани сохранен — он задает нормаль (раздел 1).</p>";
      h += "<table><tr><th>Грань</th><th>Номера вершин</th><th>То же координатами</th></tr>";
      faces.forEach(function (f, i) { h += "<tr><td>f" + i + "</td><td class='mono'>(" + f.join(", ") + ")</td><td>" + SOUP[i].map(function (p) { return chip(p, true); }).join(" ") + "</td></tr>"; });
      h += "</table><p class='caption'>Номера зависят от порядка граней в файле: вершина получает номер при первом появлении.</p>";
    } else {
      var E = {};
      faces.forEach(function (f, i) { [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) { var k = Math.min(e[0], e[1]) + "," + Math.max(e[0], e[1]); (E[k] = E[k] || []).push(i); }); });
      h += "<p>У каждой грани три стороны: (a, b), (b, c), (c, a). Сторону записывают меньшим номером вперед, чтобы (1, 0) и (0, 1) считались одним ребром. Две грани соседние, если у них общее ребро.</p>";
      h += "<table><tr><th>Ребро</th><th>Грани</th><th>Граней у ребра</th></tr>";
      Object.keys(E).sort().forEach(function (k) { h += "<tr><td class='mono'>(" + k.replace(",", ", ") + ")</td><td>" + E[k].map(function (i) { return "f" + i; }).join(", ") + "</td><td class='" + (E[k].length === 2 ? "ok" : "bad") + "'>" + E[k].length + "</td></tr>"; });
      h += "</table><p class='caption'>12 сторон граней → 6 ребер: каждое ребро общее для двух граней. V − E + F = 4 − 6 + 4 = 2. Если у ребра одна грань — это край (дыра), если больше двух — сингулярное ребро (task 2-3).</p>";
    }
    return h;
  }
  stack(box, STEPS.map(function (s, i) { return stepHtml(i); }), true);
  function renderStep() {
    document.getElementById("steplabels").innerHTML = STEPS.map(function (s, i) { return "<span class='" + (i === step ? "on" : "") + "'>" + s + "</span>"; }).join("");
    showIn(box, step);
    document.getElementById("prev").disabled = step === 0;
    document.getElementById("next").disabled = step === STEPS.length - 1;
  }
  box.addEventListener("mouseover", function (e) {
    var c = e.target.closest ? e.target.closest(".chip") : null;
    Array.prototype.forEach.call(box.querySelectorAll(".chip"), function (x) { x.classList.toggle("hl", !!c && step > 0 && x.getAttribute("data-v") === c.getAttribute("data-v")); });
  });
  box.addEventListener("mouseleave", function () { Array.prototype.forEach.call(box.querySelectorAll(".chip"), function (x) { x.classList.remove("hl"); }); });
  document.getElementById("prev").addEventListener("click", function () { step--; renderStep(); });
  document.getElementById("next").addEventListener("click", function () { step++; renderStep(); });
  renderStep();

  /* ---------- 3б. Чтение STL строка за строкой ---------- */
  var LINES = ["solid triangular_pyramid"];
  SOUP.forEach(function (t, i) {
    LINES.push("  facet normal " + NORMALS[i].join(" "));
    LINES.push("    outer loop");
    t.forEach(function (p) { LINES.push("      vertex " + p.join(" ")); });
    LINES.push("    endloop");
    LINES.push("  endfacet");
  });
  LINES.push("endsolid triangular_pyramid");
  var stlBox = document.getElementById("stltext"), r3 = document.getElementById("read3d");
  stlBox.innerHTML = LINES.map(function (l, i) { return "<div data-i='" + i + "'>" + l.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</div>"; }).join("");
  var COLORS = ["var(--md-p0)", "var(--md-p1)", "var(--md-p2)", "var(--md-p3)"];
  var cur = -1, timer = null, R;
  var rview = View(r3, {c: [0.25, 0.25, 0.3], cx: 230, cy: 200, s: 210, yaw: -65 * Math.PI / 180, pitch: 22 * Math.PI / 180, zoom: "rzoom", redraw: drawRead});
  function replay(upto) {
    R = {vid: {}, verts: [], faces: [], normals: [], loop: [], records: 0, edges: {}, msg: "", flash: -1, newFace: -1, normal: null, curNormal: null};
    for (var i = 0; i <= upto; i++) {
      var w = LINES[i].trim().split(/\s+/);
      R.flash = -1; R.newFace = -1;
      if (w[0] === "solid") R.msg = "Начало объекта «" + w[1] + "». Имя на геометрию не влияет.";
      else if (w[0] === "facet") { R.curNormal = w.slice(2, 5).map(Number); R.msg = "Новая грань. Записанная нормаль (" + w.slice(2, 5).join("; ") + ") запоминается, но для связности не нужна."; }
      else if (w[0] === "outer") { R.loop = []; R.msg = "Начинается список из трех вершин грани."; }
      else if (w[0] === "vertex") {
        var p = w.slice(1, 4).map(Number), k = p.join(",");
        R.records++;
        if (!(k in R.vid)) { R.vid[k] = R.verts.length; R.verts.push(p); R.msg = "Координаты (" + p.join(", ") + ") появились впервые → новая вершина v" + R.vid[k] + "."; }
        else R.msg = "Координаты (" + p.join(", ") + ") уже есть в словаре → это вершина v" + R.vid[k] + ", новая точка не создается.";
        R.loop.push(R.vid[k]); R.flash = R.vid[k];
      } else if (w[0] === "endloop") {
        var f = R.loop.slice(); R.faces.push(f); R.newFace = R.faces.length - 1;
        var made = [], shared = [];
        [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
          var key = Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1]);
          R.edges[key] = (R.edges[key] || 0) + 1;
          (R.edges[key] === 1 ? made : shared).push("(" + key.replace("-", ", ") + ")");
        });
        R.msg = "Грань f" + R.newFace + " = (" + f.join(", ") + ") закрыта. " + (made.length ? "Новые ребра: " + made.join(", ") + ". " : "") + (shared.length ? "Ребра " + shared.join(", ") + " уже были у другой грани → стали общими." : "");
      } else if (w[0] === "endfacet") { R.normals.push(R.curNormal); R.msg = "Грань f" + (R.faces.length - 1) + " завершена; стрелка — нормаль из файла."; }
      else if (w[0] === "endsolid") {
        var nb = Object.keys(R.edges).filter(function (k) { return R.edges[k] === 1; }).length;
        R.msg = "Файл прочитан: 12 записей → " + R.verts.length + " вершины, " + R.faces.length + " грани, " + Object.keys(R.edges).length + " ребер. Краевых ребер " + nb + ": сетка замкнута, V − E + F = 2.";
      }
    }
  }
  function drawRead() {
    clear(r3);
    markers(r3, [["rah", "var(--md-normal)"]]);
    var order = R.faces.map(function (f, i) { var c = centroid(f, R.verts); return {i: i, c: c, depth: rview.p(c)[2]}; }).sort(function (p, q) { return q.depth - p.depth; });
    order.forEach(function (o) {
      var f = R.faces[o.i];
      el("polygon", {points: f.map(function (k) { var p = rview.p(R.verts[k]); return p[0] + "," + p[1]; }).join(" "),
        style: "fill-opacity:" + (o.i === R.newFace ? 0.95 : 0.7) + ";fill:" + (o.i === R.newFace ? "var(--md-face-sel)" : "var(--md-face)") + ";stroke:none"}, r3);
      if (R.normals[o.i]) {
        var n = R.normals[o.i], a = rview.p(o.c), b = rview.p([o.c[0] + 0.38 * n[0], o.c[1] + 0.38 * n[1], o.c[2] + 0.38 * n[2]]);
        el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-width": 2.2, style: "stroke:var(--md-normal)", "marker-end": "url(#rah)", "stroke-dasharray": rview.away(n) ? "5 4" : "none"}, r3);
      }
      var lp = rview.p(o.c); txt("text", {x: lp[0], y: lp[1] + 4, "text-anchor": "middle", class: "svg-text", style: "font-weight:600"}, "f" + o.i, r3);
    });
    Object.keys(R.edges).forEach(function (k) {
      var e = k.split("-").map(Number), a = rview.p(R.verts[e[0]]), b = rview.p(R.verts[e[1]]), two = R.edges[k] >= 2;
      el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-width": two ? 3 : 3.5, "stroke-linecap": "round", style: "stroke:" + (two ? "var(--c-accent)" : "var(--c-bad)")}, r3);
    });
    if (R.loop.length && R.loop.length < 3) {
      for (var i = 1; i < R.loop.length; i++) { var a = rview.p(R.verts[R.loop[i - 1]]), b = rview.p(R.verts[R.loop[i]]); el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-width": 2, "stroke-dasharray": "4 4", style: "stroke:var(--c-muted)"}, r3); }
    }
    var C = rview.p([0.25, 0.25, 0.3]);
    R.verts.forEach(function (v, k) {
      var p = rview.p(v), dx = p[0] - C[0], dy = p[1] - C[1], L = Math.hypot(dx, dy) || 1;
      if (k === R.flash) el("circle", {cx: p[0], cy: p[1], r: 13, style: "fill:none;stroke:var(--md-hl);stroke-width:3"}, r3);
      el("circle", {cx: p[0], cy: p[1], r: 6, style: "fill:" + COLORS[k] + ";stroke:var(--c-bg-soft);stroke-width:1.5"}, r3);
      txt("text", {x: p[0] + 24 * dx / L, y: p[1] + 24 * dy / L + 4, "text-anchor": "middle", class: "svg-mono", style: "font-weight:700"}, "v" + k, r3);
    });
    txt("text", {x: 8, y: 372, class: "svg-muted"}, "красное ребро — пока одна грань, зеленое — две грани", r3);
  }
  var logBox = document.getElementById("readlog"), statBox = document.getElementById("readstats"), LOGS = [], STATS = [];
  function readStats() {
    var nb = Object.keys(R.edges).filter(function (k) { return R.edges[k] === 1; }).length;
    return "<span class='stat'>Записей вершин: " + R.records + "</span><span class='stat'>Вершин V: " + R.verts.length + "</span>" +
      "<span class='stat'>Граней F: " + R.faces.length + "</span><span class='stat'>Ребер E: " + Object.keys(R.edges).length + "</span>" +
      "<span class='stat'>Краевых: <b class='" + (nb ? "bad" : "ok") + "'>" + nb + "</b></span>";
  }
  for (var li = -1; li < LINES.length; li++) {
    replay(li);
    LOGS.push(li < 0 ? "Нажмите «Пуск» или «Шаг»: программа начнет читать файл с первой строки." : "Строка " + (li + 1) + ": " + R.msg);
    STATS.push(readStats());
  }
  stack(logBox, LOGS, false); stack(statBox, STATS, true);
  function renderRead() {
    replay(cur);
    drawRead();
    Array.prototype.forEach.call(stlBox.children, function (d, i) { d.className = i === cur ? "cur" : (i < cur ? "done" : ""); });
    var c = stlBox.children[cur]; if (c) { var top = c.offsetTop - stlBox.offsetTop; if (top < stlBox.scrollTop || top > stlBox.scrollTop + stlBox.clientHeight - 30) stlBox.scrollTop = top - 60; }
    showIn(logBox, cur + 1); showIn(statBox, cur + 1);
    document.getElementById("rstep").disabled = cur >= LINES.length - 1;
  }
  function stop() { if (timer) clearInterval(timer); timer = null; document.getElementById("rplay").textContent = "Пуск"; }
  function tick() { if (cur >= LINES.length - 1) { stop(); return; } cur++; renderRead(); }
  document.getElementById("rplay").addEventListener("click", function () {
    if (timer) { stop(); return; }
    if (cur >= LINES.length - 1) cur = -1;
    document.getElementById("rplay").textContent = "Пауза";
    tick(); timer = setInterval(tick, +document.getElementById("rspeed").value);
  });
  document.getElementById("rstep").addEventListener("click", function () { stop(); tick(); });
  document.getElementById("rreset").addEventListener("click", function () { stop(); cur = -1; renderRead(); });
  document.getElementById("rfull").addEventListener("click", function () {
    // все к исходному: чтение с начала, скорость «нормально», поворот и масштаб
    stop(); cur = -1;
    Array.prototype.forEach.call(document.getElementById("rspeed").options, function (op) { op.selected = op.defaultSelected; });
    rview.reset(); renderRead();
  });
  document.getElementById("rspeed").addEventListener("change", function () { if (timer) { clearInterval(timer); timer = setInterval(tick, +this.value); } });
  stlBox.addEventListener("click", function (e) { var d = e.target.closest("div[data-i]"); if (d) { stop(); cur = +d.getAttribute("data-i"); renderRead(); } });
  renderRead();

  /* ---------- 4. Сбой слияния ---------- */
  var seam = document.getElementById("seam");
  function tx(x) { return 70 + x * 140; } function ty(y) { return 235 - y * 130; }
  function drawSeam() {
    clear(seam);
    var mode = document.getElementById("case").value, eps = +document.getElementById("eps").value, d = +document.getElementById("dig").value;
    document.getElementById("epsl").style.display = mode === "eps" ? "" : "none";
    document.getElementById("digl").style.display = mode === "eps" ? "" : "none";
    var tris = mode === "eps"
      ? [[[0, 0], [2, 0], [1, 1.6]], [[2, 0], [3, 1.6], [1 + eps, 1.6]]]
      : [[[0, 0], [2, 0], [1, 1.6]], [[2, 0], [3, 1.6], [1.5, 0.8]], [[1.5, 0.8], [3, 1.6], [1, 1.6]]];
    var key = function (p) { return p.map(function (c) { return c.toFixed(mode === "eps" ? d : 4); }).join(","); };
    var vid = {}, nv = 0, E = {};
    tris.forEach(function (t) {
      var ids = t.map(function (p) { var k = key(p); if (!(k in vid)) vid[k] = nv++; return vid[k]; });
      [[0, 1], [1, 2], [2, 0]].forEach(function (s) {
        var a = ids[s[0]], b = ids[s[1]], k = Math.min(a, b) + "-" + Math.max(a, b);
        (E[k] = E[k] || {n: 0, p: [t[s[0]], t[s[1]]]}).n++;
      });
    });
    var merged = mode === "eps" && key([1, 1.6]) === key([1 + eps, 1.6]);
    var gapPx = (mode === "eps" && !merged) ? 9 : 0;   // зазор рисуется увеличенным, иначе его не видно
    var isCopy = function (p) { return p[1] > 1.5 && p[0] > 1.00001 && p[0] < 1.01; };
    function onSeam(p) { return Math.abs(1.6 * (p[0] - 2) + 1.0 * p[1]) / Math.hypot(1.6, 1) < 0.02; }
    tris.forEach(function (t, i) {
      el("polygon", {points: t.map(function (p) { return (tx(p[0]) + (isCopy(p) ? gapPx : 0)) + "," + ty(p[1]); }).join(" "),
        style: "fill:" + (i === 0 ? "var(--md-face)" : "var(--md-face-sel)") + ";fill-opacity:0.75;stroke:none"}, seam);
      var c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
      txt("text", {x: tx(c[0]) + (i ? gapPx / 2 : 0), y: ty(c[1]) + 4, "text-anchor": "middle", class: "svg-text", style: "font-weight:600"}, mode === "t" ? ["A", "B1", "B2"][i] : ["A", "B"][i], seam);
    });
    var seamBad = 0, edgeCount = 0;
    Object.keys(E).forEach(function (k) {
      var e = E[k], s = onSeam(e.p[0]) && onSeam(e.p[1]);
      edgeCount++;
      var color = "var(--md-stroke)", w = 2;
      if (s) { if (e.n === 1) { seamBad++; color = "var(--c-bad)"; w = 4; } else { color = "var(--c-accent)"; w = 5; } }
      el("line", {x1: tx(e.p[0][0]) + (isCopy(e.p[0]) ? gapPx : 0), y1: ty(e.p[0][1]), x2: tx(e.p[1][0]) + (isCopy(e.p[1]) ? gapPx : 0), y2: ty(e.p[1][1]), "stroke-width": w, "stroke-linecap": "round", style: "stroke:" + color}, seam);
    });
    Object.keys(vid).forEach(function (k) {
      var p = k.split(",").map(Number);
      el("circle", {cx: tx(p[0]) + (isCopy(p) ? gapPx : 0), cy: ty(p[1]), r: 4.5, style: "fill:var(--c-text)"}, seam);
    });
    if (mode === "t") { el("line", {x1: 152, y1: ty(1.25) - 4, x2: tx(1.5) - 6, y2: ty(0.8) - 2, "stroke-width": 1, style: "stroke:var(--c-muted)"}, seam); txt("text", {x: 14, y: ty(1.25), class: "svg-muted"}, "вершина на ребре A", seam); }
    if (gapPx) txt("text", {x: tx(1) + gapPx + 8, y: ty(1.6) - 8, class: "svg-muted"}, "две вершины вместо одной (зазор увеличен)", seam);
    document.getElementById("seamstats").innerHTML = "<span class='stat'>Вершин: " + nv + "</span><span class='stat'>Ребер: " + edgeCount + "</span>" +
      "<span class='stat'>На линии стыка: " + (seamBad ? "<b class='bad'>" + seamBad + " краевых ребра</b>" : "<b class='ok'>одно общее ребро, 2 грани</b>") + "</span>";
    var cap, a = (1 + eps).toFixed(d).replace(".", ","), b = "1," + "0".repeat(d);
    if (mode === "t") cap = "Щели нет, но вершина граней B1 и B2 лежит на ребре грани A и не совпадает ни с одной ее вершиной. Общих ребер нет: на линии стыка три ребра с одной гранью каждое, и подсчет покажет край там, где поверхность на вид замкнута.";
    else if (eps === 0) cap = "Копии вершины совпадают точно и сливаются: у ребра две грани, грани соседние.";
    else if (merged) cap = "После округления до " + d + " знаков " + a + " и " + b + " совпали: копии слились в одну вершину, ребро общее.";
    else cap = "После округления до " + d + " знаков координаты " + a + " и " + b + " различаются: получились две вершины, а вместо общего ребра — два краевых. Программа увидит дыру, которой в модели нет.";
    document.getElementById("seamcap").textContent = cap;
  }
  ["case", "eps", "dig"].forEach(function (id) { document.getElementById(id).addEventListener("change", drawSeam); });
  drawSeam();

  /* ---------- 5. Нарезка на слои ---------- */
  // Все модели замкнуты, нормали направлены наружу (обход граней против часовой стрелки снаружи).
  function buildModel(name) {
    var V = [], F = [], H, hole, i, j;
    if (name === "vase") {
      // 5 колец по 8 вершин, центры дна и крышки; 80 граней
      var n = 8, RZ = [0, 0.6, 1.2, 1.8, 2.4], RR = [1.0, 1.25, 0.8, 0.95, 0.6];
      RZ.forEach(function (z, r) { for (var k = 0; k < n; k++) { var a = 2 * Math.PI * k / n + 0.18 * r; V.push([RR[r] * Math.cos(a), RR[r] * Math.sin(a), z]); } });
      var B = V.length; V.push([0, 0, 0]); var T = V.length; V.push([0, 0, 2.4]);
      for (i = 0; i < RZ.length - 1; i++) for (j = 0; j < n; j++) {
        var a0 = i * n + j, b0 = i * n + (j + 1) % n, c0 = (i + 1) * n + (j + 1) % n, d0 = (i + 1) * n + j;
        F.push([a0, b0, c0]); F.push([a0, c0, d0]);
      }
      for (j = 0; j < n; j++) { F.push([B, (j + 1) % n, j]); F.push([T, (RZ.length - 1) * n + j, (RZ.length - 1) * n + (j + 1) % n]); }
      H = 2.4; hole = 2;
    } else if (name === "torus") {
      // тор: 16 сечений вокруг оси, 6 точек по кругу трубы; 192 грани
      var nu = 16, nv = 6, R = 1.0, r = 0.45, zc = 0.45;
      for (i = 0; i < nu; i++) for (j = 0; j < nv; j++) {
        var u = 2 * Math.PI * i / nu, v = 2 * Math.PI * j / nv + Math.PI / nv;
        V.push([(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), zc + r * Math.sin(v)]);
      }
      var id = function (a, b) { return ((a + nu) % nu) * nv + (b + nv) % nv; };
      for (i = 0; i < nu; i++) for (j = 0; j < nv; j++) {
        F.push([id(i, j), id(i + 1, j), id(i + 1, j + 1)]); F.push([id(i, j), id(i + 1, j + 1), id(i, j + 1)]);
      }
      H = 0.9; hole = 0;
    } else {
      // четырехгранная пирамида: квадрат 2 × 2 и вершина на высоте 2
      V = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 0, 2]];
      F = [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [0, 3, 2], [0, 2, 1]];
      H = 2; hole = 0;
    }
    return {V: V, F: F, H: H, hole: hole};
  }
  var MOD = buildModel("vase"), MV = MOD.V;
  var s3 = document.getElementById("sl3d"), s2 = document.getElementById("sl2d");
  var sopt = {c: [0, 0, 1.2], cx: 230, cy: 215, s: 115, yaw: -0.5, pitch: 0.42, zoom: "slzoom", redraw: drawSlice};
  var sview = View(s3, sopt);
  function sliceAt(z, ids) {
    for (var k = 0; k < MV.length; k++) if (Math.abs(MV[k][2] - z) < 1e-6) { z += 1e-4; break; }
    var segs = [];
    ids.forEach(function (fi) {
      var f = MOD.F[fi], pts = [];
      [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
        var A = MV[e[0]], B = MV[e[1]];
        if ((A[2] - z) * (B[2] - z) < 0) {
          var t = (z - A[2]) / (B[2] - A[2]);
          pts.push({key: Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1]), p: [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), z], a: e[0], b: e[1], t: t});
        }
      });
      if (pts.length === 2) segs.push({f: fi, p: pts});
    });
    // сборка: следующий отрезок ищется по номеру общего ребра
    var byKey = {};
    segs.forEach(function (sg, i) { sg.p.forEach(function (q) { (byKey[q.key] = byKey[q.key] || []).push(i); }); });
    var used = {}, loops = [];
    function walk(iStart, fromKey) {
      var out = [], cur = iStart, prevKey = fromKey;
      while (cur !== undefined && !used[cur]) {
        used[cur] = true;
        var sg = segs[cur], q0 = sg.p[0].key === prevKey ? sg.p[0] : sg.p[1], q1 = q0 === sg.p[0] ? sg.p[1] : sg.p[0];
        if (prevKey === null) out.push(q0);
        out.push(q1);
        var nxt = (byKey[q1.key] || []).filter(function (k) { return k !== cur; })[0];
        prevKey = q1.key; cur = nxt;
      }
      return {pts: out, endKey: prevKey};
    }
    segs.forEach(function (s0, i0) {
      if (used[i0]) return;
      // идем от отрезка в одну сторону, а если контур не замкнулся — и в другую
      var fw = walk(i0, null), firstKey = fw.pts[0].key, pts = fw.pts;
      var closed = fw.pts.length > 2 && fw.endKey === firstKey;
      if (!closed) {
        var other = (byKey[firstKey] || []).filter(function (k) { return !used[k]; })[0];
        if (other !== undefined) { var bw = walk(other, firstKey); pts = bw.pts.slice().reverse().concat(pts); }
      }
      loops.push({pts: pts, closed: closed});
    });
    return {segs: segs, loops: loops, z: z};
  }
  function fillLines(loops) {
    var lines = [], closedLoops = loops.filter(function (l) { return l.closed; });
    for (var y = -1.45; y <= 1.45; y += 0.1) {
      var xs = [];
      closedLoops.forEach(function (l) {
        for (var i = 0; i < l.pts.length - 1; i++) {
          var a = l.pts[i].p, b = l.pts[i + 1].p;
          if ((a[1] - y) * (b[1] - y) < 0) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
      });
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) lines.push([[xs[k], y], [xs[k + 1], y]]);   // чет-нечет: отверстие остается пустым
    }
    return lines;
  }
  var SEGC = ["var(--md-p0)", "var(--md-p1)", "var(--md-p2)", "var(--md-p3)"];
  function setModel(keepZ) {
    MOD = buildModel(document.getElementById("slmodel").value); MV = MOD.V;
    sopt.c = [0, 0, MOD.H / 2]; sopt.s = MOD.H < 1.5 ? 135 : 115;
    var zr = document.getElementById("slz"); zr.max = (MOD.H - 0.05).toFixed(2);
    zr.value = keepZ ? zr.defaultValue : (Math.round(MOD.H * 0.4 / 0.05) * 0.05).toFixed(2);
    drawSlice();
  }
  function drawSlice() {
    var z = +document.getElementById("slz").value, mode = document.getElementById("slmode").value;
    var hole = document.getElementById("slhole").checked, all = document.getElementById("slall").checked;
    document.getElementById("slzv").textContent = fmt(z, 2) + " мм";
    var ids = MOD.F.map(function (f, i) { return i; }).filter(function (i) { return !(hole && i === MOD.hole); });
    var S = sliceAt(z, ids);
    var hit = {}; S.segs.forEach(function (sg) { hit[sg.f] = true; });
    var s0 = S.segs[0], q0 = s0 ? s0.p[0] : null;
    clear(s3);
    var R = 1.6, plane = [[-R, -R, z], [R, -R, z], [R, R, z], [-R, R, z]].map(function (q) { var p = sview.p(q); return p[0] + "," + p[1]; }).join(" ");
    var order = ids.map(function (i) { var f = MOD.F[i], c = centroid(f, MV); return {f: f, i: i, c: c, depth: sview.p(c)[2]}; }).sort(function (p, q) { return q.depth - p.depth; });
    order.forEach(function (o) {
      var away = sview.away(unit(cross(sub(MV[o.f[1]], MV[o.f[0]]), sub(MV[o.f[2]], MV[o.f[0]]))));
      var ex = s0 && o.i === s0.f;
      el("polygon", {points: o.f.map(function (k) { var p = sview.p(MV[k]); return p[0] + "," + p[1]; }).join(" "),
        style: "fill:" + (ex ? "var(--md-hl)" : hit[o.i] ? "var(--md-face-sel)" : "var(--md-face)") + ";fill-opacity:" + (ex ? 0.45 : away ? 0.25 : 0.55) + ";stroke:var(--md-stroke);stroke-opacity:" + (away ? 0.15 : 0.35) + ";stroke-width:0.8"}, s3);
    });
    el("polygon", {points: plane, style: "fill:var(--md-plane);fill-opacity:0.14;stroke:var(--md-plane);stroke-opacity:0.6;stroke-width:1"}, s3);
    function drawLoops3(L, w, color) {
      L.loops.forEach(function (l) {
        var d = l.pts.map(function (q, i) { var p = sview.p(q.p); return (i ? "L" : "M") + p[0] + "," + p[1]; }).join(" ") + (l.closed ? " Z" : "");
        el("path", {d: d, style: "fill:none;stroke:" + (color || (l.closed ? "var(--c-accent)" : "var(--c-bad)")) + ";stroke-width:" + w + ";stroke-linejoin:round"}, s3);
      });
    }
    if (all) for (var zz = 0.1; zz < MOD.H; zz += 0.2) drawLoops3(sliceAt(zz, ids), 1.4, "var(--c-muted)");
    if (mode === "seg") S.segs.forEach(function (sg, i) { var a = sview.p(sg.p[0].p), b = sview.p(sg.p[1].p); el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-width": 4, "stroke-linecap": "round", style: "stroke:" + SEGC[i % 4]}, s3); });
    else drawLoops3(S, 4);
    if (q0) {
      // сторона из примера расчета: концы, сама сторона и точка пересечения
      var A3 = sview.p(MV[q0.a]), B3 = sview.p(MV[q0.b]), P3 = sview.p(q0.p);
      el("line", {x1: A3[0], y1: A3[1], x2: B3[0], y2: B3[1], "stroke-width": 4, "stroke-linecap": "round", style: "stroke:var(--md-hl)"}, s3);
      [[A3, "v" + q0.a], [B3, "v" + q0.b]].forEach(function (t) {
        el("circle", {cx: t[0][0], cy: t[0][1], r: 4.5, style: "fill:var(--md-hl);stroke:var(--c-text);stroke-width:1"}, s3);
        txt("text", {x: t[0][0] + 9, y: t[0][1] - 7, class: "svg-hl"}, t[1], s3);
      });
      el("circle", {cx: P3[0], cy: P3[1], r: 6, style: "fill:var(--c-bg);stroke:var(--md-hl);stroke-width:3"}, s3);
      txt("text", {x: P3[0] - 12, y: P3[1] + 4, "text-anchor": "end", class: "svg-hl"}, "p", s3);
    }
    if (hole) { var hp = centroid(MOD.F[MOD.hole], MV), q = sview.p(hp); txt("text", {x: q[0], y: q[1] + 4, "text-anchor": "middle", class: "svg-text", style: "fill:var(--c-bad);font-weight:700"}, "дыра", s3); }
    // вид сверху
    clear(s2);
    var X = function (x) { return 160 + x * 95; }, Y = function (y) { return 165 - y * 95; };
    el("rect", {x: 6, y: 6, width: 308, height: 308, rx: 6, style: "fill:var(--c-bg);stroke:var(--c-border)"}, s2);
    txt("text", {x: 14, y: 24, class: "svg-muted"}, "слой на высоте " + fmt(z, 2) + " мм, вид сверху", s2);
    if (mode === "seg") {
      S.segs.forEach(function (sg, i) {
        var a = sg.p[0].p, b = sg.p[1].p;
        el("line", {x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), "stroke-width": 4, "stroke-linecap": "round", style: "stroke:" + SEGC[i % 4]}, s2);
        [a, b].forEach(function (p) { el("circle", {cx: X(p[0]), cy: Y(p[1]), r: 2.5, style: "fill:var(--c-text)"}, s2); });
      });
    } else {
      var dAll = "";
      S.loops.forEach(function (l) { if (l.closed) dAll += l.pts.map(function (q, i) { return (i ? "L" : "M") + X(q.p[0]) + "," + Y(q.p[1]); }).join(" ") + " Z "; });
      if (dAll) el("path", {d: dAll, "fill-rule": "evenodd", style: "fill:var(--md-face);fill-opacity:0.6;stroke:none"}, s2);
      S.loops.forEach(function (l) {
        var d = l.pts.map(function (q, i) { return (i ? "L" : "M") + X(q.p[0]) + "," + Y(q.p[1]); }).join(" ") + (l.closed ? " Z" : "");
        el("path", {d: d, style: "fill:none;stroke:" + (l.closed ? "var(--c-accent)" : "var(--c-bad)") + ";stroke-width:3;stroke-linejoin:round"}, s2);
        if (!l.closed) [l.pts[0], l.pts[l.pts.length - 1]].forEach(function (q) {
          el("circle", {cx: X(q.p[0]), cy: Y(q.p[1]), r: 6, style: "fill:none;stroke:var(--c-bad);stroke-width:2.5"}, s2);
        });
      });
      if (mode === "fill") fillLines(S.loops).forEach(function (ln) {
        el("line", {x1: X(ln[0][0]), y1: Y(ln[0][1]), x2: X(ln[1][0]), y2: Y(ln[1][1]), "stroke-width": 2, style: "stroke:var(--md-stroke);opacity:0.7"}, s2);
      });
    }
    if (q0) {
      el("circle", {cx: X(q0.p[0]), cy: Y(q0.p[1]), r: 6, style: "fill:var(--c-bg);stroke:var(--md-hl);stroke-width:3"}, s2);
      txt("text", {x: X(q0.p[0]) + 10, y: Y(q0.p[1]) - 8, class: "svg-hl"}, "p", s2);
    }
    if (S.loops.some(function (l) { return !l.closed; })) txt("text", {x: 14, y: 306, class: "svg-text", style: "fill:var(--c-bad);font-weight:600"}, "контур не замкнут: концы обведены", s2);
    var nClosed = S.loops.filter(function (l) { return l.closed; }).length, nOpen = S.loops.length - nClosed;
    var hz = MOD.F[MOD.hole].map(function (k) { return MV[k][2]; });
    document.getElementById("slstats").innerHTML =
      "<span class='stat'>Пересечено граней: " + S.segs.length + " из " + ids.length + "</span>" +
      "<span class='stat'>Отрезков: " + S.segs.length + "</span>" +
      "<span class='stat'>Контуров: <b class='ok'>замкнутых " + nClosed + "</b>" + (nOpen ? ", <b class='bad'>незамкнутых " + nOpen + "</b>" : "") + "</span>" +
      (hole ? "<span class='stat'>Дыра на высотах " + fmt(Math.min.apply(null, hz), 2) + "–" + fmt(Math.max.apply(null, hz), 2) + " мм</span>" : "");
    if (q0) {
      var A = MV[q0.a], B = MV[q0.b];
      document.getElementById("slcalc").textContent =
        "Пример (выделен желтым на рисунке): грань " + s0.f + ", сторона от v" + q0.a + " до v" + q0.b + "\n" +
        "a = v" + q0.a + " = (" + fmt(A[0], 3) + "; " + fmt(A[1], 3) + "; " + fmt(A[2], 2) + "), b = v" + q0.b + " = (" + fmt(B[0], 3) + "; " + fmt(B[1], 3) + "; " + fmt(B[2], 2) + "), плоскость z = " + fmt(z, 2) + "\n" +
        "t = (z − z_a) / (z_b − z_a) = (" + fmt(z, 2) + " − " + fmt(A[2], 2) + ") / (" + fmt(B[2], 2) + " − " + fmt(A[2], 2) + ") = " + fmt(q0.t, 3) + "\n" +
        "p = a + t · (b − a) = (" + fmt(q0.p[0], 3) + "; " + fmt(q0.p[1], 3) + "; " + fmt(z, 2) + ")\n" +
        "Точка p лежит на ребре (v" + Math.min(q0.a, q0.b) + ", v" + Math.max(q0.a, q0.b) + "), общем для двух граней: соседний отрезок начинается в ней же.";
    } else document.getElementById("slcalc").textContent = "Плоскость не пересекает ни одной грани.";
  }
  ["slz", "slmode", "slhole", "slall"].forEach(function (id) { document.getElementById(id).addEventListener(id === "slz" ? "input" : "change", drawSlice); });
  document.getElementById("slmodel").addEventListener("change", function () { setModel(false); });
  document.getElementById("slreset").addEventListener("click", function () {
    document.getElementById("slform").reset();
    sview.reset();
    setModel(true);
  });
  drawSlice();
})();
