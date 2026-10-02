---
work: 2
code: "task 2-3"
title: "Сколько граней у ребра: дыры и сингулярности"
pymods: "stl_io.py,mesh_index.py,mesh_checks.py"
pyfiles: "finger.stl,holed.stl,two_cubes.stl"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Самая быстрая проверка сетки состоит из одного вопроса к каждому ребру: сколько граней к нему примыкает? В замкнутой многообразной сетке ответ всегда 2. Ребро с одной гранью лежит на краю дыры или щели, ребро с тремя и более гранями сингулярное: в нем сходятся несколько кусков поверхности.

Для ответа не нужны координаты, только таблица связности из [task 2-2](task_2-2.html). Поэтому проверка работает одинаково для модели в миллиметрах и в дюймах и занимает один проход по граням.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- считать число граней у каждого ребра;
- находить края (дыры, щели) и сингулярные ребра;
- собирать краевые ребра в контуры и считать дыры.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Задания 1 и 2 выполняются на первой встрече и занимают около 15 минут. Итоговое задание (около 20 минут) выполняется самостоятельно между встречами.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Подсчет граней у ребра
{: .subsection__title}

| Граней у ребра | Что это | Чем грозит слою |
|---|---|---|
| 1 | край: дыра или щель | контур слоя не замкнут, слайсер вынужден угадывать |
| 2 | норма | нет |
| больше 2 | сингулярное ребро | неясно, какие куски поверхности ограничивают тело |

<article class="example" markdown="1">

### Пример 1. Проверка исправной модели
{: .example__title}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh


def edge_faces(faces):
    """Словарь: ребро -> сколько граней к нему примыкает."""
    count = {}
    for a, b, c in faces:
        for u, v in ((a, b), (b, c), (c, a)):
            e = (min(u, v), max(u, v))
            count[e] = count.get(e, 0) + 1
    return count


