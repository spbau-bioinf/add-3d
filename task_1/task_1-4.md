---
work: 1
code: "task 1-4"
title: "Генератор слоёв на Python: контур и заполнение"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Слайсер — это программа, которая для каждого слоя повторяет одно и то же: обводит контур, заполняет область внутри и поднимается на следующий слой. Для квадрата такую программу можно написать самостоятельно — примерно в 60 строк на Python. Она выдаёт настоящий G-код, который открывается в любом просмотрщике.

Большинство экструзионных систем строит слой по схеме «периметр + растр». Периметр — непрерывные контуры: они дают аккуратную поверхность с малой шероховатостью. Растр — близко расположенные параллельные линии внутри: они заполняют область, а вычисляются дёшево. Та же схема в порошковых технологиях называется «оболочка + сердцевина».

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- читать и запускать программу, которая генерирует G-код;
- связывать правила построения слоя с конкретными строками программы;
- управлять плотностью заполнения и положением шва через параметры и код;
- изменять генератор и проверять результат по статистике просмотрщика.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Задания этой страницы рассчитаны примерно на 20 минут и выполняются в аудитории. Теоретическую часть используйте как справочник: к нужному разделу ведут ссылки в условиях заданий.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Правила, которые реализует генератор
{: .subsection__title}

<ol aria-label="Порядок построения слоя" class="flow">
<li class="flow__step"><span class="flow__title">Подъём</span><span class="flow__text">на высоту слоя Z = H · (k + 1)</span></li>
<li class="flow__step"><span class="flow__title">Контур</span><span class="flow__text">первым и медленнее; старт смещается от слоя к слою</span></li>
<li class="flow__step"><span class="flow__title">Заполнение</span><span class="flow__text">зигзаг внутри контура, 0° и 90° через слой</span></li>
<li class="flow__step"><span class="flow__title">Следующий слой</span><span class="flow__text">повторить для k + 1</span></li>
</ol>

<figure class="diagram">
<svg role="img" viewBox="0 0 640 310">
<title>Два соседних слоя: в слое k контур и горизонтальные линии заполнения, в слое k+1 контур и вертикальные линии; кольцо старта контура в разных углах.</title>
<text class="d-text" x="150" y="22" text-anchor="middle">слой k: заполнение 0°</text>
<text class="d-text" x="490" y="22" text-anchor="middle">слой k + 1: заполнение 90°</text>
<rect class="d-road" x="50" y="40" width="200" height="200" stroke-width="9"></rect>
<g class="d-road d-road--fill" stroke-width="9">
<line x1="66" y1="64" x2="234" y2="64"></line><line x1="66" y1="100" x2="234" y2="100"></line>
<line x1="66" y1="136" x2="234" y2="136"></line><line x1="66" y1="172" x2="234" y2="172"></line>
<line x1="66" y1="208" x2="234" y2="208"></line>
</g>
<path class="d-travel" d="M234,64 V100 M66,100 V136 M234,136 V172 M66,172 V208"></path>
<circle class="d-seam" cx="50" cy="240" r="10"></circle>
<rect class="d-road" x="390" y="40" width="200" height="200" stroke-width="9"></rect>
<g class="d-road d-road--fill" stroke-width="9">
<line x1="414" y1="56" x2="414" y2="224"></line><line x1="450" y1="56" x2="450" y2="224"></line>
<line x1="486" y1="56" x2="486" y2="224"></line><line x1="522" y1="56" x2="522" y2="224"></line>
<line x1="558" y1="56" x2="558" y2="224"></line>
</g>
<path class="d-travel" d="M414,224 H450 M450,56 H486 M486,224 H522 M522,56 H558"></path>
<circle class="d-seam" cx="590" cy="240" r="10"></circle>
<text class="d-text d-text--small" x="150" y="272" text-anchor="middle">кольцо — старт контура</text>
<text class="d-text d-text--small" x="490" y="272" text-anchor="middle">старт переехал в другой угол</text>
<text class="d-text d-text--small" x="320" y="298" text-anchor="middle">тёмный — контур (печатается первым), светлый — заполнение, пунктир — холостой ход</text>
</svg>
<figcaption class="diagram__caption">Собственная схема по Gibson et al., 2021, Fig. 6.2 (p. 177), п. 6.3 (p. 180–181), п. 17.3.2 и Fig. 17.7, 17.9 (p. 502–503); Leary, 2020, Fig. 3.31 (p. 75).</figcaption>
</figure>

