/* ==========================================================================
   e-calc.js — калькулятор подачи нити E и пористости решётки
   (разметка: _includes/e-calc.html). Формулы: task 1-2 и task 1-5.
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("calc-d")) return;
  var fmt = function (v, d) {
    return isFinite(v) ? v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}) : "—";
  };
  function calc() {
    var d = parseFloat($("calc-d").value), W = parseFloat($("calc-w").value),
        H = parseFloat($("calc-h").value), L = parseFloat($("calc-l").value),
        s = parseFloat($("calc-s").value);
    var A = Math.PI * (d / 2) * (d / 2), e1 = W * H / A, P = 1 - W / s;
    $("calc-a").textContent = fmt(A, 4);
    $("calc-e1").textContent = fmt(e1, 5);
    $("calc-el").textContent = fmt(e1 * L, 4);
    $("calc-p").textContent = isFinite(P) && P > 0 ? fmt(P * 100, 1) + " %" : "—";
  }
  ["calc-d", "calc-w", "calc-h", "calc-l", "calc-s"].forEach(function (id) {
    $(id).addEventListener("input", calc);
  });
  calc();
})();
