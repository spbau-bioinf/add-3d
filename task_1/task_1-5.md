---
work: 1
code: "task 1-5"
title: "Скаффолд 0°/90°: пористость из шага дорожек"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

В тканевой инженерии экструзионную печать используют, чтобы строить <dfn>скаффолды</dfn> — пористые каркасы, в которых растут клетки. Здесь привычная последовательность «модель → слайсер → G-код» теряет смысл: форма скаффолда проста, а главное свойство — пористость — задается самой траекторией, расстоянием между дорожками.

Чем больше пористость, тем больше места для роста клеток; при этом каркас должен оставаться как можно прочнее. Пористость выше 66 % встречается часто. Иногда ради прочности выбирают сопло большего диаметра: для скаффолдов диаметр сопла ограничен не так строго, как для обычных деталей.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- связывать шаг дорожек решетки с ее пористостью;
- рассчитывать шаг для заданной пористости;
- генерировать решетку 0°/90° тем же генератором, что и деталь;
- объяснять, почему пористость реального образца отличается от модели.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Страница выполняется на второй встрече: задания 1 и 2 занимают около 10 минут, итоговое задание — около 10 минут. Задание 3 необязательное и в это время не входит. Теоретическую часть используйте как справочник: к нужному разделу ведут ссылки в условиях заданий.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Шаг дорожек и пористость
{: .subsection__title}

Самая простая архитектура скаффолда — ортогональная: в одном слое дорожки идут под 0°, в следующем — под 90°, и так далее. Для многих исследований ее достаточно; более сложные рисунки меняют число и расстояние между пересечениями дорожек.

<figure class="diagram">
<svg role="img" viewBox="0 0 640 300">
<title>Вид сверху на решетку: горизонтальные дорожки нижнего слоя и вертикальные дорожки верхнего слоя; ширина дорожки W, шаг между осями s.</title>
<g class="d-road d-road--fill d-road--butt" stroke-width="16">
<line x1="40" y1="60" x2="330" y2="60"></line><line x1="40" y1="108" x2="330" y2="108"></line>
<line x1="40" y1="156" x2="330" y2="156"></line><line x1="40" y1="204" x2="330" y2="204"></line>
<line x1="40" y1="252" x2="330" y2="252"></line>
</g>
<g class="d-road d-road--butt" stroke-width="16">
<line x1="64" y1="36" x2="64" y2="276"></line><line x1="112" y1="36" x2="112" y2="276"></line>
<line x1="160" y1="36" x2="160" y2="276"></line><line x1="208" y1="36" x2="208" y2="276"></line>
<line x1="256" y1="36" x2="256" y2="276"></line><line x1="304" y1="36" x2="304" y2="276"></line>
</g>
<path class="d-dim" d="M112,22 H160 M112,16 V28 M160,16 V28"></path>
<text class="d-text d-text--mono" x="136" y="12" text-anchor="middle">s</text>
<path class="d-dim" d="M338,148 H350 M338,164 H350 M344,148 V164"></path>
<text class="d-text d-text--mono" x="358" y="161">W</text>
<text class="d-text" x="400" y="70">светлые — слой 0°</text>
<text class="d-text" x="400" y="96">темные — слой 90°</text>
<text class="d-text d-text--mono" x="400" y="150">P ≈ 1 − W / s</text>
<text class="d-text d-text--small" x="400" y="184">W = 0,4 мм, s = 1,2 мм: P ≈ 67 %</text>
</svg>
<figcaption class="diagram__caption">Адаптировано по Gibson et al., 2021, п. 6.7.3 и Fig. 6.11 (p. 195).</figcaption>
</figure>

{% include anim-lattice.html %}

<div class="definition" markdown="1">

<span class="definition__term">Пористость</span> *P* — доля объема образца, не занятая материалом.

</div>

<div class="definition" markdown="1">

<span class="definition__term">Шаг дорожек</span> *s* — расстояние между осевыми линиями соседних дорожек одного слоя. Он задает макропористость скаффолда.

</div>

В каждом слое дорожки шириной *W* повторяются с шагом *s*, поэтому материал занимает долю *W* / *s* площади слоя, а поры — остальное:

