"""Генератор моделей практики 2: создает все STL в assets/files и пересобирает assets/js/mesh-files.js.

Запуск из корня репозитория: python tools/make_models.py
Нужны numpy и trimesh. Генератор шума детерминирован (seed 7), поэтому повторный
запуск дает те же файлы. Если менять модели, пересчитайте эталоны и «Требуемый вывод».
"""
import numpy as np, trimesh, struct, os, base64, json
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "files"); os.makedirs(OUT, exist_ok=True)

def normal(a, b, c):
    n = np.cross(b - a, c - a); l = np.linalg.norm(n)
    return n / l if l > 0 else np.zeros(3)

def write_ascii(path, name, tris):
    with open(path, "w", newline="\n") as f:
        f.write(f"solid {name}\n")
        for a, b, c in tris:
            a, b, c = map(np.asarray, (a, b, c)); n = normal(a, b, c) + 0.0
            f.write(f"  facet normal {n[0]:.6g} {n[1]:.6g} {n[2]:.6g}\n    outer loop\n")
            for v in (a, b, c):
                f.write(f"      vertex {v[0]:.6g} {v[1]:.6g} {v[2]:.6g}\n")
            f.write("    endloop\n  endfacet\n")
        f.write(f"endsolid {name}\n")

def write_bin(path, header, tris):
    h = header.encode("ascii")[:80].ljust(80, b" ")
    with open(path, "wb") as f:
        f.write(h); f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            a, b, c = map(lambda v: np.asarray(v, dtype=np.float32).astype(float), (a, b, c))
            n = normal(a, b, c)
            f.write(struct.pack("<12fH", *n, *a, *b, *c, 0))

def tris_of(m):
    return [tuple(m.vertices[i] for i in f) for f in m.faces]

# 1. пирамида из лекции
V = np.array([[0,0,0],[1,0,0],[0,1,0],[0,0,1]], float)
F = [(0,1,3),(0,2,1),(0,3,2),(1,2,3)]
pyr = [tuple(V[i] for i in f) for f in F]
write_ascii(f"{OUT}/pyramid.stl", "triangular_pyramid", pyr)

# 2. фаланга: поверхность вращения, мм
def bone(L=40.0, nt=24, nth=24, x0=60.0, y0=50.0):
    verts = [(x0, y0, 0.0)]
    for i in range(1, nt):
        t = np.pi * i / nt
        z = L * (1 - np.cos(t)) / 2
        r = (6.0 - 2.0 * np.sin(np.pi * z / L)) * np.sqrt(np.sin(t))
        for j in range(nth):
            a = 2 * np.pi * j / nth
            verts.append((x0 + r * np.cos(a), y0 + r * np.sin(a), z))
    verts.append((x0, y0, L))
    V = np.round(np.array(verts), 4); faces = []
    ring = lambda i, j: 1 + (i - 1) * nth + (j % nth)
    for j in range(nth):
        faces.append((0, ring(1, j + 1), ring(1, j)))
    for i in range(1, nt - 1):
        for j in range(nth):
            a, b, c, d = ring(i, j), ring(i, j + 1), ring(i + 1, j + 1), ring(i + 1, j)
            faces += [(a, b, c), (a, c, d)]
    top = len(V) - 1
    for j in range(nth):
        faces.append((top, ring(nt - 1, j), ring(nt - 1, j + 1)))
    return trimesh.Trimesh(V, faces, process=False)
fin = bone()
print("finger", len(fin.faces), fin.is_watertight, fin.is_winding_consistent, fin.volume, fin.bounds)
write_bin(f"{OUT}/finger.stl", "finger bone, binary STL", tris_of(fin))
# 3. кольцо в дюймах
ring = trimesh.creation.torus(major_radius=0.55, minor_radius=0.16, major_sections=36, minor_sections=16)
ring.apply_translation([2.0, 2.0, -ring.bounds[0][2]])
ring.vertices = np.round(ring.vertices, 5)
print("ring", len(ring.faces), ring.is_watertight, ring.euler_number, ring.bounds)
write_bin(f"{OUT}/ring.stl", "ring, binary STL", tris_of(ring))

# 4. дыры: убрать грани фаланги
fi = fin.faces.copy()
c = fin.triangles_center
def near(p, r): return np.where(np.linalg.norm(c - p, axis=1) < r)[0]
vid = int(np.argmin(np.linalg.norm(fin.vertices - [64.0, 50, 20], axis=1)))
h1 = np.where((fin.faces == vid).any(axis=1))[0]
h2 = near(np.array([55.5, 50, 8]), 0.9)
rem = set(h1) | set(h2)
holed = [tuple(fin.vertices[i] for i in f) for k, f in enumerate(fi) if k not in rem]
print("holed removed", len(h1), len(h2), len(holed))
write_bin(f"{OUT}/holed.stl", "finger with holes", holed)

