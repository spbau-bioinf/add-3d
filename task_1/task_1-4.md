---
work: 1
code: "task 1-4"
title: "Генератор слоев на Python: контур и заполнение"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Слайсер — это программа, которая для каждого слоя повторяет одно и то же: обводит контур, заполняет область внутри и поднимается на следующий слой. Для квадрата такую программу можно написать самостоятельно — примерно в 60 строк на Python. Она записывает G-код, который открывается в любом просмотрщике.

Большинство экструзионных систем строит слой по схеме «периметр + растр». Периметр — непрерывные контуры: они дают аккуратную поверхность с малой шероховатостью. Растр — близко расположенные параллельные линии внутри: они заполняют область, а требуют мало вычислений. Та же схема в порошковых технологиях называется «оболочка + сердцевина».

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

Страница выполняется на второй практике по данной теме: задания 1 и 2 занимают около 20 минут, итоговое задание — около 20 минут. Теоретическую часть используйте как справочник: к нужному разделу ведут ссылки в условиях заданий.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Правила, которые реализует генератор
{: .subsection__title}

<ol aria-label="Порядок построения слоя" class="flow">
<li class="flow__step"><span class="flow__title">Подъем</span><span class="flow__text">на высоту слоя Z = H · (k + 1)</span></li>
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
<text class="d-text d-text--small" x="320" y="298" text-anchor="middle">темный — контур (печатается первым), светлый — заполнение, пунктир — холостой ход</text>
</svg>
<figcaption class="diagram__caption">Адаптировано по Gibson et al., 2021, Fig. 6.2 (p. 177), п. 6.3 (p. 180–181), п. 17.3.2 и Fig. 17.7, 17.9 (p. 502–503); Leary, 2020, Fig. 3.31 (p. 75).</figcaption>
</figure>

{% include anim-zigzag.html %}

- **Контур первым и медленнее.** На поворотах головка замедляется и снова разгоняется, и поток материала трудно удержать постоянным. Поэтому контур, от которого зависит точность детали, печатают на меньшей скорости, а заполнение — быстрее: наружные размеры оно уже не испортит.
- **Направление заполнения меняется.** Если линии всех слоев лежат точно друг над другом, деталь слабеет вдоль них. Лучше, чтобы линии соседних слоев перекрещивались, как нити в ткани композита. Некоторые системы так и делают: растр по X в одном слое и по Y в следующем.
- **Плотность заполнения.** Детали обычно печатают не сплошными, чтобы сэкономить материал и время. Типичное значение — 20 %; для моделей, которыми проверяют форму, можно снизить до 10 %, для прочных деталей — поднять до 80 %.

<div class="definition" markdown="1">

<span class="definition__term">Шаг заполнения</span> — расстояние между соседними линиями растра. Если все линии слоя идут в одну сторону, доля материала в слое примерно равна *W* / шаг. Поэтому генератор вычисляет шаг по плотности заполнения:

</div>

<div class="formula"><i>s</i><sub>з</sub> = <i>W</i> / <i>ρ</i></div>
<dl class="where">
<div><dt>где <i>s</i><sub>з</sub></dt><dd>шаг заполнения, мм: расстояние между осями соседних линий растра (в <code>gen.py</code> переменная <code>sp</code>)</dd></div>
<div><dt><i>W</i></dt><dd>ширина дорожки, мм (<a href="task_1-2.html">task 1-2</a>, раздел 1)</dd></div>
<div><dt><i>ρ</i></dt><dd>плотность заполнения, доля от 0 до 1 (в <code>gen.py</code> параметр <code>infill</code>): при <i>W</i> = 0,4 мм и <i>ρ</i> = 0,2 шаг равен 2 мм</dd></div>
</dl>

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

{% capture code %}
import math
D_FIL, W, H = 1.75, 0.4, 0.2          # мм: нить, ширина и высота дорожки
A_FIL = math.pi * (D_FIL / 2) ** 2    # площадь сечения нити, мм²

