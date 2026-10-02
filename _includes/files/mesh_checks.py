"""Готовые функции из примеров task 2-3, task 2-4 и task 2-5 для окон Python на сайте.

Свой файл mesh_checks.py вы собираете сами в рабочей папке mesh_work: в нем
будут и эти функции, и функции из заданий. Этот файл скачивать не нужно.
"""


def edge_faces(faces):
    """Словарь: ребро -> сколько граней к нему примыкает."""
    count = {}
    for a, b, c in faces:
        for u, v in ((a, b), (b, c), (c, a)):
            e = (min(u, v), max(u, v))
            count[e] = count.get(e, 0) + 1
    return count


def signed_volume(verts, faces):
    """Объем со знаком: сумма объемов тетраэдров (начало координат, грань)."""
    vol = 0.0
    for i, j, k in faces:
        a, b, c = verts[i], verts[j], verts[k]
        vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
                - a[1] * (b[0] * c[2] - b[2] * c[0])
                + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    return vol


def shells(n_verts, faces):
    """Разбивает грани на связные группы (оболочки); возвращает списки номеров граней."""
    parent = list(range(n_verts))          # сначала каждая вершина сама себе группа

    def root(x):
        while parent[x] != x:
            x = parent[x]
        return x

    for a, b, c in faces:                  # вершины одной грани в одной группе
        for u in (b, c):
            parent[root(u)] = root(a)
    groups = {}
    for i, f in enumerate(faces):
        groups.setdefault(root(f[0]), []).append(i)
    return list(groups.values())
