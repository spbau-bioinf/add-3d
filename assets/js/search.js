/* search.js — поиск по сайту. Кнопка .search-btn в шапке (или Ctrl+K) открывает окно;
   индекс assets/js/search-index.js (собирает tools/build_search.py) подгружается при первом
   открытии, поэтому поиск работает и на GitHub Pages, и при открытии сайта с диска.
   Ищутся разделы, где есть все слова запроса (без учета регистра; буква «е» находит и свой вариант с двумя точками). */
(function () {
  "use strict";
  var root = ((document.querySelector('script[src$="assets/js/search.js"]') || {}).src || "").replace(/assets\/js\/search\.js.*$/, "");
  var dlg = null, input, list, loading = null;
  function low(s) { return s.toLowerCase().replace(/\u0451/g, "\u0435"); }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function load() {
    if (window.ADD3D_SEARCH) return Promise.resolve();
    if (!loading) loading = new Promise(function (ok, bad) {
      var s = document.createElement("script"); s.src = root + "assets/js/search-index.js";
      s.onload = ok; s.onerror = function () { loading = null; bad(); }; document.head.appendChild(s);
    });
    return loading;
  }
  function mark(text, words) {
    var t = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      var re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\u0435/g, "[\u0435\u0451]") + ")", "gi");
      t = t.replace(re, "<mark>$1</mark>");
    });
    return t;
  }
  function snippet(t, w) {
    var i = low(t).indexOf(w), a = Math.max(0, i - 70);
    return (a ? "…" : "") + t.slice(a, a + 200) + (a + 200 < t.length ? "…" : "");
  }
  function find() {
    var q = low(input.value.trim());
    if (q.length < 2) { list.innerHTML = '<li class="search-dlg__msg">Введите не меньше двух букв: например, «экструзия», «edge_faces», «пористость».</li>'; return; }
    var words = q.split(/\s+/), hits = [];
    window.ADD3D_SEARCH.forEach(function (e) {
      var head = low(e.p + " " + e.s), body = low(e.t), score = 0;
      for (var i = 0; i < words.length; i++) {
        if (head.indexOf(words[i]) >= 0) score += 3;
        else if (body.indexOf(words[i]) >= 0) score += 1;
        else return;
      }
      hits.push([score, e]);
    });
    hits.sort(function (a, b) { return b[0] - a[0]; });
    if (!hits.length) { list.innerHTML = '<li class="search-dlg__msg">Ничего не найдено.</li>'; return; }
    list.innerHTML = hits.slice(0, 40).map(function (h) {
      var e = h[1];
      return '<li><a href="' + root + e.u + '">' + mark(e.s || e.p, words) + '</a><span class="search-dlg__where">' + esc(e.p) +
        '</span><span class="search-dlg__snip">' + mark(snippet(e.t, words[0]), words) + "</span></li>";
    }).join("") + (hits.length > 40 ? '<li class="search-dlg__msg">Показаны первые 40 из ' + hits.length + ": уточните запрос.</li>" : "");
  }
  function open() {
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.className = "search-dlg";
      dlg.innerHTML = '<div class="search-dlg__head"><input class="search-dlg__input" type="search" placeholder="Поиск по сайту" aria-label="Поиск по сайту">' +
        '<button type="button" class="tool-btn">Закрыть</button></div><ul class="search-dlg__list"></ul>';
      document.body.appendChild(dlg);
      input = dlg.querySelector("input"); list = dlg.querySelector("ul");
      dlg.querySelector("button").addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      var t = null;
      input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { load().then(find); }, 150); });
      list.addEventListener("click", function (e) { if (e.target.closest("a")) dlg.close(); });
    }
    dlg.showModal(); input.focus(); input.select();
    list.innerHTML = '<li class="search-dlg__msg">Загрузка индекса…</li>';
    load().then(find, function () { list.innerHTML = '<li class="search-dlg__msg">Индекс поиска не найден (assets/js/search-index.js).</li>'; });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".search-btn"), function (b) { b.addEventListener("click", open); });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "л")) { e.preventDefault(); open(); }
  });
})();
