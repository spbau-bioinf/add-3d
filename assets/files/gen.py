import math
D_FIL, W, H = 1.75, 0.4, 0.2          # мм: нить, ширина и высота дорожки
A_FIL = math.pi * (D_FIL / 2) ** 2    # площадь сечения нити, мм²

def e_for(L):                         # баланс объёма: Gibson et al., ур. 6.1–6.3
    return L * W * H / A_FIL

class GWriter:
    def __init__(self):
        self.out, self.x, self.y = [], 0.0, 0.0
    def cmd(self, s):
        self.out.append(s)
    def travel(self, x, y, f=6000):
        self.cmd(f"G0 X{x:.3f} Y{y:.3f} F{f}")
        self.x, self.y = x, y
    def extrude(self, x, y, f):
        L = math.hypot(x - self.x, y - self.y)
        self.cmd(f"G1 X{x:.3f} Y{y:.3f} E{e_for(L):.5f} F{f}")
        self.x, self.y = x, y

def square_part(x0=90, y0=90, size=20, n_layers=10, infill=0.2,
                outline=True, f_out=1200, f_inf=1800):
    g = GWriter()
    g.cmd("M140 S60\nM104 S215\nM190 S60\nM109 S215")  # PLA: Prusa KB [вне источников]
    g.cmd("G21\nG90\nM83\nG28")                         # мм, абсолютные XYZ, относительный E
    sp = W / infill                                     # шаг линий заполнения
    for k in range(n_layers):
        g.cmd(f"; LAYER {k}\nG0 Z{H * (k + 1):.3f} F3000")
        if outline:                                     # 1) контур, медленно
            a, b = x0 + W / 2, x0 + size - W / 2
            c, d = y0 + W / 2, y0 + size - W / 2
            loop = [(a, c), (b, c), (b, d), (a, d)]
            loop = loop[k % 4:] + loop[:k % 4]          # шов смещается каждый слой
            g.travel(*loop[0])
            for p in loop[1:] + loop[:1]:
                g.extrude(*p, f=f_out)
        m = W if outline else 0.0                       # 2) заполнение внутри контура
        lo_x, hi_x = x0 + m, x0 + size - m
        lo_y, hi_y = y0 + m, y0 + size - m
        along_x = (k % 2 == 0)                          # 0° и 90° через слой
        lo, hi = (lo_y, hi_y) if along_x else (lo_x, hi_x)
        span = hi - lo - W                              # где могут лежать оси дорожек
        n = int(span / sp + 1e-9) + 1
        first = lo + W / 2 + (span - (n - 1) * sp) / 2  # линии по центру области
        for i in range(n):
            t = first + i * sp
            if along_x:
                s, e = (lo_x, hi_x) if i % 2 == 0 else (hi_x, lo_x)
                g.travel(s, t)
                g.extrude(e, t, f=f_inf)
            else:
                s, e = (lo_y, hi_y) if i % 2 == 0 else (hi_y, lo_y)
                g.travel(t, s)
                g.extrude(t, e, f=f_inf)
    g.cmd("M104 S0\nM140 S0\nM84")
    return "\n".join(g.out)

if __name__ == "__main__":
    open("square.gcode", "w").write(square_part())
    open("scaffold.gcode", "w").write(
        square_part(x0=95, y0=95, size=10, n_layers=20, infill=W / 1.2, outline=False))
