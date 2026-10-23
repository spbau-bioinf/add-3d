"""Модуль курса: функции из примеров task 3-1.

Скачайте его в рабочую папку рядом с программами заданий и не меняйте.
Функции, которые просят написать в заданиях, пишутся в самих файлах заданий.
"""
import math

from stl_io import read_stl


def normal_area(tri):
    """Единичная нормаль грани (по порядку вершин, правило правой руки) и ее площадь."""
    a, b, c = tri
    u = [b[i] - a[i] for i in range(3)]
    v = [c[i] - a[i] for i in range(3)]
    n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    length = math.sqrt(sum(x * x for x in n))
    if length == 0:                                  # вырожденная грань
        return (0.0, 0.0, 0.0), 0.0
    return tuple(x / length for x in n), length / 2


# какая ось модели смотрит вверх -> новые координаты (x, y, z) точки p
TURNS = {"+Z": lambda p: (p[0], p[1], p[2]),
         "-Z": lambda p: (p[0], -p[1], -p[2]),
         "+X": lambda p: (-p[2], p[1], p[0]),
         "-X": lambda p: (p[2], p[1], -p[0]),
         "+Y": lambda p: (p[0], -p[2], p[1]),
         "-Y": lambda p: (p[0], p[2], -p[1])}


def orient(tris, up="+Z"):
    """Поворачивает модель так, чтобы ось up смотрела вверх, и ставит ее на стол (min z = 0)."""
    turn = TURNS[up]
    tris = [tuple(turn(p) for p in t) for t in tris]
    z0 = min(p[2] for t in tris for p in t)
    return [tuple((p[0], p[1], p[2] - z0) for p in t) for t in tris]


if __name__ == "__main__":
    tris = read_stl("ramp.stl")
    n, s = normal_area(tris[4])
    print("Наклонная грань ramp.stl: нормаль", tuple(round(x, 4) + 0.0 for x in n), "площадь", round(s, 2))
    for up in TURNS:
        h = max(p[2] for t in orient(tris, up) for p in t)
        print(f"{up}: высота {h:.2f} мм")
