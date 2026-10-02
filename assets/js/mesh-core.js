/* ==========================================================================
   mesh-core.js — чтение STL и диагностика сетки для просмотрщика сеток.
   Правила подсчета те же, что в программах занятия 2 (task 2-1 … task 2-7):
   слияние вершин с округлением до 4 знаков, ребро = пара номеров вершин.
   ========================================================================== */
var MeshCore = (function () {
  "use strict";

  function parseSTL(buf) {
    var dv = new DataView(buf), size = buf.byteLength, tris = [];
    if (size >= 84) {
      var n = dv.getUint32(80, true);
      if (size === 84 + 50 * n) {
        for (var k = 0; k < n; k++) {
          var o = 84 + 50 * k + 12, t = [];
          for (var j = 0; j < 3; j++) {
            t.push([dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]);
            o += 12;
          }
          tris.push(t);
        }
        return {tris: tris, binary: true, size: size};
      }
    }
    var text = new TextDecoder("ascii").decode(buf), loop = [];
    text.split(/\r?\n/).forEach(function (line) {
      var w = line.trim().split(/\s+/);
      if (w[0] === "vertex") {
        loop.push([+w[1], +w[2], +w[3]]);
        if (loop.length === 3) { tris.push(loop); loop = []; }
      }
    });
    return {tris: tris, binary: false, size: size};
  }

  function index(tris) {
    var V = [], F = [], where = {};
    tris.forEach(function (t) {
      F.push(t.map(function (p) {
        var key = p.map(function (c) { return (Math.round(c * 1e4) / 1e4).toString(); }).join(",");
        if (!(key in where)) { where[key] = V.length; V.push(p.slice()); }
        return where[key];
      }));
    });
    return {V: V, F: F};
  }

  function ekey(u, v) { return u < v ? u + "_" + v : v + "_" + u; }

  function area(V, f) {
    var a = V[f[0]], b = V[f[1]], c = V[f[2]];
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    var n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return Math.hypot(n[0], n[1], n[2]) / 2;
  }

  function analyze(M) {
    var V = M.V, F = M.F, cnt = {}, adj = {}, seen = {}, sameDir = 0;
    F.forEach(function (f, i) {
      for (var k = 0; k < 3; k++) {
        var e = ekey(f[k], f[(k + 1) % 3]);
        cnt[e] = (cnt[e] || 0) + 1;
        (adj[e] = adj[e] || []).push(i);
      }
    });
    // повторные упорядоченные пары; ребра, у которых больше двух граней, не учитываются
    F.forEach(function (f) {
      for (var k = 0; k < 3; k++) {
        var u = f[k], v = f[(k + 1) % 3], d = u + ">" + v;
        if (cnt[ekey(u, v)] > 2) continue;
        if (seen[d]) sameDir++;
        seen[d] = true;
      }
    });
    // оболочки
    var parent = V.map(function (_, i) { return i; });
    var root = function (x) { while (parent[x] !== x) x = parent[x]; return x; };
    F.forEach(function (f) { parent[root(f[1])] = root(f[0]); parent[root(f[2])] = root(f[0]); });
    var groups = {};
    F.forEach(function (f, i) { var r = root(f[0]); (groups[r] = groups[r] || []).push(i); });
    var shells = Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return b.length - a.length; });
    var shellOf = new Array(F.length);
    shells.forEach(function (g, gi) { g.forEach(function (i) { shellOf[i] = gi; }); });
    // какие грани развернуть при согласовании ориентации (обход от первой грани каждой оболочки,
    // только через многообразные ребра)
    var cur = F.map(function (f) { return f.slice(); }), done = [], flip = [];
    shells.forEach(function (g) {
      var q = [g[0]]; done[g[0]] = true;
      while (q.length) {
        var f = cur[q.pop()];
        for (var k = 0; k < 3; k++) {
          var u = f[k], v = f[(k + 1) % 3], e = ekey(u, v);
          if (cnt[e] > 2) continue;                // через сингулярное ребро ориентацию не переносим
          adj[e].forEach(function (j) {
            if (done[j]) return;
            var h = cur[j];
            for (var m = 0; m < 3; m++) {
              if (h[m] === u && h[(m + 1) % 3] === v) { cur[j] = [h[0], h[2], h[1]]; flip[j] = true; break; }
            }
            done[j] = true; q.push(j);
          });
        }
      }
    });
    var vol = 0;
    F.forEach(function (f) {
      var a = V[f[0]], b = V[f[1]], c = V[f[2]];
      vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    });
    var used = {};
    F.forEach(function (f) { used[f[0]] = used[f[1]] = used[f[2]] = 1; });
    var edges = Object.keys(cnt);
    var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    Object.keys(used).forEach(function (i) {
      for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], V[i][k]); hi[k] = Math.max(hi[k], V[i][k]); }
    });
    return {
      V: Object.keys(used).length, E: edges.length, F: F.length,
      boundary: edges.filter(function (e) { return cnt[e] === 1; }),
      singular: edges.filter(function (e) { return cnt[e] > 2; }),
      sameDir: sameDir, shells: shells.length, shellOf: shellOf, flip: flip,
      degenerate: F.filter(function (f) { return area(V, f) < 1e-6; }).length,
      volume: vol, lo: lo, hi: hi
    };
  }

  return {parseSTL: parseSTL, index: index, analyze: analyze};
})();
