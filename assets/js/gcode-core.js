/* ==========================================================================
   gcode-core.js — разбор G-кода и учебный генератор слоёв.
   Генератор squarePart() — точный порт assets/files/gen.py (вывод совпадает
   строка в строку); parseGcode() считает то же, что assets/files/stats.py.
   Файл подключается из _includes/gcode-viewer.html.
   ========================================================================== */
// ---------- генератор (порт gen.py один в один) ----------
function squarePart(o) {
  o = Object.assign({x0: 90, y0: 90, size: 20, nLayers: 10, infill: 0.2,
                     outline: true, fOut: 1200, fInf: 1800}, o || {});
  const W = 0.4, H = 0.2, D = 1.75, A = Math.PI * Math.pow(D / 2, 2);
  const eFor = L => L * W * H / A;
  const out = []; let x = 0, y = 0;
  const cmd = s => out.push(s);
  const f3 = v => v.toFixed(3);
  const travel = (nx, ny, f) => { cmd(`G0 X${f3(nx)} Y${f3(ny)} F${f || 6000}`); x = nx; y = ny; };
  const extrude = (nx, ny, f) => { const L = Math.hypot(nx - x, ny - y);
    cmd(`G1 X${f3(nx)} Y${f3(ny)} E${eFor(L).toFixed(5)} F${f}`); x = nx; y = ny; };
  cmd("M140 S60\nM104 S215\nM190 S60\nM109 S215");
  cmd("G21\nG90\nM83\nG28");
  const sp = W / o.infill;
  for (let k = 0; k < o.nLayers; k++) {
    cmd(`; LAYER ${k}\nG0 Z${(H * (k + 1)).toFixed(3)} F3000`);
    if (o.outline) {
      const a = o.x0 + W / 2, b = o.x0 + o.size - W / 2, c = o.y0 + W / 2, d = o.y0 + o.size - W / 2;
      let loop = [[a, c], [b, c], [b, d], [a, d]];
      loop = loop.slice(k % 4).concat(loop.slice(0, k % 4));
      travel(loop[0][0], loop[0][1]);
      loop.slice(1).concat(loop.slice(0, 1)).forEach(p => extrude(p[0], p[1], o.fOut));
    }
    const m = o.outline ? W : 0;
    const loX = o.x0 + m, hiX = o.x0 + o.size - m, loY = o.y0 + m, hiY = o.y0 + o.size - m;
    const alongX = (k % 2 === 0);
    const lo = alongX ? loY : loX, hi = alongX ? hiY : hiX;
    const span = hi - lo - W;
    const n = Math.floor(span / sp + 1e-9) + 1;
    const first = lo + W / 2 + (span - (n - 1) * sp) / 2;
    for (let i = 0; i < n; i++) {
      const t = first + i * sp;
      if (alongX) { const [s, e] = i % 2 === 0 ? [loX, hiX] : [hiX, loX]; travel(s, t); extrude(e, t, o.fInf); }
      else        { const [s, e] = i % 2 === 0 ? [loY, hiY] : [hiY, loY]; travel(t, s); extrude(t, e, o.fInf); }
    }
  }
  cmd("M104 S0\nM140 S0\nM84");
  return out.join("\n");
}

