/* theme.js — светлая и темная тема сайта.
   Подключается в <head> без defer, чтобы тема применялась до отрисовки.
   Без выбора действует светлая тема; кнопка .theme-btn ставится шаблоном в шапке страницы.

   Где хранится выбор:
   * localStorage, ключ add3d-theme. На сайте (http, https) хранилище общее для всех страниц.
   * Параметр адреса ?theme=dark|light. При открытии сайта с диска (file://) браузеры
     на основе Firefox (Firefox, Zen) дают каждой странице свое хранилище, и выбор не
     переходил бы на другие страницы. Поэтому на file:// скрипт дописывает параметр
     к внутренним ссылкам при щелчке, а следующая страница читает его, сохраняет
     в своем хранилище и убирает из адресной строки. */
(function () {
  "use strict";
  var KEY = "add3d-theme", root = document.documentElement, LOCAL = location.protocol === "file:";
  function valid(t) { return t === "dark" || t === "light"; }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(t) { try { localStorage.setItem(KEY, t); } catch (e) { /* хранилище недоступно */ } }
  function current() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function apply(t) { if (t === "dark") root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme"); }

  // 1. Тема из адреса (переход между страницами с диска) важнее сохраненной
  var fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get("theme"); } catch (e) { /* старый браузер */ }
  if (valid(fromUrl)) {
    store(fromUrl); apply(fromUrl);
    try {
      var u = new URL(location.href); u.searchParams.delete("theme");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* адрес не изменить: параметр останется, это не мешает */ }
  } else if (valid(stored())) apply(stored());

  // 2. Кнопка
  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".theme-btn"), function (b) {
      b.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        apply(next); store(next);
        document.dispatchEvent(new CustomEvent("themechange", {detail: next}));
      });
    });
  });

  // 3. С диска: тема передается следующей странице через адрес ссылки
  if (LOCAL) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^[a-z][a-z0-9+.-]*:/i.test(href) || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        var u = new URL(a.href); if (u.protocol !== "file:" || !/\.html?$/i.test(u.pathname)) return;
        u.searchParams.set("theme", current()); a.href = u.href;
      } catch (err) { /* ссылка остается как есть */ }
    }, true);
  }
})();