<div class="formula"><i>P</i> ≈ 1 − <i>W</i> / <i>s</i>,&nbsp;&nbsp;&nbsp;&nbsp;откуда&nbsp;&nbsp;&nbsp;&nbsp;<i>s</i> = <i>W</i> / (1 − <i>P</i>)</div>
<dl class="where">
<div><dt>где <i>P</i></dt><dd>пористость, доля объема образца, не занятая материалом (определение выше)</dd></div>
<div><dt><i>W</i></dt><dd>ширина дорожки, мм (<a href="task_1-2.html">task 1-2</a>, раздел 1)</dd></div>
<div><dt><i>s</i></dt><dd>шаг дорожек, мм: расстояние между осями соседних дорожек одного слоя (определение выше)</dd></div>
</dl>

Модель предполагает, что решетка бесконечна и строго периодична, а сечение дорожки — прямоугольник, как в [task 1-2](task_1-2.html).

<article class="example" markdown="1">

### Пример 1. Решетка с шагом 1,2 мм
{: .example__title}

Генератор из [task 1-4](task_1-4.html) строит скаффолд, если отключить контур: `outline=False`. Параметр `infill` — это доля материала *W* / *s*, поэтому для шага *s* его вычисляют как `W / s`.

{% capture code %}
from gen import square_part, W

