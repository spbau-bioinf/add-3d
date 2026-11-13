/* quiz.js — мини-тест, который собирает комментарий для вставки в файл.
   Разметка (см. README, раздел «Мини-тест»):
     <div class="quiz" data-file="task_1-2_2.py" data-comment="#">
       <div class="quiz__q"> <p>Вопрос</p> <label><input type="radio"> вариант</label>
                              <label><input type="radio" data-ok> верный</label>
                              <p class="quiz__exp" hidden>пояснение</p> </div> …
       <div class="quiz__bar"><button class="quiz__check">…</button><span class="quiz__status"></span></div>
       <div class="quiz__result" hidden><pre class="quiz__comment"></pre>
            <button class="quiz__copy">…</button><span class="quiz__copied"></span></div>
     </div>
   Имена групп радиокнопок проставляются здесь, поэтому в разметке атрибут
   name не нужен; варианты ответа перемешиваются при каждой загрузке. Пояснение показывается только после ответа: при верном ответе —
   .quiz__exp, при неверном — пояснение выбранного варианта из <span class="quiz__why" hidden>
   внутри его label (если его нет, показывается .quiz__exp). Комментарий
   строится из текста вопроса и верного варианта; знак комментария берется
   из data-comment («#» для Python, «;» для G-кода). */
(function () {
  "use strict";
  function wrap(text, prefix, width) {
    var words = text.split(/\s+/), lines = [], cur = prefix;
    words.forEach(function (w) {
      if ((cur + " " + w).length > width && cur.trim() !== prefix.trim()) { lines.push(cur); cur = prefix + w; }
      else cur = cur === prefix ? prefix + w : cur + " " + w;
    });
    lines.push(cur);
    return lines.join("\n");
  }
  Array.prototype.forEach.call(document.querySelectorAll(".quiz"), function (quiz, qi) {
    var mark = quiz.getAttribute("data-comment") || "#";
    var qs = quiz.querySelectorAll(".quiz__q");
    Array.prototype.forEach.call(qs, function (q, i) {
      var labels = Array.prototype.slice.call(q.querySelectorAll("label"));
      for (var k = labels.length - 1; k > 0; k--) {        // варианты в случайном порядке
        var j = Math.floor(Math.random() * (k + 1)), t = labels[k]; labels[k] = labels[j]; labels[j] = t;
      }
      var anchor = q.querySelector(".quiz__exp");
      labels.forEach(function (l) { q.insertBefore(l, anchor); });
      Array.prototype.forEach.call(q.querySelectorAll("input[type=radio]"), function (r) { r.name = "quiz" + qi + "q" + i; });
    });
    var btn = quiz.querySelector(".quiz__check"), status = quiz.querySelector(".quiz__status");
    var result = quiz.querySelector(".quiz__result"), out = quiz.querySelector(".quiz__comment");
    // data-sign: фамилия, дата и число проверок попадают в первую строку результата (тест сдается файлом)
    var sign = null, tries = 0;
    if (quiz.hasAttribute("data-sign")) {
      var sp = document.createElement("p"); sp.className = "quiz__sign"; sp.textContent = "Фамилия и инициалы: ";
      sign = document.createElement("input"); sign.type = "text"; sign.maxLength = 60;
      sign.setAttribute("aria-label", "Фамилия и инициалы");
      sp.appendChild(sign); btn.parentNode.parentNode.insertBefore(sp, btn.parentNode);
    }
    btn.addEventListener("click", function () {
      var lines = [], all = true, missing = 0;
      tries++;
      Array.prototype.forEach.call(qs, function (q) {
        Array.prototype.forEach.call(q.querySelectorAll("label"), function (l) { l.classList.remove("is-ok", "is-bad"); });
        var exp = q.querySelector(".quiz__exp"), why = q.querySelector(".quiz__exp--why");
        if (exp) exp.hidden = true;
        if (why) why.hidden = true;
        var chosen = q.querySelector("input:checked");
        if (!chosen) { all = false; missing++; return; }
        var ok = chosen.hasAttribute("data-ok");
        chosen.parentElement.classList.add(ok ? "is-ok" : "is-bad");
        var reason = !ok && chosen.parentElement.querySelector(".quiz__why");
        if (reason && exp) {                                  // неверный вариант со своим пояснением
          if (!why) { why = document.createElement("p"); why.className = "quiz__exp quiz__exp--why"; exp.parentNode.insertBefore(why, exp.nextSibling); }
          why.innerHTML = reason.innerHTML; why.hidden = false;
        } else if (exp) exp.hidden = false;
        if (!ok) { all = false; return; }
        var question = q.querySelector("p").textContent.trim().replace(/^\d+\.\s*/, "");
        var answer = q.querySelector("[data-ok]").parentElement.textContent.trim();
        lines.push(wrap(question, mark + " ", 78));
        lines.push(wrap(answer, mark + "   ", 78));
      });
      var who = sign ? sign.value.trim() : "";
      if (all && sign) lines.unshift(mark + " " + (who || "фамилия не указана") + "; " + new Date().toLocaleString("ru-RU") + "; проверок: " + tries);
      if (all) {
        status.textContent = sign && !who ? "Все ответы верны. Впишите фамилию и инициалы и нажмите «Проверить» еще раз." : "Все ответы верны.";
        quiz.dispatchEvent(new CustomEvent("add3d:part", {bubbles: true}));   // прогресс (settings.js)
        out.textContent = lines.join("\n");
        result.hidden = false;
      } else {
        status.textContent = missing ? "Ответьте на все вопросы." : "Есть неверные ответы: прочитайте пояснения и проверьте снова.";
        result.hidden = true;
      }
    });
    var copy = quiz.querySelector(".quiz__copy"), copied = quiz.querySelector(".quiz__copied");
    if (copy) copy.addEventListener("click", function () {
      var t = out.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { copied.textContent = "Скопировано"; },
                                             function () { copied.textContent = "Выделите текст и скопируйте вручную"; });
      } else copied.textContent = "Выделите текст и скопируйте вручную";
    });
  });
})();
