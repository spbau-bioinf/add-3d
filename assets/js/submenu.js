/* submenu.js — подменю открытой страницы в боковом меню: разделы и задания.
   Строится по заголовкам страницы: разделы — .subsection__title (с номером), задания —
   .task__title и заголовок итогового задания. При прокрутке подсвечивается текущее задание.
   Пункт — блок .submenu__link с текстом и пустой ссылкой .submenu__hit поверх него: текст
   стоит вне ссылки и не подчеркивается браузерами с принудительным подчеркиванием (Firefox, Zen). */
(function () {
  "use strict";
  var box = document.getElementById("submenu"); if (!box) return;
  var page = box.getAttribute("data-page");
  function h(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; }
  function item(cls, id, label) {             // блок пункта со ссылкой-слоем
    var d = h("div", "submenu__link" + (cls ? " " + cls : "")), a = h("a", "submenu__hit");
    a.href = "#" + id; a.setAttribute("aria-label", label); d.dataset.href = "#" + id; d.appendChild(a); return d;
  }
  function ensureId(el, fallback) { var host = el.closest("section, article") || el; if (!host.id) host.id = fallback; return host.id; }
  // разделы
  var secs = Array.prototype.slice.call(document.querySelectorAll(".subsection__title"));
  if (secs.length) {
    box.appendChild(h("div", "submenu__label", "Разделы"));
    var ol = h("ol", "submenu__list");
    secs.forEach(function (t, i) {
      var id = ensureId(t, "s" + (i + 1)), li = h("li", "submenu__item"), num = t.querySelector(".subsection__num");
      var n = num ? num.textContent.trim() : (i + 1) + ".", text = t.textContent.replace(num ? num.textContent : "", "").trim(), a = item("", id, n + " " + text);
      a.insertBefore(h("span", "submenu__num", n), a.firstChild); a.insertBefore(h("span", "submenu__text", text), a.lastChild);
      li.appendChild(a); ol.appendChild(li);
    });
    box.appendChild(ol);
  }
  // задания
  var tasks = Array.prototype.slice.call(document.querySelectorAll(".task__title, .final-task > h2"));
  if (tasks.length) {
    box.appendChild(h("div", "submenu__label", "Задания"));
    var ul = h("ul", "submenu__list submenu__list--tasks");
    tasks.forEach(function (t, i) {
      var id = ensureId(t, "task-" + (i + 1)), li = h("li", "submenu__item");
      var raw = t.textContent.replace(/Уровень[^\n]*$/, "").trim(), m = raw.match(/^(Задание\s+\d+)\.\s*(.*)$/);
      var num = m ? m[1].replace("Задание ", "") : "И", title = m ? m[2] : raw.replace(/^Итоговое задание:\s*/, "");
      var code = page.replace("task ", "") + "." + num, a = item("submenu__link--task", id, (m ? "Задание " + code : "Итоговое задание") + ": " + title);
      [h("span", "submenu__icon", ""), h("b", "submenu__tnum", code), h("span", "submenu__text", title)].forEach(function (e) { a.insertBefore(e, a.lastChild); });
      li.appendChild(a); ul.appendChild(li);
      li.dataset.target = id;
    });
    box.appendChild(ul);
  }
  // текущее задание при прокрутке: последнее задание, прошедшее линию на трети экрана.
  // Разделы не подсвечиваются. После щелчка по пункту выделение закреплено за ним,
  // пока идет плавная прокрутка: иначе оно мигает на пунктах, которые проезжают мимо.
  var links = Array.prototype.slice.call(box.querySelectorAll(".submenu__link--task")), targets = [];
  links.forEach(function (a) { var el = document.getElementById(a.dataset.href.slice(1)); if (el) targets.push([el, a]); });
  var ticking = false, lockUntil = 0, locked = null;
  function show(a) { links.forEach(function (l) { l.classList.toggle("is-current", l === a); }); }
  function update() {
    ticking = false;
    if (Date.now() < lockUntil) { show(locked); return; }
    var line = window.innerHeight * 0.3, best = null;
    targets.forEach(function (p) { var top = p[0].getBoundingClientRect().top; if (top <= line && (best === null || top > best[0].getBoundingClientRect().top)) best = p; });
    show(best ? best[1] : null);
  }
  if (targets.length) {
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
    window.addEventListener("resize", update);
    box.querySelectorAll(".submenu__hit").forEach(function (hit) {
      var a = hit.parentNode;
      hit.addEventListener("click", function () { locked = a.classList.contains("submenu__link--task") ? a : null; lockUntil = Date.now() + 1200; show(locked); });
    });
    update();
  }
})();