s = 1.2   # шаг между дорожками, мм
open("scaffold.gcode", "w").write(
    square_part(x0=95, y0=95, size=10, n_layers=20, infill=W / s, outline=False))
{% endcapture %}{% include pyrun.html file="scaffold_example.py" code=code note="Запуск записывает scaffold.gcode; откройте его в просмотрщике кнопкой под окном вывода." %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- По модели пористость равна 1 − 0,4 / 1,2 ≈ 0,667, то есть 66,7 %.
- Образец 10 × 10 мм, 20 слоев по 0,2 мм — всего 4 мм высотой. Генератор сам чередует направление дорожек 0° и 90°.
- В просмотрщике (кнопка «Скаффолд (task 1-5)»): «Слоев» — 20, «Нить E, мм» — 59,87, в каждом слое 9 линий.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Шаг для заданной пористости <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_1-5\_1.py</span>
{: .task__meta}

Для ширины дорожки 0,4 мм рассчитайте шаг *s* для пористости 60, 66, 75 и 80 %. Пористости перебирайте в цикле по списку.

```text
Пористость 60 %: шаг 1.00 мм
Пористость 66 %: шаг 1.18 мм
Пористость 75 %: шаг 1.60 мм
Пористость 80 %: шаг 2.00 мм
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
W = 0.4   # ширина дорожки, мм

# цикл по списку пористостей; шаг по формуле раздела 1
{% endcapture %}{% capture expected %}
Пористость 60 %: шаг 1.00 мм
Пористость 66 %: шаг 1.18 мм
Пористость 75 %: шаг 1.60 мм
Пористость 80 %: шаг 2.00 мм
{% endcapture %}{% include pyrun.html file="task_1-5_1.py" code=code expected=expected %}

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Скаффолд 75 % <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_1-5\_2.py</span>
{: .task__meta}

Сгенерируйте скаффолд 10 × 10 мм из 20 слоев с пористостью 75 % по модели и сохраните его в `scaffold_75.gcode`. Шаг вычисляется в программе, а не записывается числом.

{% capture code %}
from gen import square_part, W

porosity = 0.75
# шаг s вычислите по формуле раздела 1, затем сохраните scaffold_75.gcode
{% endcapture %}{% include pyrun.html file="task_1-5_2.py" code=code %}

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Числа подтверждают, что шаг рассчитан по формуле, а не подобран: при шаге 1,6 мм в слое 10 мм помещается ровно 7 линий.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Слоев | 20 | изменено число слоев или контур не отключен |
| Нить E, мм | 46,56 | шаг не равен 1,6 мм |
| Линий в слое (по картинке) | 7 | параметр `infill` рассчитан не как `W / s` |

</div>

<div class="quiz" data-file="task_1-5_2.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_1-5_2.py</code>.</p>
<div class="quiz__q">
<p>1. Во сколько раз меньше нити у скаффолда с пористостью 75 %, чем у скаффолда из примера 1?</p>
<label><input type="radio" data-ok> Примерно в 1,29 раза: 59,87 / 46,56.</label>
<label><input type="radio"> В 1,5 раза: 75 / 50.</label>
<label><input type="radio"> В 1,33 раза: 1,6 / 1,2.</label>
<p class="quiz__exp" hidden>Отношение берется из статистики просмотрщика; оно близко к отношению числа линий 9 / 7 ≈ 1,29.</p>
</div>
<div class="quiz__q">
<p>2. Сколько пересечений дорожек получается между двумя соседними слоями у каждого скаффолда?</p>
<label><input type="radio" data-ok> 9 · 9 = 81 у скаффолда примера 1 и 7 · 7 = 49 у скаффолда 75 %; только в этих точках слои сплавлены друг с другом, поэтому редкая решетка держится на меньшем числе соединений.</label>
<label><input type="radio"> 9 + 9 = 18 и 7 + 7 = 14: каждая дорожка касается соседней один раз.</label>
<label><input type="radio"> Пересечений нет: слои 0° и 90° не касаются друг друга.</label>
<p class="quiz__exp" hidden>Каждая из линий слоя 90° лежит поперек всех линий слоя 0°, поэтому число пересечений равно произведению чисел линий.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<article class="task task--star" id="task-3" markdown="1">

### Задание 3. Другие архитектуры
{: .task__title}

[FullControl](https://github.com/FullControlXYZ/fullcontrol) — открытая библиотека Python для проектирования траектории печати напрямую: вместо модели и слайсера вы задаете список точек и состояний экструдера, а библиотека превращает его в G-код. Это тот же подход, что в `gen.py`, но с готовыми инструментами для спиралей, волн и решеток под произвольным углом. Учебные блокноты библиотеки открываются в [Google Colab](https://colab.research.google.com/) — бесплатном сервисе Google для запуска блокнотов Jupyter в браузере, где уже установлен Python и ничего ставить не нужно; ссылки на блокноты есть в README библиотеки. Постройте в ней решетку с углом между слоями 60° и сравните ее с решеткой 0°/90° в просмотрщике.

Задание не оценивается и в хронометраж занятия не входит. Если вы его выполнили, сохраните полученный G-код как `task_1-5_star.gcode` в папку `task_1_5`. Вместо Colab подойдет любой Jupyter, например в VS Code или PyCharm; для установки библиотеки на свой компьютер по инструкции из ее README нужен [git](https://git-scm.com/).

</article>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Просмотрщик
{: .subsection__title}

В изометрии хорошо видно, как слои 0° и 90° ложатся друг на друга и образуют поры.

{% include gcode-viewer.html presets="scaffold,square" default="scaffold" %}

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: модель и образец <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_1-5\_porosity.py</span>
{: .task__meta}

**Ситуация.** Формула *P* ≈ 1 − *W* / *s* написана для бесконечной решетки. Реальный образец имеет конечный размер, и в слое помещается целое число линий. Сколько именно — решает генератор: в области шириной `size` оси линий могут лежать на отрезке длиной `size − W`, поэтому число линий равно

<div class="formula"><i>n</i> = ⌊(<i>a</i> − <i>W</i>) / <i>s</i>⌋ + 1</div>
<dl class="where">
<div><dt>где <i>n</i></dt><dd>число линий в слое</dd></div>
<div><dt><i>a</i></dt><dd>сторона образца, мм (в программе <code>size</code>)</dd></div>
<div><dt><i>W</i></dt><dd>ширина дорожки, мм (<a href="task_1-2.html">task 1-2</a>, раздел 1)</dd></div>
<div><dt><i>s</i></dt><dd>шаг дорожек, мм (раздел 1)</dd></div>
<div><dt>⌊ ⌋</dt><dd>округление вниз до целого; в Python это <code>int((size - W) / s + 1e-9) + 1</code>, где слагаемое <code>1e-9</code> защищает от погрешности деления дробей</dd></div>
</dl>

Пористость конечного образца считается по доле площади слоя, занятой линиями:

<div class="formula"><i>P</i><sub>обр</sub> = 1 − <i>n</i> · <i>W</i> / <i>a</i></div>
<dl class="where">
<div><dt>где <i>P</i><sub>обр</sub></dt><dd>пористость образца, доля</dd></div>
<div><dt><i>n</i>, <i>W</i>, <i>a</i></dt><dd>те же, что выше</dd></div>
</dl>

Напишите функцию `lines_in(size, s, W=0.4)`, которая возвращает число линий в слое, и выведите ровно следующее для образца 10 мм:

```text
s = 1.2 мм: модель 66.7 %, образец 64.0 %, линий в слое 9
s = 1.6 мм: модель 75.0 %, образец 72.0 %, линий в слое 7
```
{: .output data-label="Требуемый вывод"}

**Требования:**

1. Пористость образца считается по формуле для *P*<sub>обр</sub>.
1. Шаги перебираются в цикле; все числа, кроме 10, 0.4, 1.2 и 1.6, получаются при вычислении.
1. Проверьте число линий по просмотрщику для обоих скаффолдов.
1. Ответьте на вопросы мини-теста ниже и вставьте полученный комментарий в конец файла.

{% capture code %}
W = 0.4       # ширина дорожки, мм
SIZE = 10     # сторона образца, мм


def lines_in(size, s, W=0.4):
    # число линий в слое по формуле из условия
    pass


# цикл по шагам 1.2 и 1.6: пористость модели, пористость образца, число линий
{% endcapture %}{% capture expected %}
s = 1.2 мм: модель 66.7 %, образец 64.0 %, линий в слое 9
s = 1.6 мм: модель 75.0 %, образец 72.0 %, линий в слое 7
{% endcapture %}{% include pyrun.html file="task_1-5_porosity.py" code=code expected=expected %}

<div class="quiz" data-file="task_1-5_porosity.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_1-5_porosity.py</code>.</p>
<div class="quiz__q">
<p>1. Почему образец получается менее пористым, чем модель?</p>
<label><input type="radio" data-ok> В конечном образце линии стоят у обоих краев: на 10 мм помещается 10 / 1,2 ≈ 8,3 периода, а линий 9, поэтому доля материала n · W / a больше, чем W / s.</label>
<label><input type="radio"> Генератор печатает в каждом слое лишний контур.</label>
<label><input type="radio"> Формула модели не учитывает высоту слоя.</label>
<p class="quiz__exp" hidden>Формула P ≈ 1 − W / s написана для бесконечной периодической решетки; у образца с краями линий всегда на одну больше, чем периодов.</p>
</div>
<div class="quiz__q">
<p>2. Какая особенность реальных дорожек сделает пористость напечатанного скаффолда еще ниже расчетной?</p>
<label><input type="radio" data-ok> Дорожку прижимают к предыдущему слою, она ложится овалом и расплющивается шире W, частично заполняя промежутки.</label>
<label><input type="radio"> Нить на входе в сопло имеет диаметр 1,75 мм, больше ширины дорожки.</label>
<label><input type="radio"> Принтер печатает дополнительные опорные линии между дорожками.</label>
<p class="quiz__exp" hidden>Прямоугольное сечение дорожки — приближение модели (task 1-2, раздел 2); реальная дорожка шире расчетной.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. Внутри папки `pipeline_1` создайте папку `task_1_5`.
1. Переместите в нее копию `gen.py` и все программы этой страницы: <span class="task__file">task\_1-5\_1.py</span>, <span class="task__file">task\_1-5\_2.py</span> и <span class="task__file">task\_1-5\_porosity.py</span>.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_1/
    ├── task_1_1/
    ├── task_1_2/
    ├── task_1_3/
    ├── task_1_4/
    └── @@task_1_5/@@
        ├── gen.py
        ├── task_1-5_1.py
        ├── task_1-5_2.py
        ├── task_1-5_porosity.py
        └── task_1-5_star.gcode   (только если выполнено задание 3)
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — п. 6.7.3 и Fig. 6.11 (p. 195): архитектуры скаффолдов, пористость, шаг дорожек.
1. Redwood B., Schöffer F., Garret B. The 3D Printing Handbook. 3D Hubs, 2017 — п. 2.2.3: дорожка ложится овалом.
1. FullControl: [github.com/FullControlXYZ/fullcontrol](https://github.com/FullControlXYZ/fullcontrol); Gleadall A. FullControl GCode Designer. Additive Manufacturing, 2021, 46, 102109.
{: .sources__list}

</section>