def e_for(L):                         # баланс объема: Gibson et al., ур. 6.1–6.3
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
    g.cmd("M140 S60\nM104 S215\nM190 S60\nM109 S215")  # температуры PLA: Prusa Knowledge Base
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
{% endcapture %}{% include pyrun.html file="gen.py" code=code note="Запуск записывает square.gcode и scaffold.gcode и ничего не печатает: файлы появятся в списке под окном вывода." %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `e_for(L)` — формула подачи из [task 1-2](task_1-2.html) с учебными параметрами *W* = 0,4 мм, *H* = 0,2 мм, *d* = 1,75 мм.
- Класс `GWriter` накапливает строки G-кода и хранит текущее положение сопла. Метод `travel()` пишет холостой ход `G0`, метод `extrude()` сам вычисляет длину отрезка и подачу и пишет рабочий ход `G1`.
- В начале файла стоит `M83`: подача относительная, поэтому у отрезков одной длины одинаковое `E` ([task 1-1](task_1-1.html), раздел 3).
- Контур идет по осевой линии дорожки — на *W* / 2 внутрь от края квадрата ([task 1-3](task_1-3.html)). Строка `loop = loop[k % 4:] + loop[:k % 4]` поворачивает список углов: на каждом слое обход начинается со следующего угла.
- Заполнение лежит внутри контура, линии распределены по центру области. Концы линий стоят на краю области, например `lo_x = x0 + W`, а это внутренний край дорожки контура. Поэтому конец дорожки заполнения заходит на контур на *W* / 2 и надежнее сваривается с ним; если бы конец стоял на *W* / 2 дальше, дорожки только касались бы. В слайсерах для этого есть отдельная настройка: в PrusaSlicer она называется «Infill/perimeters overlap» и по умолчанию равна 25 % ширины периметра. `along_x` чередует направление растра, а условие `i % 2 == 0` — направление соседних линий: получается зигзаг. Между линиями — короткие холостые переезды.
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

Запустите `gen.py`: в рабочей папке появятся два файла. Откройте `square.gcode` в просмотрщике ниже или нажмите кнопку «Квадрат (task 1-4)» — это тот же файл, построенный той же программой, переписанной на JavaScript. Должно получиться: «Слоев» — 10, «Нить E, мм» — 89,93, «Путь печати, м» — 2,70, «Холостые, м» — 0,62.

<article class="task" id="task-1" markdown="1">

### Задание 1. Плотность заполнения <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_1-4\_1.py</span>
{: .task__meta}

Импортируйте `square_part` из `gen.py` и сохраните три файла: `square_10.gcode`, `square_20.gcode` и `square_80.gcode` — с плотностью заполнения 10, 20 и 80 %.

Откройте каждый файл в просмотрщике и запишите его статистику в конец программы по шаблону (ячейки заполните своими числами):

```python
# плотность | нить, мм | путь печати, м | холостые, м
#    10 %   |          |                |
#    20 %   |          |                |
#    80 %   |          |                |
```
{: data-label="Шаблон таблицы для комментария"}

Пока таблица заполняется по просмотрщику; на [task 1-6](task_1-6.html) те же числа будет выводить программа `stats.py`, и такую таблицу можно будет печатать кодом. Затем ответьте на вопросы мини-теста и добавьте его комментарий под таблицей:

1. во сколько раз больше нити расходует деталь с плотностью 80 %, чем с плотностью 20 %;
1. почему не в 4 раза.

{% capture code %}
from gen import square_part

# сохраните square_10.gcode, square_20.gcode и square_80.gcode
# в цикле по списку плотностей; имя файла соберите f-строкой
{% endcapture %}{% include pyrun.html file="task_1-4_1.py" code=code %}

<div class="quiz" data-file="task_1-4_1.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">Сначала заполните таблицу, затем ответьте и вставьте комментарий под ней.</p>
<div class="quiz__q">
<p>1. Во сколько раз больше нити расходует деталь с плотностью 80 %, чем с плотностью 20 %?</p>
<label><input type="radio" data-ok> Примерно в 3 раза: 268,74 / 89,93 ≈ 2,99.</label>
<label><input type="radio"> Ровно в 4 раза: 80 / 20 = 4.</label>
<label><input type="radio"> Примерно в 2 раза: удваивается только заполнение.</label>
<p class="quiz__exp" hidden>Отношение берется из статистики просмотрщика, а не из отношения плотностей.</p>
</div>
<div class="quiz__q">
<p>2. Почему не в 4 раза?</p>
<label><input type="radio" data-ok> Контур в каждом слое одинаков и от плотности не зависит, а линий заполнения целое число: 10 при шаге 2 мм и 38 при шаге 0,5 мм, то есть в 3,8 раза больше.</label>
<label><input type="radio"> Просмотрщик не учитывает заполнение первого и последнего слоев.</label>
<label><input type="radio"> При плотности 80 % генератор уменьшает ширину дорожки.</label>
<p class="quiz__exp" hidden>Нить на контур постоянна (4 · 19,6 мм пути в каждом слое), меняется только заполнение, и число его линий округляется до целого.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Шов на месте <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_1-4\_2.py</span>
{: .task__meta}

Скопируйте `gen.py` в новый файл и измените его так, чтобы контур в каждом слое начинался в одном и том же углу. Программа должна сохранять результат в `square_seam.gcode`.

В просмотрщике включите изометрию и найдите шов: кольца «начало слоя» всех слоев должны оказаться друг над другом.

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Нить и путь печати не меняются: контур и заполнение те же. Меняются только холостые ходы, и по ним видно, что правка подействовала.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Слоев | 10 | изменена не та строка |
| Нить E, мм | 89,93 | задето заполнение или контур |
| Холостые, м | 0,49 | шов по-прежнему смещается |

</div>

<div class="quiz" data-file="task_1-4_2.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верного ответа скопируйте комментарий в конец файла <code>task_1-4_2.py</code>.</p>
<div class="quiz__q">
<p>1. Почему холостые ходы сократились, а шов при этом стал хуже?</p>
<label><input type="radio" data-ok> Заполнение каждого слоя начинается у левого нижнего угла; если контур всегда заканчивается там же, переезд к заполнению почти нулевой. Но точки старта всех слоев легли друг над другом, и их переливы сложились в заметную линию.</label>
<label><input type="radio"> Контур стал короче, потому что без поворота списка углов печатается на одну сторону меньше.</label>
<label><input type="radio"> Генератор пропускает холостой подъем на слой, когда старт не меняется.</label>
<p class="quiz__exp" hidden>По разбору файла переезды «конец контура → начало заполнения» уменьшились со 152 мм до 8 мм за 10 слоев; выигрыш во времени получен за счет качества стенки (task 1-3, раздел 2).</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

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
1. Ответьте на вопросы мини-теста после требований и вставьте полученный комментарий в конец файла.

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Статистика показывает, превратились ли переезды между линиями в рабочие ходы: путь печати и нить растут, холостые падают. Все вместе означает, что заполнение стало одним непрерывным путем.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Слоев | 10 | задеты строки подъема на слой |
| Нить E, мм | 95,92 | соединения записаны без подачи или добавлены перед первой линией |
| Путь печати, м | 2,88 | соединительные отрезки не стали рабочими |
| Холостые, м | 0,44 | внутри заполнения остались холостые переезды |
| E на 1 мм пути | 0,03326 | подача на соединения посчитана не функцией `e_for` |
| Предупреждения | нет | режим подачи изменен |

</div>

<div class="quiz" data-file="task_1-4_zigzag.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_1-4_zigzag.py</code>.</p>
<div class="quiz__q">
<p>1. Почему холостые ходы сократились не до нуля?</p>
<label><input type="radio" data-ok> Остались разрывы между частями слоя и между слоями: переезд к началу контура, от конца контура к первой линии заполнения и подъем на следующий слой.</label>
<label><input type="radio"> Просмотрщик считает холостыми любые перемещения со скоростью F6000.</label>
<label><input type="radio"> Первая линия заполнения каждого слоя печатается без подачи.</label>
<p class="quiz__exp" hidden>Непрерывным стало только заполнение внутри слоя; контур и переходы между слоями по-прежнему требуют переездов.</p>
</div>
<div class="quiz__q">
<p>2. Откуда у зигзага около 6 мм лишней нити по сравнению с square.gcode?</p>
<label><input type="radio" data-ok> В каждом слое 9 соединительных отрезков по 2 мм стали рабочими: 9 · 2 · 10 = 180 мм пути, то есть 180 · 0,03326 ≈ 5,99 мм нити.</label>
<label><input type="radio"> Контур стал на одну сторону длиннее.</label>
<label><input type="radio"> Генератор увеличил плотность заполнения до 25 %.</label>
<p class="quiz__exp" hidden>Длина пути печати выросла с 2,70 до 2,88 м как раз на 180 мм соединений.</p>
</div>
<div class="quiz__q">
<p>3. Где относительно дорожки контура ложатся соединительные отрезки?</p>
<label><input type="radio" data-ok> По линии lo_x = x0 + W, то есть по внутреннему краю дорожки контура: соединительная дорожка наполовину, на W / 2, лежит на контуре.</label>
<label><input type="radio"> Ровно по оси контура: соединения повторяют его.</label>
<label><input type="radio"> На W / 2 внутрь от края контура, не касаясь его.</label>
<p class="quiz__exp" hidden>Так же устроены концы линий заполнения в gen.py: перекрытие на W / 2 сваривает заполнение с контуром (разбор генератора).</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. Внутри папки `pipeline_1` создайте папку `task_1_4`.
1. Переместите в нее `gen.py` и все программы этой страницы: <span class="task__file">task\_1-4\_1.py</span>, <span class="task__file">task\_1-4\_2.py</span> и <span class="task__file">task\_1-4\_zigzag.py</span>. Файлы `.gcode` переносить не нужно: программы создают их заново.
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
1. Prusa Knowledge Base. PLA — температуры в начале файла: [help.prusa3d.com/article/pla\_2062](https://help.prusa3d.com/article/pla_2062).
1. PrusaSlicer 2.8.1: встроенная справка по параметрам (`prusa-slicer --help-fff`), параметр `infill_overlap`.
{: .sources__list}

</section>
