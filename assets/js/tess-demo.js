/* tess-demo.js — окружность R = 10 мм, вписанный n-угольник, ε = R(1 − cos(π/n)).
   Разметка: _includes/tess-demo.html. */
(function () {
  "use strict";
  var n = document.getElementById("tess-n");
  if (!n) return;
  var R = 10, k = 10, svg = document.getElementById("tess-svg");
  var eps = function (m) { return R * (1 - Math.cos(Math.PI / m)); };
  var nmin = 6;
  while (eps(nmin) > 0.05) nmin++;
  var fmt = function (v, d) { return v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}); };
  function update() {
    var m = +n.value, pts = [];
    for (var i = 0; i < m; i++) {
      var a = 2 * Math.PI * i / m;
      pts.push((R * k * Math.cos(a)).toFixed(1) + "," + (R * k * Math.sin(a)).toFixed(1));
    }
    var mx = R * k * Math.cos(Math.PI / m);
    svg.innerHTML =
      '<circle cx="0" cy="0" r="' + R * k + '" fill="none" stroke="#8a95a3" stroke-dasharray="4 4"></circle>' +
      '<polygon class="d-mface" points="' + pts.join(" ") + '"></polygon>' +
      '<line class="d-medge d-medge--bad" x1="' + mx.toFixed(1) + '" y1="0" x2="' + R * k + '" y2="0"></line>' +
      '<text class="d-text d-text--small" x="0" y="116" text-anchor="middle">пунктир: окружность; красным: ε</text>';
    document.getElementById("tess-nv").textContent = m;
    var e = eps(m);
    document.getElementById("tess-eps").textContent = fmt(e, e < 0.01 ? 4 : 3) + " мм";
    document.getElementById("tess-ratio").textContent = m >= 12 && m % 2 === 0 ? "в " + fmt(eps(m / 2) / e, 2) + " раза меньше" : "нужно четное n ≥ 12";
    var ok = document.getElementById("tess-ok");
    ok.textContent = e <= 0.05 ? "выполняется" : "не выполняется";
    ok.className = "demo__v " + (e <= 0.05 ? "demo__v--ok" : "demo__v--bad");
  }
  document.getElementById("tess-min").textContent = nmin;
  n.addEventListener("input", update);
  document.getElementById("tess-dbl").addEventListener("click", function () { n.value = Math.min(96, 2 * n.value); update(); });
  update();
})();