// ---------- разбор G-кода ----------
function parseGcode(text) {
  const lines = text.split(/\r?\n/);
  let relXYZ = false, relE = false, modeSet = false;
  let x = 0, y = 0, z = 0, e = 0;
  const segs = []; const warn = {};
  const addW = (k, msg) => { warn[k] = warn[k] || {msg, n: 0}; warn[k].n++; };
  let eSum = 0, extLen = 0, travLen = 0, arcs = 0, hasTemp = false, eMoves = 0, eFlat = 0, relN = 0, relUp = 0, lastRaw = null;
  for (let li = 0; li < lines.length; li++) {
    const s = lines[li].split(";")[0].trim();
    if (!s) continue;
    const w = s.split(/\s+/); const cmd = w[0].toUpperCase(); const a = {};
    for (let j = 1; j < w.length; j++) {
      const v = parseFloat(w[j].slice(1));
      if (!isNaN(v)) a[w[j][0].toUpperCase()] = v;
    }
    if (cmd === "G90") { relXYZ = false; relE = false; }
    else if (cmd === "G91") { relXYZ = true; relE = true; }
    else if (cmd === "M82") { relE = false; modeSet = true; }
    else if (cmd === "M83") { relE = true; modeSet = true; }
    else if (cmd === "M104" || cmd === "M109") hasTemp = true;
    else if (cmd === "G92") { if ("X" in a) x = a.X; if ("Y" in a) y = a.Y; if ("Z" in a) z = a.Z; if ("E" in a) e = a.E; }
    else if (cmd === "G28") { x = 0; y = 0; z = 0; }
    else if (cmd === "G2" || cmd === "G3" || cmd === "G02" || cmd === "G03") arcs++;
    else if (cmd === "G0" || cmd === "G1" || cmd === "G00" || cmd === "G01") {
      let nx, ny, nz;
      if (relXYZ) { nx = x + (a.X || 0); ny = y + (a.Y || 0); nz = z + (a.Z || 0); }
      else { nx = "X" in a ? a.X : x; ny = "Y" in a ? a.Y : y; nz = "Z" in a ? a.Z : z; }
      let de = 0;
      if ("E" in a) {
        if (!modeSet && !relE) addW("mode", "Режим E не задан (нет M82/M83) — считаю его абсолютным");
        de = relE ? a.E : a.E - e;
        e = relE ? e + a.E : a.E;
      }
      const L = Math.hypot(nx - x, ny - y);
      if ("E" in a && L > 0) { eMoves++; if (!relE && de <= 0) eFlat++; }
      if (relE && "E" in a && L > 0 && a.E > 0) { if (lastRaw !== null) { relN++; if (a.E > lastRaw + 1e-9) relUp++; } lastRaw = a.E; }
      if (de > 0 && L > 0) {
        if (de / L > 1) addW("big", "Слишком много нити на миллиметр пути (E/мм > 1) — похоже на накопленные значения E при M83");
        segs.push({x0: x, y0: y, x1: nx, y1: ny, z: nz, ext: true, de, L, line: li});
        eSum += de; extLen += L;
      } else if (L > 0) {
        if (de < -1) addW("neg", "E резко уменьшается во время движения — похоже на относительные значения E при M82");
        segs.push({x0: x, y0: y, x1: nx, y1: ny, z: nz, ext: false, de, L, line: li});
        travLen += L;
      }
      x = nx; y = ny; z = nz;
    }
  }
  if (relN > 4 && relUp / relN > 0.8) addW("cum", "При M83 значения E почти всегда растут от строки к строке — похоже, записаны накопленные значения; нужен M82");
  if (eMoves > 4 && eFlat / eMoves > 0.5) addW("flat", "При M82 значения E в большинстве строк не растут — похоже, записаны приращения; нужен M83");
  if (arcs) addW("arc", `Дуги G2/G3 не отрисованы и не учтены: ${arcs} шт.`);
  if (!hasTemp && segs.some(s => s.ext)) addW("temp", "Нет команд нагрева сопла (M104/M109)");
  // слои: уникальные Z экструзии
  const zs = [...new Set(segs.filter(s => s.ext).map(s => Math.round(s.z * 1000) / 1000))].sort((p, q) => p - q);
  const layerOf = z => { const r = Math.round(z * 1000) / 1000; let i = zs.findIndex(v => v >= r - 1e-6); return i < 0 ? zs.length - 1 : i; };
  segs.forEach(s => s.layer = layerOf(s.z));
  const ratios = segs.filter(s => s.ext).map(s => s.de / s.L).sort((p, q) => p - q);
  const med = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
  const dz = []; for (let i = 1; i < zs.length; i++) dz.push(zs[i] - zs[i - 1]);
  dz.sort((p, q) => p - q);
  const hLayer = dz.length ? dz[Math.floor(dz.length / 2)] : (zs[0] || 0);
  return {segs, zs, eSum, extLen, travLen, medEperMM: med, hLayer, warnings: Object.values(warn), lines};
}

// ---------- готовые файлы для кнопок просмотрщика ----------
var GCODE_PRESETS = {
  two: {label: "Пример: два слоя", text: function () { return "M140 S60        ; стол: задать 60 °C и не ждать\nM104 S215       ; сопло: задать 215 °C и не ждать\nM190 S60        ; ждать, пока нагреется стол\nM109 S215       ; ждать, пока нагреется сопло\nG21             ; единицы — миллиметры\nG90             ; абсолютные координаты X, Y, Z\nM82             ; абсолютный режим E\nG28             ; парковка всех осей\nG92 E0          ; обнулить счётчик нити\n; ---- слой 1 ----\nG0 Z0.2 F3000\nG0 X90 Y90 F6000\nG1 X110 Y90 E0.6652 F1200\nG1 X110 Y110 E1.3304\nG1 X90 Y110 E1.9956\nG1 X90 Y90 E2.6608\n; ---- слой 2 ----\nG0 Z0.4 F3000\nG1 X110 Y90 E3.3260 F1200\nG1 X110 Y110 E3.9912\nG1 X90 Y110 E4.6564\nG1 X90 Y90 E5.3216\n; ---- финиш ----\nM104 S0         ; выключить нагрев сопла\nM140 S0         ; выключить нагрев стола\nM84             ; отключить моторы"; }},
  broken: {label: "Файл с ошибками", text: function () { return "; Файл с ошибками для итогового задания task 1-1.\n; Должен печатать два квадратных слоя 20 x 20 мм, как пример two_layers.gcode.\nM140 S60\nM104 S215\nM190 S60\nM109 S215\nG21\nG90\nM83\nG28\nG92 E0\nG0 Z0.2 F3000\nG0 X90 Y90 F6000\nG1 X110 Y90 E0.6652 F20\nG1 X110 Y110 E1.3304\nG1 X90 Y110 E1.9956\nG1 X90 Y90 E2.6608\nG0 Z0.2 F3000\nG1 X110 Y90 E3.3260 F1200\nG1 X110 Y110 E3.9912\nG1 X90 Y110 E4.6564\nG1 X90 Y90 E5.3216\nM104 S0\nM140 S0\nM84"; }},
  square: {label: "Квадрат (task 1-4)", text: function () { return squarePart(); }},
  scaffold: {label: "Скаффолд (task 1-5)", text: function () {
    return squarePart({x0: 95, y0: 95, size: 10, nLayers: 20, infill: 0.4 / 1.2, outline: false}); }}
};