verts, faces = index_mesh(read_stl("finger.stl"))
count = edge_faces(faces)
print("Ребер:", len(count))
print("Краевых (1 грань):", sum(1 for k in count.values() if k == 1))
print("Сингулярных (больше 2):", sum(1 for k in count.values() if k > 2))
{% endcapture %}{% capture expected %}
Ребер: 1656
Краевых (1 грань): 0
Сингулярных (больше 2): 0
{% endcapture %}{% include pyrun.html file="task_2-3_example.py" code=code expected=expected note="Пример можно запускать и менять: модель <code>finger.stl</code> уже есть в окне." %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `edge_faces` устроена как `edges_of` из `mesh_index.py`, но вместо множества использует словарь: для каждого ребра он хранит счетчик. `count.get(e, 0) + 1` увеличивает счетчик, а для нового ребра начинает с нуля.
- `sum(1 for k in count.values() if k == 1)` считает ребра, у которых ровно одна грань.
- У фаланги все 1656 ребер нормальные, как и должно быть у модели, прошедшей тест 2*E* = 3*F* на [task 2-2](task_2-2.html).

</div>

</article>

<aside class="callout callout--important" markdown="1">

Накопительный модуль `mesh_checks.py`
{: .callout__title}

С этой страницы вы собираете функции проверки сетки в одном файле. Создайте в рабочей папке файл `mesh_checks.py` и перенесите в него функцию `edge_faces` из примера. Программы заданий импортируют ее строкой `from mesh_checks import edge_faces`. В окнах запуска на сайте уже есть `mesh_checks.py` с готовыми функциями из примеров (`edge_faces` с этой страницы, `signed_volume` с [task 2-4](task_2-4.html) и `shells` с [task 2-5](task_2-5.html)); функции из заданий вы пишете в программе окна, а в файле для сдачи переносите в свой `mesh_checks.py`. На следующих страницах в этот файл добавятся новые функции, а на [task 2-7](task_2-7.html) из них соберется итоговая программа. Имена и аргументы функций берите точно из условий.

</aside>

<article class="task" id="task-1" markdown="1">

### Задание 1. Гистограмма ребер <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-3\_1.py</span>
{: .task__meta}

Для модели `holed.stl` постройте словарь «число граней у ребра → сколько таких ребер» и напечатайте его, упорядочив по ключу.

```text
Граней у ребра -> число ребер: {1: 9, 2: 1641}
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import edge_faces

verts, faces = index_mesh(read_stl("holed.stl"))
count = edge_faces(faces)
hist = {}   # число граней у ребра -> сколько таких ребер; заполните по count
print("Граней у ребра -> число ребер:", dict(sorted(hist.items())))
{% endcapture %}{% capture expected %}
Граней у ребра -> число ребер: {1: 9, 2: 1641}
{% endcapture %}{% include pyrun.html file="task_2-3_1.py" code=code expected=expected %}

Запишите комментарием в конце программы, сколько граней удалено из исходной модели, если в ней было 1104 грани (число *F* для `holed.stl` дает итоговое задание [task 2-2](task_2-2.html)).

<div class="quiz" data-file="task_2-3_1.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-3_1.py</code>.</p>
<div class="quiz__q">
<p>Почему краевых ребер 9, а не по 3 на каждую удаленную грань?</p>
<label><input type="radio" data-ok> Удаленные грани соседние: их общие ребра удалены вместе с ними и краем не стали.</label>
<label><input type="radio"> Часть краевых ребер слилась при округлении координат.</label>
<label><input type="radio"> Функция <code>edge_faces</code> не учитывает ребра длиннее 1 мм.</label>
<p class="quiz__exp" hidden>Ребро становится краевым, только если из двух его граней удалена одна. Ребро между двумя удаленными гранями исчезает целиком.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Где сингулярное ребро <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_2-3\_2.py</span>
{: .task__meta}

Модель `two_cubes.stl` состоит из двух кубов со стороной 10 мм, поставленных вплотную так, что они касаются по одному вертикальному ребру. Найдите все ребра, у которых больше двух граней, и напечатайте координаты их концов и число граней.

```text
Сингулярное ребро: (10.0, 10.0, 10.0) - (10.0, 10.0, 0.0), граней: 4
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import edge_faces

verts, faces = index_mesh(read_stl("two_cubes.stl"))
count = edge_faces(faces)
# для каждого ребра (u, v), у которого больше двух граней, напечатайте строку
# Сингулярное ребро: (x, y, z) - (x, y, z), граней: k
{% endcapture %}{% capture expected %}
Сингулярное ребро: (10.0, 10.0, 10.0) - (10.0, 10.0, 0.0), граней: 4
{% endcapture %}{% include pyrun.html file="task_2-3_2.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-3_2.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-3_2.py</code>.</p>
<div class="quiz__q">
<p>1. Почему сетка <code>two_cubes.stl</code> не прошла тест 2<i>E</i> = 3<i>F</i>, хотя дыр в ней нет?</p>
<label><input type="radio" data-ok> У ребра с 4 гранями две лишние стороны граней: сторон 3<i>F</i> больше, чем 2<i>E</i>.</label>
<label><input type="radio"> В сетке есть вырожденные грани.</label>
<label><input type="radio"> Тест 2<i>E</i> = 3<i>F</i> верен только для одной оболочки.</label>
<p class="quiz__exp" hidden>Тест считает, что каждое ребро посчитано ровно дважды. Ребро с 4 гранями посчитано 4 раза, поэтому 3<i>F</i> = 2<i>E</i> + 2.</p>
</div>
<div class="quiz__q">
<p>2. Как такая модель могла получиться в CAD (computer-aided design, система автоматизированного проектирования)?</p>
<label><input type="radio" data-ok> Два тела поставлены вплотную по ребру и экспортированы одним файлом.</label>
<label><input type="radio"> Модель экспортирована в дюймах вместо миллиметров.</label>
<label><input type="radio"> Экспорт выполнен с крупным хордовым отклонением.</label>
<p class="quiz__exp" hidden>Каждое тело по отдельности замкнуто; дефект появляется только при объединении в одну сетку, где вершины общего ребра сливаются.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<aside class="callout callout--hint" markdown="1">

Проверка в просмотрщике
{: .callout__title}

Когда задания 1 и 2 решены, откройте `holed.stl` и `two_cubes.stl` в просмотрщике ниже: края показаны красным, сингулярное ребро темно-синим, числа справа должны совпасть с выводом ваших программ. Затем откройте `finger.stl`, выберите «удалить грань» и удалите одну грань. Сколько краевых ребер появилось? Как изменились *V* − *E* + *F* и тест 2*E* = 3*F*? Удалите соседнюю грань и объясните, почему краевых ребер стало 4, а не 6. Эти вопросы для самопроверки, ответы не сдаются.

</aside>

{% include mesh-viewer.html presets="finger,holed,two_cubes" default="holed" %}

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Контур дыры
{: .subsection__title}

Краевые ребра одной дыры образуют замкнутый контур. Если дыра простая, в каждой ее вершине сходятся ровно два краевых ребра, поэтому контур можно обойти: из вершины идем к соседу по краевому ребру, из него к следующему соседу, кроме того, откуда пришли, и так до возвращения в начало.

<figure class="diagram">
<svg role="img" viewBox="0 0 520 225">
<title>Фрагмент сетки с дырой: вокруг шестиугольной дыры кольцо из двенадцати треугольников, край дыры из шести ребер выделен красным.</title>
<polygon class="d-mface" points="410,105 335,179 312,130"></polygon>
<polygon class="d-mface" points="312,130 335,179 260,155"></polygon>
<polygon class="d-mface" points="335,179 185,179 260,155"></polygon>
<polygon class="d-mface" points="260,155 185,179 208,130"></polygon>
<polygon class="d-mface" points="185,179 110,105 208,130"></polygon>
<polygon class="d-mface" points="208,130 110,105 208,80"></polygon>
<polygon class="d-mface" points="110,105 185,31 208,80"></polygon>
<polygon class="d-mface" points="208,80 185,31 260,55"></polygon>
<polygon class="d-mface" points="185,31 335,31 260,55"></polygon>
<polygon class="d-mface" points="260,55 335,31 312,80"></polygon>
<polygon class="d-mface" points="335,31 410,105 312,80"></polygon>
<polygon class="d-mface" points="312,80 410,105 312,130"></polygon>
<polygon class="d-medge d-medge--bad" points="312,130 260,155 208,130 208,80 260,55 312,80" style="fill:none"></polygon>
<circle class="d-mvert" cx="312" cy="130" r="4"></circle><circle class="d-mvert" cx="260" cy="155" r="4"></circle><circle class="d-mvert" cx="208" cy="130" r="4"></circle><circle class="d-mvert" cx="208" cy="80" r="4"></circle><circle class="d-mvert" cx="260" cy="55" r="4"></circle><circle class="d-mvert" cx="312" cy="80" r="4"></circle>
<text class="d-text d-text--small" x="260" y="109" text-anchor="middle">дыра</text>
<text class="d-text d-text--small" x="260" y="218" text-anchor="middle">красным: краевые ребра; в каждой вершине контура их два</text>
</svg>
<figcaption class="diagram__caption">Адаптировано по Attene M. et al., 2013, п. 3.3.1 (p. 15:8); лекция 3, слайды 55–56.</figcaption>
</figure>

{% include anim-hole-walk.html %}

<aside class="callout callout--warning" markdown="1">

Когда простой обход не работает
{: .callout__title}

Если две дыры касаются в одной вершине, в ней сходятся четыре краевых ребра. Это сингулярная вершина, и правило «иди к соседу, кроме того, откуда пришел» может увести обход в чужой контур. В моделях этого занятия таких вершин нет; настоящие программы ремонта сначала разделяют сингулярные вершины.

</aside>

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: сколько дыр и какого размера <span class="level level--5">Уровень 5 · итоговое</span>

Файлы: <span class="task__file">task\_2-3\_holes.py</span>, функция `holes` в <span class="task__file">mesh\_checks.py</span>
{: .task__meta}

**Ситуация.** Чтобы выбрать способ ремонта, мало знать, что сетка не замкнута. Нужно знать, сколько в ней дыр и насколько они велики: маленькую дыру закрывают заплатой, большую сначала сверяют с исходными данными, не потеряна ли там часть анатомии.

**Требования:**

1. Добавьте в `mesh_checks.py` функцию `holes(faces)`. Она собирает краевые ребра в контуры и возвращает список контуров; контур — это список номеров вершин в порядке обхода. Для подсчета граней у ребер используйте `edge_faces`.
1. Программа `task_2-3_holes.py` импортирует `holes`, применяет ее к `holed.stl` и печатает число дыр.
1. Для каждой дыры печатается число ребер контура и периметр в миллиметрах (сумма длин ребер, включая ребро от последней вершины к первой; длину дает `math.dist`).
1. Порядок дыр в выводе может отличаться от примера.

```text
Дыр: 2
Дыра 1: ребер 3, периметр 5.75 мм
Дыра 2: ребер 6, периметр 12.95 мм
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
import math

from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import edge_faces


def holes(faces):
    """Контуры дыр: списки номеров вершин в порядке обхода краевых ребер."""
    loops = []
    # соберите краевые ребра (у них одна грань) и обойдите их по правилу раздела 2
    return loops


verts, faces = index_mesh(read_stl("holed.stl"))
loops = holes(faces)
print("Дыр:", len(loops))
# для каждой дыры напечатайте число ребер контура и периметр в миллиметрах
{% endcapture %}{% capture expected %}
Дыр: 2
Дыра 1: ребер 3, периметр 5.75 мм
Дыра 2: ребер 6, периметр 12.95 мм
{% endcapture %}{% include pyrun.html file="task_2-3_holes.py" code=code expected=expected note="В окне функция <code>holes</code> стоит в самой программе. В файле для сдачи перенесите ее в <code>mesh_checks.py</code>, а программа импортирует ее строкой <code>from mesh_checks import holes</code>. Если дыры напечатаны в другом порядке, окно покажет расхождение, а решение при этом верно." %}

<div class="quiz" data-file="task_2-3_holes.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-3_holes.py</code>.</p>
<div class="quiz__q">
<p>Как найденные дыры связаны с <i>V</i> − <i>E</i> + <i>F</i> = 0 для этой модели на task 2-2?</p>
<label><input type="radio" data-ok> Если закрыть каждую дыру одной гранью-многоугольником, <i>F</i> вырастет на 2, <i>V</i> и <i>E</i> не изменятся, и сумма станет 2, как у замкнутой фаланги.</label>
<label><input type="radio"> Каждая дыра уменьшает сумму на число своих ребер.</label>
<label><input type="radio"> Связи нет: формула Эйлера к дырам не относится.</label>
<p class="quiz__exp" hidden>Заплата-многоугольник использует уже существующие вершины и ребра контура. Поэтому каждая дыра отнимает от суммы ровно 1.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В папке `pipeline_2` создайте папку `task_2_3` и переместите в нее программы этой страницы: <span class="task__file">task\_2-3\_1.py</span>, <span class="task__file">task\_2-3\_2.py</span> и <span class="task__file">task\_2-3\_holes.py</span>.
1. Скопируйте в `task_2_3` модули, которые импортируют программы: `mesh_checks.py`, `mesh_index.py` и `stl_io.py`. Так папка запускается сама по себе.
1. Рабочие копии модулей и модели `.stl` оставьте в `mesh_work`: они нужны на следующих страницах. Файл `mesh_checks.py` в рабочей папке продолжайте пополнять; в папку страницы кладется его копия на момент сдачи.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_2/
    ├── task_2_1/
    ├── task_2_2/
    └── @@task_2_3/@@
        ├── mesh_checks.py
        ├── mesh_index.py
        ├── stl_io.py
        ├── task_2-3_1.py
        ├── task_2-3_2.py
        └── task_2-3_holes.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 4 (слайды 51–56).
1. Attene M. et al. Polygon Mesh Repairing: An Application Perspective. ACM Computing Surveys, 2013 — p. 15:4–15:9.
1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — p. 56–57, 509–510.
{: .sources__list}

</section>
