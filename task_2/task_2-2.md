---
work: 2
code: "task 2-2"
title: "Из «супа» в индексированную сетку: формула Эйлера"
pymods: "stl_io.py,mesh_index.py"
pyfiles: "pyramid.stl,finger.stl,ring.stl,holed.stl,flipped.stl,two_cubes.stl"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

В STL (от stereolithography, стереолитография) каждая грань хранит свои вершины, поэтому программа не знает, какие грани соседние. Чтобы проверить сетку, сначала восстанавливают связность: сливают совпадающие вершины и заменяют координаты номерами. Получается индексированная сетка, та же, что хранят форматы OBJ (формат компании Wavefront) и 3MF (3D Manufacturing Format).

После этого сетку можно проверить двумя экспресс-тестами, которые не требуют геометрии: соотношением 2*E* = 3*F* и формулой Эйлера.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- строить индексированную сетку из «треугольного супа»;
- считать вершины, ребра и грани;
- проверять сетку формулой Эйлера и находить ее род;
- понимать, какие дефекты экспресс-тесты замечают, а какие нет.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Страница выполняется на первой практике по данной теме: задания 1 и 2 занимают около 15 минут, итоговое задание — около 15 минут.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Слияние вершин
{: .subsection__title}

Одна и та же вершина записана в STL столько раз, сколько граней в ней сходится. Чтобы собрать ее в одну, координаты используют как ключ словаря: первое появление дает вершине номер, следующие появления этот номер находят.

Координаты перед сравнением округляют. После экспорта и перевода в числа одинарной точности одна точка может получить координаты, различающиеся в последнем знаке, и без округления она распадется на несколько вершин. Округлять слишком грубо тоже нельзя: две разные вершины сольются в одну.

<div class="definition" markdown="1">

<span class="definition__term">Ребро</span> индексированной сетки: пара номеров вершин. Чтобы ребро (5, 9) и ребро (9, 5) считались одним, пару записывают меньшим номером вперед.

</div>

Скачайте модели и модуль этой страницы в рабочую папку (`stl_io.py` у вас уже есть).

- [mesh_index.py](../assets/files/mesh_index.py){: .files__link}
- [holed.stl](../assets/files/holed.stl){: .files__link}
- [flipped.stl](../assets/files/flipped.stl){: .files__link}
- [two_cubes.stl](../assets/files/two_cubes.stl){: .files__link}
{: .files}

<article class="example" markdown="1">

### Пример 1. Индексированная сетка пирамиды
{: .example__title}

