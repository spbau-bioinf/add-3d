import math

def gcode_stats(path, d_fil=1.75, rho=1.24):    # rho — плотность PLA, г/см³ [вне источников]
    rel_xyz, rel_e = False, False
    x = y = z = e = 0.0
    e_sum = ext_len = trav_len = 0.0
    zs = set()
    for raw in open(path, encoding="utf-8", errors="ignore"):
        s = raw.split(";", 1)[0].strip()        # отрезаем комментарий
        if not s:
            continue
        words = s.split()
        cmd, a = words[0].upper(), {}
        for w in words[1:]:
            try:
                a[w[0].upper()] = float(w[1:])
            except ValueError:
                pass
        if cmd == "G90":   rel_xyz, rel_e = False, False
        elif cmd == "G91": rel_xyz, rel_e = True, True   # Marlin: G91 касается и E
        elif cmd == "M82": rel_e = False
        elif cmd == "M83": rel_e = True
        elif cmd == "G92":
            x, y, z, e = a.get("X", x), a.get("Y", y), a.get("Z", z), a.get("E", e)
        elif cmd == "G28":
            x = y = z = 0.0
        elif cmd in ("G0", "G1"):
            if rel_xyz:
                nx, ny, nz = x + a.get("X", 0), y + a.get("Y", 0), z + a.get("Z", 0)
            else:
                nx, ny, nz = a.get("X", x), a.get("Y", y), a.get("Z", z)
            de = 0.0
            if "E" in a:
                de = a["E"] if rel_e else a["E"] - e
                e = e + a["E"] if rel_e else a["E"]
            L = math.hypot(nx - x, ny - y)
            if de > 0 and L > 0:
                e_sum += de; ext_len += L; zs.add(round(nz, 3))
            elif L > 0:
                trav_len += L
            x, y, z = nx, ny, nz
    mass = e_sum * math.pi * (d_fil / 2) ** 2 / 1000 * rho   # мм³ → см³ → г
    return {"слоёв": len(zs), "нить, мм": round(e_sum, 1), "масса, г": round(mass, 2),
            "путь печати, м": round(ext_len / 1000, 2), "холостые, м": round(trav_len / 1000, 2)}

if __name__ == "__main__":
    import sys
    for p in sys.argv[1:]:
        print(p, gcode_stats(p))
