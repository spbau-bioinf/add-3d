/* smooth-demo.js — плоский аналог сглаживания скана: 60 точек контура круга R = 10 мм
   с шумом 0,35 мм, шаг сглаживания x ← x + λ·(среднее соседей − x), λ = 0,5.
   В плоскости усадку компенсируют масштабом β = (A₀/Aₙ)^(1/2).
   Разметка: _includes/smooth-demo.html. */
(function () {
  "use strict";
  var it = document.getElementById("smooth-it");
  if (!it) return;
  var N = 60, R = 10, k = 10, seed = 7, P0 = [];
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i < N; i++) {
    var a = 2 * Math.PI * i / N;
    var g = Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    var r = R + 0.35 * g;
    P0.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  function area(P) {
    var s = 0;
    for (var i = 0; i < P.length; i++) { var p = P[i], q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; }
    return s / 2;
  }
  function centre(P) {
    var x = 0, y = 0;
    P.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / P.length, y / P.length];
  }
  var fmt = function (v, d) { return v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}); };
  var A0 = area(P0);
  function update() {
    var n = +it.value, P = P0.map(function (p) { return p.slice(); });
    for (var t = 0; t < n; t++) {
      P = P.map(function (p, i) {
        var a = P[(i + N - 1) % N], b = P[(i + 1) % N];
        return [p[0] + 0.5 * ((a[0] + b[0]) / 2 - p[0]), p[1] + 0.5 * ((a[1] + b[1]) / 2 - p[1])];
      });
    }
    var An = area(P), beta = Math.sqrt(A0 / An), c = centre(P);
    if (document.getElementById("smooth-comp").checked) {
      P = P.map(function (p) { return [c[0] + (p[0] - c[0]) * beta, c[1] + (p[1] - c[1]) * beta]; });
    }
    var rs = P.map(function (p) { return Math.hypot(p[0] - c[0], p[1] - c[1]); });
    var m = rs.reduce(function (s, v) { return s + v; }, 0) / N;
    var sd = Math.sqrt(rs.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / N);
    document.getElementById("smooth-svg").innerHTML =
      '<circle cx="0" cy="0" r="' + R * k + '" fill="none" stroke="#8a95a3" stroke-dasharray="4 4"></circle>' +
      '<polygon class="d-mface" points="' + P.map(function (p) { return (p[0] * k).toFixed(1) + "," + (p[1] * k).toFixed(1); }).join(" ") + '"></polygon>' +
      '<text class="d-text d-text--small" x="0" y="120" text-anchor="middle">пунктир: круг диаметром 20 мм</text>';
    document.getElementById("smooth-itv").textContent = n;
    var d = (area(P) / A0 - 1) * 100, el = document.getElementById("smooth-area");
    el.textContent = (d < -0.05 ? "−" + fmt(-d, 1) : fmt(Math.abs(d), 1)) + " %";
    el.className = "demo__v " + (Math.abs(d) > 0.5 ? "demo__v--bad" : "");
    document.getElementById("smooth-noise").textContent = fmt(sd, 3) + " мм";
    document.getElementById("smooth-beta").textContent = fmt(beta, 4);
  }
  it.addEventListener("input", update);
  document.getElementById("smooth-comp").addEventListener("change", update);
  update();
})();