- **Контур первым и медленнее.** На поворотах головка замедляется и снова разгоняется, и поток материала трудно удержать постоянным. Поэтому контур, от которого зависит точность детали, печатают на меньшей скорости, а заполнение — быстрее: наружные размеры оно уже не испортит.
- **Направление заполнения меняется.** Если линии всех слоёв лежат точно друг над другом, деталь слабеет вдоль них. Лучше, чтобы линии соседних слоёв перекрещивались, как нити в ткани композита. Некоторые системы так и делают: растр по X в одном слое и по Y в следующем.
- **Плотность заполнения.** Детали обычно печатают не сплошными, чтобы сэкономить материал и время. Типичное значение — 20 %; для примерочных моделей можно снизить до 10 %, для прочных деталей — поднять до 80 %.

<div class="definition" markdown="1">

<span class="definition__term">Шаг заполнения</span> — расстояние между соседними линиями растра. Если все линии слоя идут в одну сторону, доля материала в слое примерно равна *W* / шаг. Поэтому генератор вычисляет шаг как *W* / плотность: при *W* = 0,4 мм и плотности 20 % шаг равен 2 мм.

</div>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Разбор генератора
{: .subsection__title}

Скачайте файл и сохраните его в рабочую папку — задания этой страницы импортируют из него функции.

- [gen.py](../assets/files/gen.py){: .files__link}
{: .files}

<article class="example" markdown="1">

### Пример 1. Генератор квадратной детали
{: .example__title}

Файл `gen.py`:

```python
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
```

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `e_for(L)` — формула подачи из [task 1-2](task_1-2.html) с учебными параметрами *W* = 0,4 мм, *H* = 0,2 мм, *d* = 1,75 мм.
- Класс `GWriter` копит строки G-кода и помнит, где сейчас сопло. Метод `travel()` пишет холостой ход `G0`, метод `extrude()` сам вычисляет длину отрезка и подачу и пишет рабочий ход `G1`.
- В начале файла стоит `M83`: подача относительная, поэтому у отрезков одной длины одинаковое `E` ([task 1-1](task_1-1.html), раздел 3).
- Контур идёт по осевой линии дорожки — на *W* / 2 внутрь от края квадрата ([task 1-3](task_1-3.html)). Строка `loop = loop[k % 4:] + loop[:k % 4]` поворачивает список углов: на каждом слое обход начинается со следующего угла.
- Заполнение лежит внутри контура, линии распределены по центру области. `along_x` чередует направление растра, а условие `i % 2 == 0` — направление соседних линий: получается зигзаг. Между линиями — короткие холостые переезды.
- При `outline=False` контур не печатается, и заполнение занимает всю область. Этот режим понадобится для скаффолда в [task 1-5](task_1-5.html).

</div>

</article>

```text
gcode_work/
├── gen.py
├── @@square.gcode@@
└── @@scaffold.gcode@@
```
{: .folder-tree}

Запустите `gen.py`: в рабочей папке появятся два файла. Откройте `square.gcode` в просмотрщике ниже или нажмите кнопку «Квадрат (task 1-4)» — это тот же файл, построенный той же программой, переписанной на JavaScript. Должно получиться: «Слоёв» — 10, «Нить E, мм» — 89,93, «Путь печати, м» — 2,70, «Холостые, м» — 0,62.

<article class="task" id="task-1" markdown="1">

### Задание 1. Плотность заполнения <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_1-4\_1.py</span>
{: .task__meta}

