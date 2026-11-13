// Самопроверка stl-check.js: node test_stl_check.js <mesh-core.js> <stl-check.js> <stand_final.stl> <cage_v4_high.stl>
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const ctx = {module: {}, TextDecoder, DataView, console}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], "utf8") + "\nthis.MeshCore = MeshCore;", ctx);
vm.runInContext(fs.readFileSync(process.argv[3], "utf8") + "\nthis.StlCheck = StlCheck;", ctx);
const {MeshCore, StlCheck} = ctx;
const an = (tris) => MeshCore.analyze(MeshCore.index(tris));
const load = (p) => { const b = fs.readFileSync(p); return an(MeshCore.parseSTL(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)).tris); };
function box(x, y, z) {   // замкнутый брусок из 12 граней
  const v = [[0,0,0],[x,0,0],[x,y,0],[0,y,0],[0,0,z],[x,0,z],[x,y,z],[0,y,z]];
  return [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].map(f => f.map(i => v[i]));
}
const stand = StlCheck.evaluate(load(process.argv[4]), StlCheck.REFS.stand);
assert(stand.passed, "эталон подставки должен проходить"); assert(Math.abs(stand.vol - 19293.5) < 0.5);
const cage = StlCheck.evaluate(load(process.argv[5]), StlCheck.REFS.cage);
assert(cage.passed, "эталон кейджа должен проходить"); assert(Math.abs(cage.vol - 851.7) < 0.5);
const asStand = StlCheck.evaluate(load(process.argv[5]), StlCheck.REFS.stand);
assert(!asStand.passed && !asStand.rows[1].ok && !asStand.rows[2].ok, "кейдж не проходит как подставка");
const solid = StlCheck.evaluate(an(box(76.46, 34.01, 43.14)), StlCheck.REFS.stand);
assert(solid.rows[1].ok && !solid.rows[2].ok && /больше/.test(solid.rows[2].text), "брусок в габаритах подставки: объем больше");
const big = StlCheck.evaluate(an(box(44, 18, 15.76)), StlCheck.REFS.cage);
assert(!big.rows[1].ok && /вдвое/.test(big.rows[1].text), "кейдж 2:1 распознается");
const holed = StlCheck.evaluate(an(box(22, 9, 8).slice(1)), StlCheck.REFS.cage);
assert(!holed.rows[0].ok, "сетка без одной грани не замкнута");
console.log("stl-check: все проверки пройдены; подставка", stand.dims.map(d => d.toFixed(2)).join(" x "), stand.vol.toFixed(1), "| кейдж", cage.dims.map(d => d.toFixed(2)).join(" x "), cage.vol.toFixed(1));
