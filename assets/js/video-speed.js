// Панель управления роликами: пуск, полоса времени, скорость, полный экран.
// Стандартную панель браузера дополнить нельзя, поэтому она заменяется своей; без скриптов остается стандартная.
// На полном экране в правом верхнем углу крестик: по нему (и по Esc) экран закрывается.
// Роликам звук не нужен, регулятора громкости нет. Shift+> и Shift+< меняют скорость на шаг. Скорость запоминается для всех роликов.
(function () {
  var RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], KEY = 'videoRate';
  var saved = 1; try { saved = parseFloat(localStorage.getItem(KEY)) || 1; } catch (e) {}
  var boxes = [];
  var fmt = function (s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
  function setAll(r) {
    saved = r; try { localStorage.setItem(KEY, r); } catch (e) {}
    boxes.forEach(function (b) { b.v.defaultPlaybackRate = r; b.v.playbackRate = r; b.sel.value = r; });
  }
  [].forEach.call(document.querySelectorAll('.figure-video video'), function (v) {
    var box = document.createElement('div'); box.className = 'vspeed';
    v.parentNode.insertBefore(box, v); box.appendChild(v); v.controls = false;
    var bar = document.createElement('div'); bar.className = 'vspeed__bar';
    bar.innerHTML = '<button type="button" class="vspeed__btn vspeed__play" aria-label="Воспроизвести">▶</button>' +
      '<input type="range" class="vspeed__seek" min="0" max="1000" value="0" aria-label="Положение в ролике">' +
      '<span class="vspeed__time">0:00</span>' +
      '<label class="vspeed__rate">Скорость <select aria-label="Скорость воспроизведения">' +
      RATES.map(function (r) { return '<option value="' + r + '">' + String(r).replace('.', ',') + '×</option>'; }).join('') + '</select></label>' +
      '<button type="button" class="vspeed__btn vspeed__full" aria-label="Во весь экран">⛶</button>';
    box.appendChild(bar);
    var close = document.createElement('button'); close.type = 'button'; close.className = 'vspeed__btn vspeed__close';   // виден только на полном экране
    close.setAttribute('aria-label', 'Закрыть полный экран'); close.textContent = '✕'; box.appendChild(close);
    close.addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen(); });
    var play = bar.querySelector('.vspeed__play'), seek = bar.querySelector('.vspeed__seek'), time = bar.querySelector('.vspeed__time'),
      sel = bar.querySelector('select'), full = bar.querySelector('.vspeed__full');
    boxes.push({v: v, sel: sel}); sel.value = saved; v.defaultPlaybackRate = saved;
    function toggle() { if (v.paused) v.play(); else v.pause(); }
    function paint() {
      play.textContent = v.paused ? '▶' : '❚❚'; play.setAttribute('aria-label', v.paused ? 'Воспроизвести' : 'Пауза');
      if (v.duration) { seek.value = Math.round(v.currentTime / v.duration * 1000); time.textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration); }
    }
    play.addEventListener('click', toggle); v.addEventListener('click', toggle);
    ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended'].forEach(function (e) { v.addEventListener(e, paint); });
    v.addEventListener('play', function () { v.playbackRate = saved; });       // браузер сбрасывает скорость при загрузке файла
    seek.addEventListener('input', function () {
      if (v.duration) v.currentTime = seek.value / 1000 * v.duration;
      else { v.preload = 'metadata'; v.load(); }                                 // файл еще не загружался
    });
    sel.addEventListener('change', function () { setAll(parseFloat(sel.value)); });
    full.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();                // iPhone: только сам ролик
    });
    box.addEventListener('keydown', function (e) {
      var i = RATES.indexOf(saved);
      if (e.key === '>' && i < RATES.length - 1) setAll(RATES[i + 1]);
      if (e.key === '<' && i > 0) setAll(RATES[i - 1]);
    });
  });
})();