Импортируйте `square_part` из `gen.py` и сохраните три файла: `square_10.gcode`, `square_20.gcode` и `square_80.gcode` — с плотностью заполнения 10, 20 и 80 %.

Откройте каждый файл в просмотрщике. В конце программы запишите комментариями таблицу: плотность, длина нити, путь печати, холостые. Ответьте комментарием: во сколько раз больше нити расходует деталь с плотностью 80 %, чем с плотностью 20 %, и почему не в 4 раза.

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Шов на месте <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_1-4\_2.py</span>
{: .task__meta}

Скопируйте `gen.py` в новый файл и измените его так, чтобы контур в каждом слое начинался в одном и том же углу. Программа должна сохранять результат в `square_seam.gcode`.

В просмотрщике включите изометрию и найдите шов: кольца «начало слоя» всех слоёв должны оказаться друг над другом. «Холостые, м» — 0,49. Ответьте комментарием: почему путь холостых ходов уменьшился, а шов при этом стал хуже.

</article>

</section>

<!-- ===================== 3 ===================== -->

<section class="subsection" id="s3" markdown="1">

## <span class="subsection__num">3.</span> Просмотрщик
{: .subsection__title}

Кнопка «Открыть файл…» загружает файл, созданный вашей программой. Ползунок «Слой» переключает слои, «Изометрия» показывает деталь целиком.

{% include gcode-viewer.html presets="square,two" default="square" %}

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: непрерывный зигзаг <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_1-4\_zigzag.py</span>
{: .task__meta}

**Ситуация.** В генераторе между линиями заполнения стоят холостые переезды. Каждый разрыв траектории внутри слоя — возможное слабое место, поэтому число отдельных путей в слое стараются уменьшить, а заполнение печатать непрерывным зигзагом.

**Требования:**

1. Скопируйте `gen.py` в новый файл и измените заполнение: к первой линии слоя сопло переезжает холостым ходом, а каждая следующая линия соединяется с предыдущей рабочим ходом вдоль края области заполнения.
1. Подача на соединительные отрезки считается той же функцией `e_for`; контур, шов и чередование 0°/90° остаются как в `gen.py`.
1. Программа сохраняет результат в `square_zigzag.gcode` с параметрами по умолчанию.
1. В конце файла ответьте комментарием: почему холостые ходы сократились не до нуля.

В просмотрщике: «Слоёв» — 10, «Нить E, мм» — 95,92, «Путь печати, м» — 2,88, «Холостые, м» — 0,44, «E на 1 мм пути» — 0,03326, предупреждений нет.

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. Внутри папки `pipeline_1` создайте папку `task_1_4`.
1. Переместите в неё `gen.py` и все программы этой страницы: <span class="task__file">task\_1-4\_1.py</span>, <span class="task__file">task\_1-4\_2.py</span> и <span class="task__file">task\_1-4\_zigzag.py</span>. Файлы `.gcode` переносить не нужно: программы создают их заново.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_1/
    ├── task_1_1/
    ├── task_1_2/
    ├── task_1_3/
    └── @@task_1_4/@@
        ├── gen.py
        ├── task_1-4_1.py
        ├── task_1-4_2.py
        └── task_1-4_zigzag.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — п. 6.2.5 и Fig. 6.2 (p. 176–177), п. 6.3 (p. 180–182), п. 17.3.1–17.3.2 и Fig. 17.7, 17.9 (p. 498–503).
1. Leary M. Design for Additive Manufacturing. Elsevier, 2020 — п. 3.3.6, Fig. 3.31 (p. 74–76).
1. Redwood B., Schöffer F., Garret B. The 3D Printing Handbook. 3D Hubs, 2017 — п. 2.2.5 (заполнение).
1. <span class="tag tag--ext">вне источников</span> Prusa Knowledge Base. PLA — температуры в начале файла: [help.prusa3d.com/article/pla\_2062](https://help.prusa3d.com/article/pla_2062).
{: .sources__list}

</section>
