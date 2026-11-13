/* Просмотр иллюстраций: нажатие на снимок в .figure-src открывает его во всплывающем окне;
   стрелки и клавиши ← → листают все видимые снимки страницы, Esc или нажатие вне снимка закрывают. */
(function () {
  "use strict";
  var dlg, img, cap, count, list = [], i = 0;
  var SEL = ".figure-src img";
  var ico = function (d) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };

  // Снимок другой темы (shot--light / shot--dark) скрыт и в листание не попадает.
  function visible() {
    return Array.prototype.filter.call(document.querySelectorAll(SEL), function (el) { return el.offsetParent !== null; });
  }
  function caption(el) {
    var c = el.closest("figure") && el.closest("figure").querySelector("figcaption");
    return c ? c.innerHTML : "";
  }
  // Высота подписи = самая высокая подпись страницы, чтобы снимок не прыгал при листании.
  function reserve() {
    cap.style.minHeight = "";
    var h = 0;
    list.forEach(function (el) { cap.innerHTML = caption(el); h = Math.max(h, cap.offsetHeight); });
    cap.style.minHeight = h + "px";
  }
  // Подпись не поместилась: низ подписи гаснет, пока ее не прокрутили до конца.
  function more() { cap.classList.toggle("lb__cap--more", cap.scrollTop + cap.clientHeight < cap.scrollHeight - 2); }
  function show(n) {
    i = (n + list.length) % list.length;
    var el = list[i];
    img.classList.add("lb__img--load");
    img.onload = function () { img.classList.remove("lb__img--load"); };
    img.src = el.currentSrc || el.src; img.alt = el.alt;
    if (img.complete) img.classList.remove("lb__img--load");
    cap.innerHTML = caption(el); cap.scrollTop = 0; more();
    count.textContent = (i + 1) + " из " + list.length;
    [i - 1, i + 1].forEach(function (k) { new Image().src = list[(k + list.length) % list.length].src; }); // соседние снимки заранее
  }
  function build() {
    dlg = document.createElement("dialog"); dlg.className = "lb"; dlg.setAttribute("aria-label", "Просмотр иллюстрации");
    dlg.innerHTML =
      '<div class="lb__bar"><span class="lb__count" aria-live="polite"></span>' +
      '<button type="button" class="lb__close" aria-label="Закрыть" title="Закрыть (Esc)">' + ico("M6 6l12 12M18 6L6 18") + '</button></div>' +
      '<div class="lb__stage"><img class="lb__img" alt="">' +
      '<button type="button" class="lb__nav lb__prev" aria-label="Предыдущий снимок" title="Предыдущий (←)">' + ico("M15 5l-7 7 7 7") + '</button>' +
      '<button type="button" class="lb__nav lb__next" aria-label="Следующий снимок" title="Следующий (→)">' + ico("M9 5l7 7-7 7") + '</button></div>' +
      '<div class="lb__cap"></div>';
    document.body.appendChild(dlg);
    img = dlg.querySelector(".lb__img"); cap = dlg.querySelector(".lb__cap"); count = dlg.querySelector(".lb__count");
    dlg.querySelector(".lb__close").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".lb__prev").addEventListener("click", function () { show(i - 1); });
    dlg.querySelector(".lb__next").addEventListener("click", function () { show(i + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("lb__stage")) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (list.length < 2) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
    });
    // Свайп влево-вправо; при увеличении двумя пальцами не листает, чтобы можно было рассматривать снимок.
    var x0 = null;
    dlg.addEventListener("touchstart", function (e) {
      var zoomed = window.visualViewport && window.visualViewport.scale > 1.05;
      x0 = e.touches.length === 1 && !zoomed ? e.touches[0].clientX : null;
    }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null || list.length < 2) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1);
    });
    // Двойное и тройное нажатие по кнопкам иначе выделяет текст страницы под окном.
    dlg.addEventListener("mousedown", function (e) { if (e.detail > 1 && !e.target.closest(".lb__cap")) e.preventDefault(); });
    cap.addEventListener("scroll", more, { passive: true });
    window.addEventListener("resize", function () { if (dlg.open) { reserve(); cap.innerHTML = caption(list[i]); more(); } });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("lb-open"); });
  }
  function open(el) {
    if (!dlg) build();
    list = visible();
    dlg.classList.toggle("lb--single", list.length < 2);
    if (window.getSelection) window.getSelection().removeAllRanges();
    dlg.showModal(); document.documentElement.classList.add("lb-open");
    reserve();
    show(Math.max(0, list.indexOf(el)));
    dlg.querySelector(".lb__close").focus();
  }
  // Клавиатура: снимок без ссылки получает фокус и открывается Enter или пробелом.
  Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) {
    if (el.closest("a")) return;
    el.tabIndex = 0; el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Открыть снимок: " + el.alt);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".figure-src a"), el = e.target.closest(SEL) || (a && a.querySelector("img"));
    if (!el || e.ctrlKey || e.metaKey || e.shiftKey) return; // Ctrl+нажатие оставляет прежнее открытие в новой вкладке
    if (a && !a.contains(el)) return;
    e.preventDefault();
    open(el);
  });
})();
