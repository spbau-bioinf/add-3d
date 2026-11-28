// Самопроверка bambu-check.js: node tools/test_bambu_check.js <bambu-check.js> <папка solutions_5>
// Эталоны (cage_5.*, vertebra_5_L4.*, stand_5.gcode.3mf, pp_cage_normal.gcode.3mf) лежат вне репозитория:
// Практика 5/03_Разработка/solutions_5. Измененные копии собираются в памяти.
const fs = require("fs"), path = require("path"), zlib = require("zlib"), assert = require("assert");
const BC = require(path.resolve(process.argv[2])), dir = process.argv[3];
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
const load = (n) => ab(fs.readFileSync(path.join(dir, n)));

// Распаковать архив в {имя: Buffer} и собрать снова без сжатия (контрольные суммы страница не читает)
function unzip(buf) {
  const idx = BC.zipIndex(buf), dv = new DataView(buf), out = {};
  for (const [name, e] of Object.entries(idx)) {
    const start = e.off + 30 + dv.getUint16(e.off + 26, true) + dv.getUint16(e.off + 28, true);
    const raw = Buffer.from(buf, start, e.csize);
    out[name] = e.method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);
  }
  return out;
}
function zip(files) {
  const locals = [], centrals = []; let off = 0;
  for (const [name, data] of Object.entries(files)) {
    const nb = Buffer.from(name, "utf8"), lh = Buffer.alloc(30), ch = Buffer.alloc(46);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nb, data); centrals.push(ch, nb); off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22), n = Object.keys(files).length;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(n, 8); end.writeUInt16LE(n, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return ab(Buffer.concat([...locals, cd, end]));
}
// Копия архива с заменой текста в одной записи
function patched(buf, name, from, to) {
  const f = unzip(buf), s = f[name].toString("utf8");
  assert(s.includes(from), "в " + name + " нет строки для замены: " + from);
  f[name] = Buffer.from(s.replace(from, to), "utf8");
  return zip(f);
}
const bad = (r, re) => r.rows.some((x) => x.ok === false && re.test(x.text));

(async () => {
  const proj = load("cage_5.3mf"), sliced = load("cage_5.gcode.3mf");
  const pi = await BC.inspect(proj), si = await BC.inspect(sliced);

  // 1. эталоны кейджа проходят
  let r = BC.evaluate(pi, "cage");
  assert(r.passed, "эталонный проект кейджа должен проходить");
  assert(pi.scales.every((x) => Math.abs(x - 2) < 1e-6) && pi.textOnPart === true && Math.abs(pi.worldDims[2] - 15.77) < 0.01);
  r = BC.evaluate(si, "cage", pi);
  assert(r.passed && si.maxZ === 15.8 && si.layers === 79, "эталонный нарезанный файл кейджа должен проходить");
  assert(r.rows.some((x) => x.ok === true && /совпадает с высотой кейджа/.test(x.text)), "высота печати сверяется с проектом");
  r = BC.evaluate(await BC.inspect(load("pp_cage_normal.gcode.3mf")), "cage", pi);
  assert(r.passed, "нарезка с обычной поддержкой проходит");

  // 1а. эталоны трех положений и обычной поддержки без подписи (если лежат в папке)
  for (const [f, z, n] of [["pp_cage_flat_tree.gcode.3mf", 15.8, 79], ["pp_cage_side_tree.gcode.3mf", 18, 90], ["pp_cage_end_tree.gcode.3mf", 44, 220], ["pp_cage_flat_normal_nosign.gcode.3mf", 15.8, 104]]) {
    if (!fs.existsSync(path.join(dir, f))) continue;
    const i = await BC.inspect(load(f));
    assert(BC.evaluate(i, "cage").passed && i.maxZ === z && i.layers === n, f + ": кейдж 2 : 1 должен проходить");
  }

  // 2. чужие детали в режиме «Кейдж» не проходят
  r = BC.evaluate(await BC.inspect(load("vertebra_5_L4.gcode.3mf")), "cage");
  assert(!r.passed && bad(r, /а не кейдж/) && bad(r, /Высота печати 53,60/), "нарезанный позвонок не проходит как кейдж");
  r = BC.evaluate(await BC.inspect(load("stand_5.gcode.3mf")), "cage");
  assert(!r.passed && bad(r, /а не кейдж/) && bad(r, /Высота печати 34,00/), "нарезанная подставка не проходит как кейдж");

  // 3. кейдж 1 : 1: высота 8,00 мм и масса 0,9 г
  let b = patched(sliced, "Metadata/plate_1.gcode", "; max_z_height: 15.80", "; max_z_height: 8.00");
  b = patched(b, "Metadata/slice_info.config", 'key="weight" value="6.39"', 'key="weight" value="0.90"');
  r = BC.evaluate(await BC.inspect(b), "cage", pi);
  assert(!r.passed && bad(r, /Высота печати 8,00/) && bad(r, /Масса 0,90/) && bad(r, /не от этого проекта/), "кейдж 1 : 1 не проходит");

  // 4. подпись в стороне от кейджа
  b = patched(proj, "3D/3dmodel.model", "-4.50000048 -7.37217617 -1.41158283", "95.5 -7.37217617 -1.41158283");
  r = BC.evaluate(await BC.inspect(b), "cage");
  assert(!r.passed && bad(r, /не лежит на кейдже/), "подпись вне кейджа не засчитывается");

  // 5. подпись не вырезом
  b = patched(proj, "Metadata/model_settings.config", 'subtype="negative_part"', 'subtype="modifier_part"');
  r = BC.evaluate(await BC.inspect(b), "cage");
  assert(!r.passed && bad(r, /Подписи нет/), "подпись другой операцией не засчитывается");

  // 6. масштаб 200 % только по X
  b = patched(proj, "3D/3dmodel.model", 'transform="2 0 0 0 2 0 0 0 2 90 90', 'transform="2 0 0 0 1 0 0 0 1 90 90');
  r = BC.evaluate(await BC.inspect(b), "cage");
  assert(!r.passed && bad(r, /по осям модели разный/), "неравномерный масштаб не проходит");

  // 7. проект повернули после нарезки: нарезанный файл от другого положения
  b = patched(proj, "3D/3dmodel.model", 'transform="2 0 0 0 2 0 0 0 2 90 90 7.88393927"', 'transform="2 0 0 0 0 2 0 -2 0 90 90 22"');
  const rot = await BC.inspect(b);
  assert(BC.evaluate(rot, "cage").passed && Math.abs(rot.worldDims[2] - 44) < 0.01, "повернутый проект сам по себе проходит");
  r = BC.evaluate(si, "cage", rot);
  assert(!r.passed && bad(r, /не от этого проекта/), "нарезанный файл от другого положения не проходит");

  // 8. позвонок
  r = BC.evaluate(await BC.inspect(load("vertebra_5_L4.3mf")), "vertebra");
  assert(r.passed && r.stats.some((x) => x[0] === "Позвонок" && x[1] === "L4"), "проект L4 проходит как позвонок");
  r = BC.evaluate(await BC.inspect(load("vertebra_5_L4.gcode.3mf")), "vertebra");
  assert(r.passed, "нарезанный L4 проходит как позвонок");
  r = BC.evaluate(pi, "vertebra");
  assert(!r.passed, "кейдж не проходит как позвонок");

  console.log("bambu-check: все проверки пройдены; кейдж на столе", pi.worldDims.map((d) => d.toFixed(2)).join(" x "), "| высота печати", si.maxZ, "| слоев", si.layers);
})().catch((e) => { console.error("bambu-check: ОШИБКА:", e.message); process.exit(1); });
