import os
import struct


def read_stl(path):
    """Читает STL (двоичный или ASCII) и возвращает список граней.

    Грань: кортеж из трех вершин, вершина: кортеж (x, y, z).
    """
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        data = f.read()
    if size >= 84:
        n = struct.unpack("<I", data[80:84])[0]
        if size == 84 + 50 * n:                      # двоичный: 84 + 50·F байт
            tris = []
            for k in range(n):
                vals = struct.unpack("<12f", data[84 + 50 * k: 84 + 50 * k + 48])
                tris.append((vals[3:6], vals[6:9], vals[9:12]))   # нормаль vals[0:3] пропускаем
            return tris
    tris, loop = [], []                              # иначе текстовый (ASCII)
    for line in data.decode("ascii", errors="ignore").splitlines():   # имя после solid может быть не латиницей
        words = line.split()
        if words and words[0] == "vertex":
            loop.append(tuple(float(w) for w in words[1:4]))
            if len(loop) == 3:
                tris.append(tuple(loop))
                loop = []
    return tris


def write_stl(path, tris):
    """Записывает грани в двоичный STL; нормаль считается по порядку вершин."""
    with open(path, "wb") as f:
        f.write(b"binary STL".ljust(80, b" "))
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            u = [b[i] - a[i] for i in range(3)]
            v = [c[i] - a[i] for i in range(3)]
            n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
            length = sum(x * x for x in n) ** 0.5 or 1.0
            f.write(struct.pack("<12fH", *[x / length for x in n], *a, *b, *c, 0))


if __name__ == "__main__":
    tris = read_stl("pyramid.stl")
    print("Граней:", len(tris))
    print("Первая грань:", tris[0])
