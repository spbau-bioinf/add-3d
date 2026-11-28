/* ==========================================================================
   bambu-check.js — страница «Проверка файлов Bambu Studio» (практика 5):
   проект .3mf и нарезанный файл .gcode.3mf позвонка или кейджа.
   Архив 3MF (ZIP) читается в браузере: оглавление ZIP разбирается здесь,
   сжатые записи распаковываются DecompressionStream("deflate-raw").
   Состав файлов проверен на Bambu Studio 2.9.2.62 (эталоны solutions_5).
   Самопроверка: node tools/test_bambu_check.js assets/js/bambu-check.js <папка solutions_5>.
   ========================================================================== */
var BambuCheck = (function () {
  "use strict";

  var TOL_D = 0.3;   // допуск по габариту, мм
  // Позвонки: число треугольников сетки (не зависит от поворота и положения) и эталон нарезки.
  var VERTEBRAE = [
    {name: "Th12", faces: 93244, sup: 4.50, mass: 23.64, time: "1 ч 27 мин"},
    {name: "L1", faces: 102592, sup: 6.01, mass: 26.85, time: "1 ч 39 мин"},
    {name: "L2", faces: 112052, sup: 6.07, mass: 28.78, time: "1 ч 43 мин"},
    {name: "L3", faces: 123452, sup: 6.79, mass: 31.80, time: "1 ч 53 мин"},
    {name: "L4", faces: 126574, sup: 5.09, mass: 29.53, time: "1 ч 49 мин"},
    {name: "L5", faces: 129532, sup: 4.09, mass: 28.12, time: "1 ч 42 мин"}
  ];
  var CAGE_DIMS = [7.88, 9, 22];   // кейдж в реальном размере, по возрастанию, мм (task 4-8)
  var CAGE_REFS = [
    {pos: "плашмя, древовидная", sup: 1.03, mass: 6.38, time: "28 мин 47 с"},
    {pos: "на боку, древовидная", sup: 1.08, mass: 6.72, time: "30 мин 49 с"},
    {pos: "на торце, древовидная", sup: 1.34, mass: 7.15, time: "38 мин 40 с"},
    {pos: "плашмя, обычная", sup: 1.33, mass: 6.68, time: "26 мин 56 с"}
  ];

  function fmt(x, d) { return x.toFixed(d).replace(".", ","); }
  function hms(s) {   // как в панели «Результат нарезки»: часы и минуты (до минуты) или минуты и секунды
    s = Math.round(s);
    if (s >= 3600) { var mm = Math.round(s / 60); return Math.floor(mm / 60) + " ч " + (mm % 60) + " мин"; }
    return Math.floor(s / 60) + " мин " + (s % 60) + " с";
  }

  /* ---------- ZIP ---------- */
  function zipIndex(buf) {
    var dv = new DataView(buf), n = buf.byteLength, eocd = -1;
    for (var i = n - 22; i >= Math.max(0, n - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return null;
    var cnt = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), dec = new TextDecoder("utf-8"), out = {};
    for (var k = 0; k < cnt; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      var name = dec.decode(new Uint8Array(buf, p + 46, nl));
      out[name] = {method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true),
        size: dv.getUint32(p + 24, true), off: dv.getUint32(p + 42, true)};
      p += 46 + nl + el + cl;
    }
    return out;
  }
  function zipRead(buf, e) {
    var dv = new DataView(buf), lo = e.off;
    var start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    var raw = new Uint8Array(buf, start, e.csize);
    if (e.method === 0) return Promise.resolve(new TextDecoder("utf-8").decode(raw));
    var ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(ds).text();
  }

  /* ---------- разбор ---------- */
  function attr(s, re) { var m = re.exec(s); return m ? m[1] : null; }
  // Первые байты записи ZIP как текст: заголовок G-кода читается без распаковки всего файла
  function zipReadHead(buf, e, limit) {
    var dv = new DataView(buf), lo = e.off;
    var start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    var raw = new Uint8Array(buf, start, e.csize), dec = new TextDecoder("utf-8");
    if (e.method === 0) return Promise.resolve(dec.decode(raw.subarray(0, limit)));
    var rd = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(), out = "", got = 0;
    function step() {
      return rd.read().then(function (r) {
        if (r.done) return out;
        out += dec.decode(r.value, {stream: true}); got += r.value.length;
        if (got >= limit) { rd.cancel().catch(function () {}); return out; }
        return step();
      });
    }
    return step();
  }
  // Матрица 3MF: строка из 12 чисел, v' = x·(m0 m1 m2) + y·(m3 m4 m5) + z·(m6 m7 m8) + (m9 m10 m11)
  var IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  function mat(t) { if (!t) return IDENT; var v = t.trim().split(/\s+/).map(Number); return v.length === 12 && v.every(isFinite) ? v : IDENT; }
  function apply(m, p) {
    return [p[0] * m[0] + p[1] * m[3] + p[2] * m[6] + m[9], p[0] * m[1] + p[1] * m[4] + p[2] * m[7] + m[10], p[0] * m[2] + p[1] * m[5] + p[2] * m[8] + m[11]];
  }
  function mul(a, b) {   // сначала a, затем b
    var o = apply(b, [a[9], a[10], a[11]]), r = [];
    for (var i = 0; i < 3; i++) {
      var row = [a[3 * i], a[3 * i + 1], a[3 * i + 2]];
      r.push(row[0] * b[0] + row[1] * b[3] + row[2] * b[6], row[0] * b[1] + row[1] * b[4] + row[2] * b[7], row[0] * b[2] + row[1] * b[5] + row[2] * b[8]);
    }
    return r.concat(o);
  }
  function rowLens(m) {   // масштаб по трем осям модели: длины строк матрицы
    return [0, 1, 2].map(function (i) { return Math.sqrt(m[3 * i] * m[3 * i] + m[3 * i + 1] * m[3 * i + 1] + m[3 * i + 2] * m[3 * i + 2]); });
  }
  function verts(xml, id) {   // вершины сетки объекта id
    var a = xml.indexOf('<object id="' + id + '"'); if (a < 0) return [];
    var b = xml.indexOf("</object>", a), body = xml.slice(a, b < 0 ? xml.length : b);
    var re = /<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g, m, out = [];
    while ((m = re.exec(body))) out.push([+m[1], +m[2], +m[3]]);
    return out;
  }
  function bbox(pts, m) {   // габаритный параллелепипед точек после преобразования m: {lo, hi}
    var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    pts.forEach(function (p) { var q = m ? apply(m, p) : p; for (var k = 0; k < 3; k++) { if (q[k] < lo[k]) lo[k] = q[k]; if (q[k] > hi[k]) hi[k] = q[k]; } });
    return pts.length ? {lo: lo, hi: hi} : null;
  }
  function dimsOf(bb) { return [0, 1, 2].map(function (k) { return bb.hi[k] - bb.lo[k]; }); }
  function overlap(a, b, eps) {   // параллелепипеды пересекаются по всем трем осям
    return [0, 1, 2].every(function (k) { return a.lo[k] <= b.hi[k] + eps && b.lo[k] <= a.hi[k] + eps; });
  }

  // Читает архив и возвращает сведения для evaluate()
  function inspect(buf) {
    var idx = zipIndex(buf);
    if (!idx || !idx["Metadata/project_settings.config"]) return Promise.resolve(null);
    var want = ["Metadata/project_settings.config", "Metadata/slice_info.config", "Metadata/model_settings.config", "3D/3dmodel.model"];
    var g = idx["Metadata/plate_1.gcode"], hasG = !!(g && g.size > 0);
    var jobs = want.map(function (n) { return idx[n] ? zipRead(buf, idx[n]) : Promise.resolve(""); });
    jobs.push(hasG ? zipReadHead(buf, g, 4096) : Promise.resolve(""));
    return Promise.all(jobs).then(function (t) {
      var info = {settings: JSON.parse(t[0]), slice: t[1], ms: t[2], model: t[3], gcode: hasG};
      // нормальная часть, подпись и масштаб — только в проекте
      var part = /<part id="(\d+)" subtype="normal_part"/.exec(info.ms);
      var neg = /<part id="(\d+)" subtype="negative_part"[^>]*>(?:(?!<\/part>)[\s\S])*?<text_info text="([^"]*)"/.exec(info.ms);
      info.faces = +(attr(info.ms, /<metadata face_count="(\d+)"/) || 0);
      info.text = neg ? neg[2] : null;
      info.objName = attr(info.slice, /<object [^>]*name="([^"]+)"/) || attr(info.ms, /<metadata key="name" value="([^"]+)"/);
      info.prediction = +(attr(info.slice, /key="prediction" value="([^"]+)"/) || 0);
      info.weight = +(attr(info.slice, /key="weight" value="([^"]+)"/) || 0);
      info.supportUsed = attr(info.slice, /key="support_used" value="([^"]+)"/);
      var mz = attr(t[4], /;\s*max_z_height:\s*([\d.]+)/), ln = attr(t[4], /;\s*total layer number:\s*(\d+)/);
      info.maxZ = mz === null ? null : +mz; info.layers = ln === null ? null : +ln;
      var item = mat(attr(info.model, /<item [^>]*transform="([^"]+)"/));
      function comp(id) {
        var m = new RegExp('<component p:path="([^"]+)" objectid="' + id + '"(?:[^>]*transform="([^"]+)")?').exec(info.model);
        return m ? {path: m[1].replace(/^\//, ""), m: mat(m[2])} : null;
      }
      var cp = part ? comp(part[1]) : null, ct = neg ? comp(neg[1]) : null;
      info.scales = info.gcode && !part ? null : rowLens(mul(cp ? cp.m : IDENT, item));
      info.scale = info.scales ? info.scales[0] : null;
      if (!cp || !idx[cp.path]) return info;
      return zipRead(buf, idx[cp.path]).then(function (xml) {
        var pv = verts(xml, part[1]), loc = bbox(pv);
        if (!loc) return info;
        info.localDims = dimsOf(loc).sort(function (x, y) { return x - y; });   // модель в собственных координатах
        info.worldDims = dimsOf(bbox(pv, mul(cp.m, item)));                      // как стоит на столе: X, Y, Z
        if (!ct) return info;
        return (ct.path === cp.path ? Promise.resolve(xml) : idx[ct.path] ? zipRead(buf, idx[ct.path]) : Promise.resolve("")).then(function (x2) {
          var tb = bbox(verts(x2, neg[1]), ct.m), pb = bbox(pv, cp.m);
          info.textOnPart = !!(tb && pb && overlap(tb, pb, 0.05));   // вырез пересекает габарит кейджа
          return info;
        });
      });
    });
  }

  /* ---------- заключение ---------- */
  var CAGE_Z = [{z: 15.8, pos: "плашмя"}, {z: 18, pos: "на боку"}, {z: 44, pos: "на торце"}];   // высота печати кейджа 2 : 1, мм
  var TOL_Z = 0.7;           // допуск по высоте печати: слой 0,2 мм и допуск модели практики 4 в масштабе 2 : 1
  var CAGE_MASS = [3, 11];   // масса нарезки кейджа 2 : 1, г: от тонких стенок без поддержек до сплошной детали с поддержками
  // kind: "vertebra" | "cage"; other — сведения о парном файле кейджа (проект для нарезанного файла), если он открыт
  // возвращает {stats:[[k,v]], rows:[{ok,text}], passed}
  function evaluate(info, kind, other) {
    var s = info.settings, rows = [], stats = [];
    var fil = (s.filament_settings_id || [])[0] || "", isProj = !info.gcode;
    stats.push(["Файл", isProj ? "проект .3mf" : "нарезанный .gcode.3mf"]);
    stats.push(["Принтер", (s.printer_model || "?") + ", сопло " + ((s.nozzle_diameter || ["?"])[0])]);
    stats.push(["Материал", fil || "?"]);
    stats.push(["Процесс", s.print_settings_id || "?"]);
    rows.push(s.printer_model === "Bambu Lab A1 mini" && (s.nozzle_diameter || [])[0] === "0.4"
      ? {ok: true, text: "Принтер Bambu Lab A1 mini, сопло 0,4 мм."}
      : {ok: false, text: "Принтер не Bambu Lab A1 mini 0,4: выберите его в панели «Принтер» (task 5-0, раздел 4)."});
    rows.push(/^Bambu PLA Matte/.test(fil)
      ? {ok: true, text: "Материал Bambu PLA Matte."}
      : {ok: false, text: "Материал «" + fil + "», а нужен Bambu PLA Matte: смените его в «Филаментах проекта» (task 5-0, раздел 4)."});
    rows.push(s.layer_height === "0.2"
      ? {ok: true, text: "Высота слоя 0,2 мм."}
      : {ok: false, text: "Высота слоя " + s.layer_height + " мм, а нужна 0,2 мм: профиль процесса 0.20mm Standard @BBL A1M."});
    rows.push(s.curr_bed_type === "Textured PEI Plate"
      ? {ok: true, text: "Лист Textured PEI Plate."}
      : {ok: false, text: "Лист «" + s.curr_bed_type + "», а на принтере стоит Textured PEI Plate: от листа зависит температура стола."});
    var sup = isProj ? s.enable_support === "1" : info.supportUsed === "true";
    if (kind === "vertebra") {
      var v = null;
      VERTEBRAE.forEach(function (x) { if (info.faces === x.faces || new RegExp("^" + x.name + "\\b", "i").test(info.objName || "")) v = x; });
      stats.push(["Позвонок", v ? v.name : "не распознан"]);
      rows.push(v ? {ok: true, text: "Позвонок " + v.name + (isProj ? " (по числу треугольников сетки)." : " (по имени объекта).")}
        : {ok: false, text: "Позвонок не распознан: откройте файл позвонка из папки преподавателя (task 5-0, раздел 6)."});
      if (isProj) rows.push(info.scales.every(function (x) { return Math.abs(x - 1) < 0.005; })
        ? {ok: true, text: "Масштаб 1 : 1."}
        : {ok: false, text: "Масштаб " + info.scales.map(function (x) { return fmt(x, 2); }).join(" × ") + " по осям модели, а позвонок печатается в натуральную величину: верните масштаб 100 %."});
      rows.push(sup ? {ok: true, text: "Поддержки включены."}
        : {ok: false, text: "Поддержки выключены: без них позвонок не напечатать (task 5-1, раздел 4)."});
      if (!isProj && v) rows.push({ok: null, text: "Время " + hms(info.prediction) + ", масса " + fmt(info.weight, 2) + " г. Эталон " + v.name + " по правилу: " + v.time + ", " + fmt(v.mass, 2) + " г (поддержки " + fmt(v.sup, 2) + " г); после автоориентации числа меньше. Не оценивается."});
    } else {
      var dimsOk = info.localDims && info.localDims.every(function (d, k) { return Math.abs(d - CAGE_DIMS[k]) <= TOL_D; });
      if (isProj) {
        rows.push(!info.localDims ? {ok: false, text: "В проекте не найдена сетка детали."}
          : dimsOk ? {ok: true, text: "Модель — кейдж " + info.localDims.map(function (d) { return fmt(d, 2); }).join(" × ") + " мм в реальном размере."}
          : {ok: false, text: "Модель " + info.localDims.map(function (d) { return fmt(d, 2); }).join(" × ") + " мм не похожа на кейдж 7,88 × 9 × 22 мм: откройте cage.stl практики 4."});
        var sc = info.scales, uni = Math.max.apply(null, sc) - Math.min.apply(null, sc) < 0.01;
        stats.push(["Масштаб", uni ? fmt(sc[0], 2) + " : 1" : sc.map(function (x) { return fmt(x, 2); }).join(" × ")]);
        rows.push(sc.every(function (x) { return Math.abs(x - 2) < 0.01; })
          ? {ok: true, text: "Масштаб 2 : 1 по всем трем осям: размер на столе " + (info.worldDims || []).map(function (d) { return fmt(d, 2); }).join(" × ") + " мм."}
          : uni ? {ok: false, text: "Масштаб " + fmt(sc[0], 2) + " : 1, а нужен 2 : 1: «Масштаб [S]» → 200 % (task 5-6, раздел 1)."}
          : {ok: false, text: "Масштаб по осям модели разный: " + sc.map(function (x) { return fmt(x, 2); }).join(" × ") + ". Нужен 2 : 1 по всем осям: поставьте флажок «Равномерное масштабирование» и введите 200 % (task 5-6, раздел 1)."});
        stats.push(["Подпись", info.text ? "«" + info.text + "»" : "нет"]);
        rows.push(!info.text ? {ok: false, text: "Подписи нет: добавьте инициалы инструментом «Форма текста [T]», операция «Резка» (task 5-6, раздел 4)."}
          : info.textOnPart ? {ok: true, text: "Подпись «" + info.text + "» вырезана в кейдже (операция «Резка»)."}
          : {ok: false, text: "Подпись «" + info.text + "» не лежит на кейдже: перетащите желтый квадрат текста на боковую стенку (task 5-6, раздел 4)."});
        if (info.text === "ЕАИ") rows.push({ok: null, text: "Подпись совпадает с примером на снимках task 5-6: проверьте, что это ваши инициалы."});
        rows.push({ok: null, text: "Нарезку, время и массу показывает нарезанный файл cage_5.gcode.3mf: проект их не хранит. Откройте его следом: страница сравнит высоту печати с этим проектом."});
      } else {
        var nm = info.objName || "";
        rows.push(/cage/i.test(nm) ? {ok: true, text: "Нарезан объект «" + nm + "»."}
          : {ok: false, text: "Нарезан объект «" + nm + "», а не кейдж: в проекте должна стоять модель cage.stl практики 4 (task 5-6, раздел 1)."});
        var hit = null;
        if (info.maxZ !== null) CAGE_Z.forEach(function (c) { if (Math.abs(info.maxZ - c.z) <= TOL_Z) hit = c; });
        rows.push(hit ? {ok: true, text: "Высота печати " + fmt(info.maxZ, 2) + " мм: кейдж 2 : 1 " + hit.pos + "."}
          : {ok: false, text: (info.maxZ === null ? "Высота печати в файле не найдена" : "Высота печати " + fmt(info.maxZ, 2) + " мм") +
            ", а у кейджа 2 : 1 она 15,8, 18 или 44 мм: проверьте масштаб 200 % и поворот на 90° (task 5-6, разделы 1 и 2)."});
        if (info.weight < CAGE_MASS[0] || info.weight > CAGE_MASS[1]) rows.push({ok: false, text: "Масса " + fmt(info.weight, 2) +
          " г не похожа на кейдж 2 : 1 (эталоны 6,4–7,2 г): проверьте масштаб и модель."});
        if (other && other.worldDims) {
          var zp = other.worldDims[2];
          rows.push(info.maxZ !== null && Math.abs(info.maxZ - zp) <= 0.25
            ? {ok: true, text: "Высота печати совпадает с высотой кейджа в открытом проекте (" + fmt(zp, 2) + " мм)."}
            : {ok: false, text: "Нарезанный файл не от этого проекта: высота печати " + (info.maxZ === null ? "не найдена" : fmt(info.maxZ, 2) + " мм") +
              ", а кейдж в проекте стоит на высоте " + fmt(zp, 2) + " мм. Нарежьте проект и сохраните оба файла заново (task 5-6, раздел 5)."});
        } else rows.push({ok: null, text: "Масштаб по осям и подпись проверяются по проекту cage_5.3mf: в нарезанном файле нет сетки. Откройте сначала проект, затем этот файл: страница сравнит высоту печати с проектом."});
        rows.push({ok: null, text: "Время " + hms(info.prediction) + ", масса " + fmt(info.weight, 2) + " г, поддержки " + (sup ? "есть" : "нет") +
          ". Эталоны 2 : 1: " + CAGE_REFS.map(function (r) { return r.pos + " — " + r.time + ", " + fmt(r.mass, 2) + " г"; }).join("; ") + ". Не оценивается."});
      }
    }
    if (!isProj) rows.push(info.gcode ? {ok: true, text: "Файл нарезан: в нем есть G-код для принтера."}
      : {ok: false, text: "G-кода в файле нет."});
    if (isProj && kind === "vertebra") rows.push({ok: null, text: "Это проект: время и массу показывает нарезанный файл vertebra_5.gcode.3mf."});
    return {stats: stats, rows: rows, passed: rows.every(function (r) { return r.ok !== false; })};
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () {
    var box = document.getElementById("bc"); if (!box) return;
    var $ = function (id) { return document.getElementById(id); }, last = null, proj = null;   // proj — последний открытый проект кейджа
    function kind() { return box.querySelector("input[name=bc-part]:checked").value; }
    function stat(k, v) { return '<div class="gv__stat"><span class="gv__stat-k">' + k + '</span><span class="gv__stat-v">' + v + "</span></div>"; }
    function show() {
      if (!last) return;
      var r = evaluate(last.info, kind(), kind() === "cage" && last.info.gcode ? proj : null);
      $("bc-stats").innerHTML = r.stats.map(function (x) { return stat(x[0], x[1]); }).join("");
      $("bc-warns").innerHTML = r.rows.map(function (x) {
        return "<li" + (x.ok === true ? ' class="gv__ok"' : x.ok === null ? ' class="gv__note"' : "") + ">" + x.text + "</li>"; }).join("");
      $("bc-line").textContent = "Файл " + last.name + ": " + (r.passed ? "все строки зачета в порядке." : "есть расхождения, смотрите строки выше.");
    }
    $("bc-file").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      $("bc-line").textContent = "Читаю " + f.name + "…";
      f.arrayBuffer().then(inspect).then(function (info) {
        if (!info) { last = null; $("bc-stats").innerHTML = ""; $("bc-warns").innerHTML = ""; $("bc-line").textContent = "Файл " + f.name + " не похож на файл Bambu Studio (.3mf)."; return; }
        last = {info: info, name: f.name};
        if (!info.gcode && kind() === "cage") proj = info;
        show();
      }).catch(function () { $("bc-line").textContent = "Не удалось прочитать " + f.name + ": откройте файл в Bambu Studio и сохраните заново."; });
    });
    Array.prototype.forEach.call(box.querySelectorAll("input[name=bc-part]"), function (r) { r.addEventListener("change", show); });
    var want = location.hash.slice(1);
    if (want === "cage" || want === "vertebra") box.querySelector("input[value=" + want + "]").checked = true;
  });

  return {inspect: inspect, evaluate: evaluate, zipIndex: zipIndex, VERTEBRAE: VERTEBRAE, CAGE_REFS: CAGE_REFS};
})();
if (typeof module !== "undefined") module.exports = BambuCheck;
