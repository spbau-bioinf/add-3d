/* copycode.js — кнопка копирования у статичных блоков кода.
   Для каждого блока ```…``` на странице (div.highlighter-rouge) в правый верхний
   угол добавляется кнопка с иконкой; она копирует текст блока как есть,
   без номеров строк и подсветки, поэтому G-код из примеров можно сразу
   вставить в просмотрщик, в редактор или во внешний сервис.
   Блоки с деревом папок (.folder-tree) пропускаются. */
(function () {
  "use strict";
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  Array.prototype.forEach.call(document.querySelectorAll(".content div.highlighter-rouge"), function (block) {
    if (block.classList.contains("folder-tree") || block.closest(".folder-tree")) return;
    var pre = block.querySelector("pre"); if (!pre) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "copy-btn"; b.title = "Скопировать код"; b.setAttribute("aria-label", "Скопировать код"); b.innerHTML = ICON;
    b.addEventListener("click", function () {
      var t = pre.textContent.replace(/\n$/, "");
      if (window.add3dCopyText) window.add3dCopyText(t, b);
      else if (navigator.clipboard) navigator.clipboard.writeText(t);
    });
    block.appendChild(b);
  });
})();
