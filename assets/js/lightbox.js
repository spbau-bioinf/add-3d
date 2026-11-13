/* Просмотр иллюстраций: нажатие на снимок в .figure-src открывает его во всплывающем окне.
   Все управление собрано у снимка (13.11.2026, решение преподавателя): над снимком подпись по его левому краю
   и крестик у правого края, под снимком кнопки листания «‹ N из M ›». Клавиши ← →, свайп; Esc, крестик
   или нажатие по фону вокруг снимка закрывают. Полосы подписи и кнопок при промахе окно не закрывают. */
(function () {
  "use strict";
  var dlg, stage, head, img, cap, capIn, count, ctrl, list = [], i = 0;
  var SEL = ".figure-src img";
  var ico = function (d) { return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };

  // Снимок другой темы (shot--light / shot--dark) скрыт и в листание не попадает.
  function visible() {
    return Array.prototype.filter.call(document.querySelectorAll(SEL), function (el) { return el.offsetParent !== null; });
  }
  function caption(el) {
    var c = el.closest("figure") && el.closest("figure").querySelector("figcaption");
    return c ? c.innerHTML : "";
  }
  // Размер снимка на экране считается заранее по его настоящим размерам и свободному месту
  // (между строкой подписи и кнопками): не зависит от загрузки, поэтому при листании ничего не прыгает.
  // Снимок не увеличивается больше своего размера, чтобы не терять резкость.
  var nat = { w: 0, h: 0 };
  function fit() {
    var cs = getComputedStyle(stage), gap = parseFloat(cs.rowGap) || 0;
    var W = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var H = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - head.offsetHeight - ctrl.offsetHeight - 2 * gap;
    if (!nat.w || !nat.h) { img.style.width = img.style.height = ""; head.style.width = Math.min(W, 960) + "px"; return; }
    var k = Math.max(0, Math.min(1, W / nat.w, H / nat.h)), w = Math.floor(nat.w * k), h = Math.floor(nat.h * k);
    img.style.width = w + "px"; img.style.height = h + "px";
    head.style.width = Math.min(W, Math.max(w, 320)) + "px";   // строка подписи шириной со снимок, не уже 320 px
  }
  // Высота подписи = самая высокая подпись страницы: при листании снимок и кнопки не сдвигаются.
  function reserve() {
    cap.style.minHeight = ""; var h = 0;
    list.forEach(function (el) { capIn.innerHTML = caption(el); h = Math.max(h, capIn.offsetHeight); });
    cap.style.minHeight = h + "px";
  }
  // Подпись не поместилась: низ подписи гаснет, пока ее не прокрутили до конца.
  function more() { cap.classList.toggle("lb__cap--more", cap.scrollTop + cap.clientHeight < cap.scrollHeight - 2); }
  function setImg(el) {
    nat.w = el.naturalWidth || +el.getAttribute("width") || 0; nat.h = el.naturalHeight || +el.getAttribute("height") || 0;
  }
  function show(n) {
    i = (n + list.length) % list.length;
    var el = list[i];
    img.classList.add("lb__img--load");
    img.onload = function () { img.classList.remove("lb__img--load"); };
    setImg(el);
    img.src = el.currentSrc || el.src; img.alt = el.alt;
    if (img.complete) img.classList.remove("lb__img--load");
    fit();
    capIn.innerHTML = caption(el); cap.scrollTop = 0; more();
    count.textContent = (i + 1) + " из " + list.length;
    [i - 1, i + 1].forEach(function (k) { new Image().src = list[(k + list.length) % list.length].src; }); // соседние снимки заранее
  }
  function layout() { setImg(list[i]); fit(); reserve(); fit(); }
  function build() {
    dlg = document.createElement("dialog"); dlg.className = "lb"; dlg.setAttribute("aria-label", "Просмотр иллюстрации"); dlg.tabIndex = -1;
    dlg.innerHTML =
      '<div class="lb__stage">' +
      '<div class="lb__head"><div class="lb__cap"><div class="lb__capin"></div></div>' +
      '<button type="button" class="lb__close" aria-label="Закрыть" title="Закрыть (Esc)">' + ico("M6 6l12 12M18 6L6 18") + '</button></div>' +
      '<img class="lb__img" alt="">' +
      '<div class="lb__ctrl">' +
      '<button type="button" class="lb__nav lb__prev" aria-label="Предыдущий снимок" title="Предыдущий (←)">' + ico("M15 5l-7 7 7 7") + '</button>' +
      '<span class="lb__count" aria-live="polite"></span>' +
      '<button type="button" class="lb__nav lb__next" aria-label="Следующий снимок" title="Следующий (→)">' + ico("M9 5l7 7-7 7") + '</button></div>' +
      '</div>';
    document.body.appendChild(dlg);
    stage = dlg.querySelector(".lb__stage"); head = dlg.querySelector(".lb__head"); img = dlg.querySelector(".lb__img");
    cap = dlg.querySelector(".lb__cap"); capIn = dlg.querySelector(".lb__capin"); count = dlg.querySelector(".lb__count"); ctrl = dlg.querySelector(".lb__ctrl");
    dlg.querySelector(".lb__close").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector(".lb__prev").addEventListener("click", function () { show(i - 1); });
    dlg.querySelector(".lb__next").addEventListener("click", function () { show(i + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target === stage) dlg.close(); });
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
    window.addEventListener("resize", function () { if (dlg.open) { layout(); capIn.innerHTML = caption(list[i]); more(); } });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("lb-open"); });
  }
  function open(el) {
    if (!dlg) build();
    list = visible();
    i = Math.max(0, list.indexOf(el));
    dlg.classList.toggle("lb--single", list.length < 2);
    if (window.getSelection) window.getSelection().removeAllRanges();
    dlg.showModal(); document.documentElement.classList.add("lb-open");
    layout();
    show(i);
    // Фокус на само окно, а не на крестик: иначе при открытии мышью вокруг крестика горит рамка фокуса.
    // Клавиши ← → и Esc работают сразу, Tab ведет к кнопкам.
    dlg.focus();
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
