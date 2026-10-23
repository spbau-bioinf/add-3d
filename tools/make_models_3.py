"""Модели практики 3: ramp.stl и bone_a_fixed.stl в assets/files.

Запуск из корня репозитория: python tools/make_models_3.py
Только стандартная библиотека и модули курса. ramp.stl — клин с наклонной гранью
под 30° к горизонтали. bone_a_fixed.stl — bone_a.stl после ремонта теми же шагами,
что эталон общего итогового задания task 2-7 (вырожденные грани, крупнейшая оболочка,
согласование ориентации, заплаты на дыры). После смены моделей пересчитайте эталоны
и обновите копии для окон Python: python tools/sync_pyfiles.py --fix
"""
import math
import os
import sys

FILES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "files")
sys.path.insert(0, FILES)
from stl_io import read_stl, write_stl            # noqa: E402
from mesh_index import index_mesh                  # noqa: E402
from mesh_checks import edge_faces, signed_volume, shells   # noqa: E402

# 1. клин: задняя стенка 10 мм, наклон 30°, ширина 10 мм
L = round(10 * math.sqrt(3), 4)                    # 17.3205 мм: tg 30° = 10 / L
a0, b0, c0 = (0, 0, 0), (L, 0, 0), (0, 0, 10)
a1, b1, c1 = (0, 10, 0), (L, 10, 0), (0, 10, 10)
ramp = [(a0, b1, b0), (a0, a1, b1),               # низ, нормаль -Z
        (a0, c0, c1), (a0, c1, a1),               # задняя стенка, -X
        (b0, b1, c1), (b0, c1, c0),               # наклонная грань
        (a0, b0, c0), (a1, c1, b1)]               # боковые стенки, -Y и +Y
write_stl(os.path.join(FILES, "ramp.stl"), ramp)


# 2. ремонт bone_a.stl — шаги эталона task 2-7
def face_area(a, b, c):
    u = [b[i] - a[i] for i in range(3)]
    v = [c[i] - a[i] for i in range(3)]
    n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    return math.sqrt(sum(x * x for x in n)) / 2


def fix_orientation(verts, faces):
    faces = [tuple(f) for f in faces]
    by_edge = {}
    for i, (a, b, c) in enumerate(faces):
        for u, v in ((a, b), (b, c), (c, a)):
            by_edge.setdefault((min(u, v), max(u, v)), []).append(i)
    done, queue = {0}, [0]
    while queue:
        i = queue.pop(0)
        a, b, c = faces[i]
        for u, v in ((a, b), (b, c), (c, a)):
            for j in by_edge[(min(u, v), max(u, v))]:
                if j in done:
                    continue
                x, y, z = faces[j]
                if (u, v) in ((x, y), (y, z), (z, x)):
                    faces[j] = (x, z, y)
                done.add(j)
                queue.append(j)
    if signed_volume(verts, faces) < 0:
        faces = [(a, c, b) for a, b, c in faces]
    return faces


def patch_holes(verts, faces):
    count = edge_faces(faces)
    nxt = {}
    for a, b, c in faces:
        for u, v in ((a, b), (b, c), (c, a)):
            if count[(min(u, v), max(u, v))] == 1:
                nxt[v] = u
    verts, faces, done = list(verts), list(faces), set()
    for start in list(nxt):
        if start in done:
            continue
        loop, cur = [], start
        while cur not in done:
            done.add(cur); loop.append(cur); cur = nxt[cur]
        verts.append(tuple(sum(verts[i][k] for i in loop) / len(loop) for k in range(3)))
        c = len(verts) - 1
        faces += [(loop[j], loop[(j + 1) % len(loop)], c) for j in range(len(loop))]
    return verts, faces


verts, faces = index_mesh(read_stl(os.path.join(FILES, "bone_a.stl")))
faces = [f for f in faces if face_area(*(verts[i] for i in f)) >= 1e-6]
faces = [faces[i] for i in max(shells(len(verts), faces), key=len)]
faces = fix_orientation(verts, faces)
verts, faces = patch_holes(verts, faces)
write_stl(os.path.join(FILES, "bone_a_fixed.stl"), [tuple(verts[i] for i in f) for f in faces])

if __name__ == "__main__":
    v2, f2 = index_mesh(read_stl(os.path.join(FILES, "bone_a_fixed.stl")))
    bad = sum(1 for k in edge_faces(f2).values() if k != 2)
    print(f"ramp.stl: граней {len(ramp)}")
    print(f"bone_a_fixed.stl: граней {len(f2)}, ребер не с двумя гранями {bad}, "
          f"объем {signed_volume(v2, f2):.1f} мм³")
    assert bad == 0 and len(f2) == 1200
