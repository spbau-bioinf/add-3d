/* ==========================================================================
   slicer-core.js — учебный слайсер: от STL к G-коду в диалекте занятия.
   Нужна библиотека ClipperLib (assets/js/clipper.js, Angus Johnson, Boost
   Software License). Работает в браузере и в Node.js (для проверки).

   Что делает:
     1. parseSTL(buffer)  — читает двоичный или текстовый STL в список треугольников;
     2. sliceMesh(tris, H) — для каждой высоты Z = H/2 + k·H находит пересечение
        треугольников с плоскостью, собирает отрезки в замкнутые контуры и
        объединяет их в многоугольники с отверстиями (ClipperLib);
     3. buildLayerPaths(polys, k, opt) — строит периметры (смещение внутрь на
        W/2, затем на W) и заполнение (линии растра с шагом W/плотность,
        направление 0°/90° чередуется, перекрытие с периметром W/2; первые и
        последние слои сплошные);
     4. toGcode(layers, opt) — записывает G-код: подготовка как в примере
        task 1-1, относительная подача M83, подача по балансу объема.
   Чего не делает: поддержки, ориентация модели, ретракт, скорости по типам
   линий, настройки материала. Это сознательные упрощения учебной программы.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./clipper.js"));
  else root.SlicerCore = factory(root.ClipperLib);
})(typeof self !== "undefined" ? self : this, function (ClipperLib) {
  "use strict";
  var SCALE = 1000;   // ClipperLib работает с целыми: 1 мкм

  // ---------- 1. STL ----------
  function parseSTL(buf) {
    var bytes = new Uint8Array(buf), head = "";
    for (var i = 0; i < Math.min(80, bytes.length); i++) head += String.fromCharCode(bytes[i]);
    var dv = new DataView(buf), tris = [];
    var isBinary = bytes.length >= 84 && 84 + dv.getUint32(80, true) * 50 === bytes.length;
    if (isBinary) {
      var n = dv.getUint32(80, true), o = 84;
      for (var t = 0; t < n; t++) {
        var v = [];
        for (var k = 0; k < 3; k++) { var b = o + 12 + k * 12; v.push([dv.getFloat32(b, true), dv.getFloat32(b + 4, true), dv.getFloat32(b + 8, true)]); }
        tris.push(v); o += 50;
      }
    } else {
      var text = new TextDecoder().decode(bytes), m, re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g, cur = [];
      while ((m = re.exec(text))) { cur.push([+m[1], +m[2], +m[3]]); if (cur.length === 3) { tris.push(cur); cur = []; } }
    }
    return tris;
  }
  function bounds(tris) {
    var b = {minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity};
    tris.forEach(function (t) { t.forEach(function (p) {
      b.minX = Math.min(b.minX, p[0]); b.maxX = Math.max(b.maxX, p[0]); b.minY = Math.min(b.minY, p[1]); b.maxY = Math.max(b.maxY, p[1]); b.minZ = Math.min(b.minZ, p[2]); b.maxZ = Math.max(b.maxZ, p[2]);
    }); });
    return b;
  }

  // ---------- 2. сечения ----------
  function key(x, y) { return Math.round(x * SCALE) + "," + Math.round(y * SCALE); }
  function sliceAt(tris, z) {
    var segs = [];
    tris.forEach(function (t) {
      var pts = [];
      for (var i = 0; i < 3; i++) {
        var a = t[i], b = t[(i + 1) % 3];
        if ((a[2] < z) !== (b[2] < z)) {          // ребро пересекает плоскость
          var f = (z - a[2]) / (b[2] - a[2]);
          pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        }
      }
      if (pts.length === 2 && key(pts[0][0], pts[0][1]) !== key(pts[1][0], pts[1][1])) segs.push(pts);
    });
    // связываем отрезки в замкнутые контуры по совпадающим концам
    var byStart = {};
    segs.forEach(function (s, i) { (byStart[key(s[0][0], s[0][1])] = byStart[key(s[0][0], s[0][1])] || []).push(i); (byStart[key(s[1][0], s[1][1])] = byStart[key(s[1][0], s[1][1])] || []).push(i); });
    var used = new Array(segs.length).fill(false), loops = [];
    for (var i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      var loop = [segs[i][0]], cur = segs[i][1]; used[i] = true;
      for (var guard = 0; guard < segs.length; guard++) {
        loop.push(cur);
        var cand = byStart[key(cur[0], cur[1])] || [], next = -1;
        for (var c = 0; c < cand.length; c++) if (!used[cand[c]]) { next = cand[c]; break; }
        if (next < 0) break;
        used[next] = true;
        var s = segs[next]; cur = key(s[0][0], s[0][1]) === key(cur[0], cur[1]) ? s[1] : s[0];
        if (key(cur[0], cur[1]) === key(loop[0][0], loop[0][1])) break;
      }
      if (loop.length >= 3) loops.push(loop);
    }
    // объединение контуров: внешние и отверстия (правило чет-нечет)
    var paths = loops.map(function (l) { return l.map(function (p) { return {X: Math.round(p[0] * SCALE), Y: Math.round(p[1] * SCALE)}; }); });
    var cl = new ClipperLib.Clipper(), out = new ClipperLib.Paths();
    cl.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    cl.Execute(ClipperLib.ClipType.ctUnion, out, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
    return out;   // Paths: внешние контуры по часовой стрелке положительные, отверстия отрицательные
  }
  function sliceMesh(tris, H) {
    var b = bounds(tris), layers = [], k = 0;
    for (var z = b.minZ + H / 2; z < b.maxZ - 1e-6; z += H, k++) layers.push({k: k, z: Math.round((k + 1) * H * 1000) / 1000, polys: sliceAt(tris, z)});
    return {layers: layers, bounds: b};
  }

  // ---------- 3. траектории слоя ----------
  function offset(paths, delta) {
    var co = new ClipperLib.ClipperOffset(2, 0.25 * SCALE), out = new ClipperLib.Paths();
    co.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
    co.Execute(out, delta * SCALE);
    return out;
  }
  function infillLines(region, spacing, angle90, overlapPaths) {
    // линии растра по всей рамке области, обрезанные областью (открытые пути в ClipperLib)
    if (!region.length) return [];
    var b = ClipperLib.JS.BoundsOfPaths(region), lines = new ClipperLib.Paths();
    var lo = (angle90 ? b.top : b.left), hi = (angle90 ? b.bottom : b.right), span = hi - lo;
    var n = Math.floor(span / (spacing * SCALE) + 1e-9) + 1, first = lo + (span - (n - 1) * spacing * SCALE) / 2;
    for (var i = 0; i < n; i++) {
      var t = Math.round(first + i * spacing * SCALE);
      lines.push(angle90 ? [{X: b.left - SCALE, Y: t}, {X: b.right + SCALE, Y: t}] : [{X: t, Y: b.top - SCALE}, {X: t, Y: b.bottom + SCALE}]);
    }
    var cl = new ClipperLib.Clipper(), tree = new ClipperLib.PolyTree();
    cl.AddPaths(lines, ClipperLib.PolyType.ptSubject, false);
    cl.AddPaths(overlapPaths, ClipperLib.PolyType.ptClip, true);
    cl.Execute(ClipperLib.ClipType.ctIntersection, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    var open = ClipperLib.Clipper.OpenPathsFromPolyTree(tree);
    // упорядочиваем зигзагом: соседние линии в противоположных направлениях
    open.sort(function (p, q) { return angle90 ? p[0].Y - q[0].Y : p[0].X - q[0].X; });
    return open.map(function (p, i) { return i % 2 ? p.slice().reverse() : p; });
  }
  function buildLayerPaths(layer, opt, nLayers) {
    var W = opt.W, perims = [], shell = layer.polys, inner;
    for (var i = 0; i < opt.perimeters; i++) {
      var p = offset(layer.polys, -(W / 2 + i * W));
      if (!p.length) break;
      perims.push(p); inner = p;
    }
    var density = (layer.k < opt.solidLayers || layer.k >= nLayers - opt.solidLayers) ? 1 : opt.infill;
    var fill = [];
    if (inner && density > 0) {
      var region = offset(inner, -W / 2 + W / 2 * opt.overlap);   // область заполнения заходит на внутренний периметр на overlap·W/2
      fill = infillLines(region, W / density, layer.k % 2 === 1, region);
    }
    return {z: layer.z, perims: perims, fill: fill, solid: density === 1};
  }

  // ---------- 4. G-код ----------
  function toGcode(layers, opt) {
    var W = opt.W, H = opt.H, A = Math.PI * Math.pow(opt.d / 2, 2), out = [], x = 0, y = 0;
    var e = function (L) { return (L * W * H / A).toFixed(5); };
    var f3 = function (v) { return (v / SCALE).toFixed(3); };
    var travel = function (p) { out.push("G0 X" + f3(p.X) + " Y" + f3(p.Y) + " F6000"); x = p.X; y = p.Y; };
    var extrude = function (p, f) { var L = Math.hypot(p.X - x, p.Y - y) / SCALE; out.push("G1 X" + f3(p.X) + " Y" + f3(p.Y) + " E" + e(L) + " F" + f); x = p.X; y = p.Y; };
    out.push("; учебный слайсер курса: " + opt.name, "; высота слоя " + H + " мм, ширина дорожки " + W + " мм, периметров " + opt.perimeters + ", заполнение " + Math.round(opt.infill * 100) + " %, сплошных слоев снизу и сверху " + opt.solidLayers);
    out.push("M140 S60", "M104 S215", "M190 S60", "M109 S215", "G21", "G90", "M83", "G28");
    layers.forEach(function (L) {
      out.push("; LAYER " + L.z, "G0 Z" + L.z.toFixed(3) + " F3000");
      L.perims.forEach(function (ring) { ring.forEach(function (poly) {
        if (poly.length < 3) return;
        travel(poly[0]);
        for (var i = 1; i < poly.length; i++) extrude(poly[i], 1200);
        extrude(poly[0], 1200);
      }); });
      L.fill.forEach(function (line) { travel(line[0]); for (var i = 1; i < line.length; i++) extrude(line[i], 1800); });
    });
    out.push("M104 S0", "M140 S0", "M84");
    return out.join("\n");
  }

  function slice(tris, opt) {
    opt = Object.assign({W: 0.4, H: 0.2, d: 1.75, perimeters: 2, infill: 0.2, solidLayers: 3, overlap: 0.5, name: "model", centerX: 125, centerY: 105}, opt || {});
    var b = bounds(tris), dx = opt.centerX - (b.minX + b.maxX) / 2, dy = opt.centerY - (b.minY + b.maxY) / 2, dz = -b.minZ;
    var moved = tris.map(function (t) { return t.map(function (p) { return [p[0] + dx, p[1] + dy, p[2] + dz]; }); });
    var s = sliceMesh(moved, opt.H), paths = s.layers.map(function (L) { return buildLayerPaths(L, opt, s.layers.length); });
    return {gcode: toGcode(paths, opt), layers: paths, bounds: b, nLayers: s.layers.length};
  }
  return {parseSTL: parseSTL, bounds: bounds, sliceMesh: sliceMesh, buildLayerPaths: buildLayerPaths, toGcode: toGcode, slice: slice};
});
