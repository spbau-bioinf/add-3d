from stl_io import read_stl


def index_mesh(tris, digits=4):
    """Превращает «треугольный суп» в индексированную сетку.

    Вершины с одинаковыми (после округления) координатами сливаются в одну.
    Возвращает список вершин и список граней-троек индексов.
    Округление до 4 знаков подобрано для моделей занятия. Это учебный прием,
    а не универсальный способ сравнивать вершины: в чужой модели он может
    слить разные близкие вершины или не слить совпадающие.
    """
    verts, faces, where = [], [], {}
    for tri in tris:
        face = []
        for p in tri:
            key = tuple(round(c, digits) for c in p)
            if key not in where:
                where[key] = len(verts)
                verts.append(key)
            face.append(where[key])
        faces.append(tuple(face))
    return verts, faces


def edges_of(faces):
    """Множество ребер: пара индексов, меньший первым."""
    edges = set()
    for a, b, c in faces:
        for u, v in ((a, b), (b, c), (c, a)):
            edges.add((min(u, v), max(u, v)))
    return edges


if __name__ == "__main__":
    verts, faces = index_mesh(read_stl("pyramid.stl"))
    V, E, F = len(verts), len(edges_of(faces)), len(faces)
    print(f"V = {V}, E = {E}, F = {F}")
    print(f"V - E + F = {V - E + F}")
