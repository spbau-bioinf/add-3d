/* kiri-theme.js — тема встроенного Kiri:Moto вслед за темой сайта.

   Kiri:Moto принимает настройки от страницы, в которую встроен, через postMessage
   (Frame Message API: https://docs.grid.space/kiri-moto/apis). Сообщение {controller: {dark}}
   записывает настройку «dark mode» (Setup → prefs) в хранилище Kiri:Moto; применяется она
   при следующей загрузке фрейма (исходники grid-apps: src/kiri/app/frame.js, platform.js).
   Поэтому скрипт после загрузки фрейма отправляет нужное значение и, если оно изменилось
   с прошлого раза, перезагружает фрейм. Модели в рабочей области Kiri:Moto сохраняет сам
   (автосохранение), перезагрузка их не теряет.
   Последнее отправленное значение хранится в localStorage под ключом add3d-kiri-dark,
   чтобы не перезагружать фрейм при каждом открытии страницы. */
(function () {
  "use strict";
  var frame = document.querySelector(".kiri iframe");
  if (!frame) return;
  var ORIGIN = "https://grid.space", KEY = "add3d-kiri-dark";
  function dark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function getSent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setSent(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* хранилище недоступно */ } }
  function send(v) {
    try { frame.contentWindow.postMessage({ controller: { dark: v } }, ORIGIN); } catch (e) { /* фрейм не загружен */ }
  }
  var timer = null;
  function sync(reloadIfChanged) {
    var want = dark(), sent = getSent();
    clearTimeout(timer);
    timer = setTimeout(function () {                 // Kiri:Moto инициализируется после события load
      send(want);
      if (sent === null && !want) { setSent("false"); return; }   // по умолчанию Kiri:Moto светлый
      if (reloadIfChanged && sent !== String(want)) {
        setSent(String(want));
        setTimeout(function () { frame.src = frame.src; }, 800);
      }
    }, 2500);
  }
  frame.addEventListener("load", function () { sync(true); });
  new MutationObserver(function () { sync(true); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