# 5. перевернутые нормали: заплатка у боковой стороны
flip = set(near(np.array([60, 54.2, 26]), 1.6))
fl = []
for k, f in enumerate(fi):
    t = tuple(fin.vertices[i] for i in f)
    fl.append((t[0], t[2], t[1]) if k in flip else t)
print("flipped", len(flip))
write_bin(f"{OUT}/flipped.stl", "finger with flipped patch", fl)

# 6. два куба по ребру (сингулярное ребро)
def cube(o, s):
    m = trimesh.creation.box(extents=[s, s, s]); m.apply_translation(np.array(o) + s / 2); return m
c1 = cube([0, 0, 0], 10); c2 = cube([10, 10, 0], 10)
write_bin(f"{OUT}/two_cubes.stl", "two cubes sharing an edge", tris_of(c1) + tris_of(c2))

# 7. оболочки и вырожденные грани
deb1 = trimesh.creation.icosphere(subdivisions=1, radius=0.6); deb1.apply_translation([75, 50, 20])
deb2 = trimesh.creation.box(extents=[1, 1, 1]); deb2.apply_translation([60, 50, 20])  # внутри фаланги
needles = [((52, 44, 1), (53, 44, 1), (54, 44, 1)), ((52, 56, 3), (52, 56, 3), (52, 57, 3))]
sh = tris_of(fin) + tris_of(deb1) + tris_of(deb2) + needles
print("shells", len(fin.faces), len(deb1.faces), len(deb2.faces), len(sh))
write_bin(f"{OUT}/shells.stl", "finger with debris", sh)

# 8. шумный скан сферы
sp = trimesh.creation.icosphere(subdivisions=4, radius=10)
sp.vertices += sp.vertex_normals * rng.normal(0, 0.25, (len(sp.vertices), 1))
sp.apply_translation([50, 50, 10.5]); sp.vertices = np.round(sp.vertices, 4)
print("scan", len(sp.faces), sp.volume)
write_bin(f"{OUT}/scan_sphere.stl", "noisy scan of a sphere", tris_of(sp))

# 9. итоговое задание: две «сырые» модели
def defects(m, fan_at=None, tri_at=None, flip_at=None, flip_r=1.6):
    c = m.triangles_center
    drop, flip = set(), set()
    if fan_at is not None:
        vid = int(np.argmin(np.linalg.norm(m.vertices - fan_at, axis=1)))
        drop |= set(np.where((m.faces == vid).any(axis=1))[0])
    if tri_at is not None:
        drop.add(int(np.argmin(np.linalg.norm(c - tri_at, axis=1))))
    if flip_at is not None:
        flip = set(np.where(np.linalg.norm(c - flip_at, axis=1) < flip_r)[0]) - drop
    out = []
    for k, f in enumerate(m.faces):
        if k in drop:
            continue
        t = tuple(m.vertices[i] for i in f)
        out.append((t[0], t[2], t[1]) if k in flip else t)
    print("   drop", len(drop), "flip", len(flip))
    return out

a = bone(L=46.0, nt=26, nth=24, x0=40.0, y0=40.0)
ta = defects(a, fan_at=[45.0, 40.0, 23.0], flip_at=[40.0, 35.0, 30.0], flip_r=1.8)
d = trimesh.creation.icosphere(subdivisions=1, radius=0.8); d.apply_translation([52, 40, 5])
ta += tris_of(d)
write_bin(f"{OUT}/bone_a.stl", "bone_a raw scan", ta)

b = bone(L=38.0, nt=22, nth=20, x0=0.0, y0=0.0)
tb = defects(b, tri_at=[4.0, 1.0, 12.0], flip_at=[-4.0, 0.0, 20.0], flip_r=1.3)
box = trimesh.creation.box(extents=[1.2, 1.2, 1.2]); box.apply_translation([0, 0, 19])
tb += tris_of(box)
tb += [((2.0, 8.0, 3.0), (3.0, 8.0, 3.0), (4.0, 8.0, 3.0))]
tb = [tuple(tuple(np.array(p) / 25.4 + np.array([2.0, 2.0, 0.0])) for p in t) for t in tb]
write_bin(f"{OUT}/bone_b.stl", "bone_b exported", tb)


# встроенные модели для просмотрщика сеток (страницы, открытые с диска)
keys = ["finger", "holed", "flipped", "two_cubes", "shells", "ring", "bone_a", "bone_b"]
files = {k: base64.b64encode(open(f"{OUT}/{k}.stl", "rb").read()).decode() for k in keys}
js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "js", "mesh-files.js")
with open(js, "w") as f:
    f.write("/* mesh-files.js — модели занятия 2 (assets/files/*.stl) в base64, чтобы просмотрщик сеток\n"
            "   работал и при открытии страниц с диска. Создается программой tools/make_models.py. */\n")
    f.write("window.MV_FILES = " + json.dumps(files) + ";\n")
print("mesh-files.js обновлен")