{% capture code %}
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
{% endcapture %}{% capture expected %}
V = 4, E = 6, F = 4
V - E + F = 2
{% endcapture %}{% include pyrun.html file="mesh_index.py" code=code expected=expected note="Листинг модуля <code>mesh_index.py</code>: его код совпадает с файлом для скачивания. При запуске модуль считает вершины, ребра и грани пирамиды." %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- Словарь `where` хранит для каждой точки ее номер. Если ключа еще нет, точка добавляется в конец списка `verts` и получает номер, равный длине списка до добавления.
- Параметр `digits=4` задает округление до 0,0001 единицы файла. Для моделей в миллиметрах это 0,1 мкм, намного меньше любого разрешения машины. Округление — это учебный прием для моделей занятия: в произвольной модели две разные, но очень близкие вершины могут слиться, а совпадающие вершины на границе округления, наоборот, разойтись.
- `edges_of` обходит три стороны каждой грани: (a, b), (b, c), (c, a). Множество `set` само выбрасывает повторы, поэтому общее ребро двух граней попадает в него один раз.
- Для пирамиды 12 записей вершин превратились в 4 вершины, а 12 сторон граней в 6 ребер: каждое ребро принадлежит двум граням.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Сколько раз записана вершина <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-2\_1.py</span>
{: .task__meta}

Для модели `finger.stl` (фаланга пальца) посчитайте, сколько записей вершин в STL-файле и сколько уникальных вершин получилось после слияния. Напечатайте, сколько раз в среднем записана каждая вершина, и отношение *F* / *V*.

```text
Записей вершин в STL: 3312 | уникальных вершин: 554
Каждая вершина записана в среднем 5.98 раза, F / V = 1.99
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh

tris = read_stl("finger.stl")
verts, faces = index_mesh(tris)
records = 0   # сколько записей вершин в STL: по три на каждую грань
print(f"Записей вершин в STL: {records} | уникальных вершин: {len(verts)}")
# допишите вторую строку: среднее число записей на вершину и отношение F / V
{% endcapture %}{% capture expected %}
Записей вершин в STL: 3312 | уникальных вершин: 554
Каждая вершина записана в среднем 5.98 раза, F / V = 1.99
{% endcapture %}{% include pyrun.html file="task_2-2_1.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-2_1.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-2_1.py</code>.</p>
<div class="quiz__q">
<p>Как числа 5,98 и 1,99 связаны с правилом «у больших сеток <i>F</i> ≈ 2<i>V</i>, в среднем 6 ребер у вершины»?</p>
<label><input type="radio" data-ok> Каждая вершина входит в среднем в 6 граней: 3<i>F</i> / <i>V</i> ≈ 6, а значит, <i>F</i> / <i>V</i> ≈ 2.</label>
<label><input type="radio"> Вершина записана 6 раз, потому что у каждой грани 6 соседей.</label>
<label><input type="radio"> Числа совпадают с правилом случайно, только для этой модели.</label>
<p class="quiz__exp" hidden>Записей вершин 3<i>F</i>; каждая вершина записана столько раз, во сколько граней она входит. Из формулы Эйлера для большой сетки <i>E</i> ≈ 3<i>V</i> и <i>F</i> ≈ 2<i>V</i>, отсюда 3<i>F</i> / <i>V</i> ≈ 6.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Два экспресс-теста
{: .subsection__title}

**Тест 1: 2*E* = 3*F*.** У каждой грани 3 стороны, поэтому сторон всего 3*F*. В замкнутой многообразной сетке каждое ребро принадлежит ровно двум граням, то есть каждое ребро посчитано дважды:

<div class="formula">2<i>E</i> = 3<i>F</i></div>
<dl class="where">
<div><dt>где <i>E</i></dt><dd>число ребер индексированной сетки (раздел 1)</dd></div>
<div><dt><i>F</i></dt><dd>число граней</dd></div>
</dl>

 Отсюда же следует, что число граней замкнутой треугольной сетки четно. Это необходимое, но не достаточное условие: если края и ребра с лишними гранями случайно уравновесят друг друга, равенство выполнится и у испорченной сетки.

**Тест 2: формула Эйлера.** Для одной связной замкнутой поверхности

<div class="formula"><i>V</i> − <i>E</i> + <i>F</i> = 2(1 − <i>g</i>)</div>
<dl class="where">
<div><dt>где <i>V</i>, <i>E</i>, <i>F</i></dt><dd>число вершин, ребер и граней (раздел 1)</dd></div>
<div><dt><i>g</i></dt><dd>род поверхности, число «ручек» (<a href="task_2-0.html">task 2-0</a>, раздел 2)</dd></div>
</dl>

Если в сетке *C* замкнутых оболочек, суммы складываются:

<div class="formula"><i>V</i> − <i>E</i> + <i>F</i> = 2<i>C</i> − 2Σ<i>g</i><sub><i>i</i></sub></div>
<dl class="where">
<div><dt>где <i>C</i></dt><dd>число замкнутых оболочек</dd></div>
<div><dt><i>g</i><sub><i>i</i></sub></dt><dd>род <i>i</i>-й оболочки; Σ — сумма по всем оболочкам</dd></div>
</dl>

Для оболочек без сквозных отверстий сумма равна 2 × число оболочек.

Если равенство не выполняется, в сетке есть «утечка»: дыра, щель или ребро с лишними гранями. Обратное неверно: выполненные тесты не доказывают, что сетка исправна. Тесты считают только количества и не видят, например, в какую сторону повернута грань.

<article class="task" id="task-2" markdown="1">

### Задание 2. Род кольца <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_2-2\_2.py</span>
{: .task__meta}

Для моделей `finger.stl` и `ring.stl` вычислите *V* − *E* + *F* и род поверхности *g*. Род выражается из формулы Эйлера:

<div class="formula"><i>g</i> = 1 − (<i>V</i> − <i>E</i> + <i>F</i>) / 2</div>
<dl class="where">
<div><dt>где <i>g</i></dt><dd>род одной замкнутой оболочки</dd></div>
<div><dt><i>V</i> − <i>E</i> + <i>F</i></dt><dd>сумма Эйлера той же оболочки (раздел 2)</dd></div>
</dl>

```text
finger.stl: V - E + F = 2, род g = 0
ring.stl: V - E + F = 0, род g = 1
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh, edges_of

for name in ("finger.stl", "ring.stl"):
    verts, faces = index_mesh(read_stl(name))
    chi = 0   # замените 0 на V - E + F
    g = 0     # замените 0 на род по формуле раздела 2
    print(f"{name}: V - E + F = {chi}, род g = {g}")
{% endcapture %}{% capture expected %}
finger.stl: V - E + F = 2, род g = 0
ring.stl: V - E + F = 0, род g = 1
{% endcapture %}{% include pyrun.html file="task_2-2_2.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-2_2.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-2_2.py</code>.</p>
<div class="quiz__q">
<p>1. Что на модели кольца соответствует «ручке»?</p>
<label><input type="radio" data-ok> Сквозное отверстие для пальца.</label>
<label><input type="radio"> Утолщение обода.</label>
<label><input type="radio"> Любая грань, повернутая внутрь.</label>
<p class="quiz__exp" hidden>Ручка — это сквозное отверстие тела: у кольца оно одно, поэтому <i>g</i> = 1.</p>
</div>
<div class="quiz__q">
<p>2. Почему формула Эйлера не меняется от того, что кольцо записано в дюймах?</p>
<label><input type="radio" data-ok> Она считает только вершины, ребра и грани, а не длины.</label>
<label><input type="radio"> Программа пересчитывает дюймы в миллиметры автоматически.</label>
<label><input type="radio"> Дюймы и миллиметры отличаются меньше погрешности вычислений.</label>
<p class="quiz__exp" hidden>Масштаб меняет координаты, но не связность: число вершин, ребер и граней остается тем же.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: экспресс-проверка пяти моделей <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_2-2\_euler.py</span>
{: .task__meta}

**Ситуация.** Перед подробной диагностикой модели пропускают через быстрые тесты: они считаются за один проход и сразу отсеивают часть испорченных файлов.

**Требования:**

1. Для файлов `finger.stl`, `ring.stl`, `holed.stl`, `flipped.stl` и `two_cubes.stl` программа печатает по строке: имя, *V*, *E*, *F*, сумму *V* − *E* + *F* и итог теста 2*E* = 3*F*.
1. Формат строки как в требуемом выводе: имя дополнено пробелами до 14 знаков, числа выровнены по правому краю.

```text
finger.stl     V= 554 E=1656 F=1104 V-E+F= 2  2E = 3F
ring.stl       V= 576 E=1728 F=1152 V-E+F= 0  2E = 3F
holed.stl      V= 553 E=1650 F=1097 V-E+F= 0  2E != 3F: есть края или сингулярные ребра
flipped.stl    V= 554 E=1656 F=1104 V-E+F= 2  2E = 3F
two_cubes.stl  V=  14 E=  35 F=  24 V-E+F= 3  2E != 3F: есть края или сингулярные ребра
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh, edges_of

for name in ("finger.stl", "ring.stl", "holed.stl", "flipped.stl", "two_cubes.stl"):
    verts, faces = index_mesh(read_stl(name))
    V, E, F = len(verts), 0, len(faces)   # замените 0 на число ребер
    print(f"{name:<14} V={V:4d} E={E:4d} F={F:4d}")
    # допишите в строку V-E+F и итог теста 2E = 3F, как в требуемом выводе
{% endcapture %}{% capture expected %}
finger.stl     V= 554 E=1656 F=1104 V-E+F= 2  2E = 3F
ring.stl       V= 576 E=1728 F=1152 V-E+F= 0  2E = 3F
holed.stl      V= 553 E=1650 F=1097 V-E+F= 0  2E != 3F: есть края или сингулярные ребра
flipped.stl    V= 554 E=1656 F=1104 V-E+F= 2  2E = 3F
two_cubes.stl  V=  14 E=  35 F=  24 V-E+F= 3  2E != 3F: есть края или сингулярные ребра
{% endcapture %}{% include pyrun.html file="task_2-2_euler.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-2_euler.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-2_euler.py</code>.</p>
<div class="quiz__q">
<p>1. Модель <code>holed.stl</code> дает <i>V</i> − <i>E</i> + <i>F</i> = 0, как кольцо. Значит ли это, что у нее появилась «ручка»?</p>
<label><input type="radio"> Да: сумма 0 бывает только у поверхности с одной ручкой.</label>
<label><input type="radio" data-ok> Нет: формула 2(1 − <i>g</i>) верна только для замкнутых сеток; каждая дыра уменьшает сумму на 1, а дыр в модели две.</label>
<label><input type="radio"> Нет: сумма 0 означает, что в модели есть перевернутые грани.</label>
<p class="quiz__exp" hidden>Дыру можно мысленно закрыть одной гранью-многоугольником: <i>F</i> растет на 1, <i>V</i> и <i>E</i> не меняются. Две такие заплаты возвращают сумму 2. Проверите на task 2-3.</p>
</div>
<div class="quiz__q">
<p>2. Модель <code>flipped.stl</code> прошла оба теста. Исправна ли она?</p>
<label><input type="radio"> Да: оба теста пройдены, значит, дефектов нет.</label>
<label><input type="radio" data-ok> Не обязательно: тесты считают количества и не видят, в какую сторону обходятся грани.</label>
<label><input type="radio"> Нет: прохождение обоих тестов само по себе признак дефекта.</label>
<p class="quiz__exp" hidden>Тесты необходимые, но не достаточные. Перевернутые грани меняют порядок вершин, а не их число. Проверите на task 2-4.</p>
</div>
<div class="quiz__q">
<p>3. Для <code>two_cubes.stl</code> сумма равна 3, хотя тел два. Какой дефект вероятнее всего?</p>
<label><input type="radio" data-ok> Кубы касаются по ребру: после слияния вершин у них общие вершины и общее ребро.</label>
<label><input type="radio"> В одном из кубов есть дыра.</label>
<label><input type="radio"> У одного куба перевернуты все грани.</label>
<p class="quiz__exp" hidden>Два отдельных куба дали бы 2 + 2 = 4. Общие вершины уменьшают <i>V</i>, а общее ребро считается один раз. Проверите на task 2-3.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В папке `pipeline_2` создайте папку `task_2_2` и переместите в нее программы этой страницы: <span class="task__file">task\_2-2\_1.py</span>, <span class="task__file">task\_2-2\_2.py</span> и <span class="task__file">task\_2-2\_euler.py</span>.
1. Скопируйте в `task_2_2` модули, которые импортируют программы: `mesh_index.py` и `stl_io.py`. Так папка запускается сама по себе.
1. Рабочие копии модулей и модели `.stl` оставьте в `mesh_work`: они нужны на следующих страницах.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_2/
    ├── task_2_1/
    └── @@task_2_2/@@
        ├── mesh_index.py
        ├── stl_io.py
        ├── task_2-2_1.py
        ├── task_2-2_2.py
        └── task_2-2_euler.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 2 (слайды 26–27) и блок 4 (слайд 56).
1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — Fig. 17.2, p. 495, 509.
1. Botsch M. et al. Polygon Mesh Processing. A K Peters, 2010 — p. 10–13, 22–23.
1. Attene M. et al. Polygon Mesh Repairing: An Application Perspective. ACM Computing Surveys, 2013 — p. 15:6.
{: .sources__list}

</section>
