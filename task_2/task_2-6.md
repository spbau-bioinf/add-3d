---
work: 2
code: "task 2-6"
title: "Ремонт, упрощение и сглаживание в trimesh"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Все проверки предыдущих страниц вы написали сами, и теперь знаете, что они считают. В работе те же проверки берут из библиотек. На этой странице используется [trimesh](https://trimesh.org/) — библиотека Python для загрузки, проверки и обработки треугольных сеток. Она читает форматы STL (от stereolithography, стереолитография), OBJ (формат компании Wavefront), PLY (Polygon File Format) и 3MF (3D Manufacturing Format), сама сливает вершины, проверяет замкнутость и ориентацию, умеет ремонтировать, упрощать и сглаживать сетку.

Библиотека не отменяет понимания. Каждая ее функция делает ровно то, что написано в документации, и не больше: вы увидите, что стандартный ремонт закрывает не всякую дыру, упрощение сдвигает поверхность, а сглаживание уменьшает объем.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- сверять свои проверки с проверками trimesh;
- применять функции ремонта и понимать их ограничения;
- упрощать сетку с контролем отклонения;
- компенсировать усадку после сглаживания и сохранять модель в 3MF.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Задания 1 и 2 выполняются на второй встрече и занимают около 20 минут. Итоговое задание (около 20 минут) выполняется самостоятельно после 2 практики по данной теме. Нужна библиотека trimesh 5.1.0 с дополнительными пакетами (команда установки на странице [task 2](task_2.html)).

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Проверка в trimesh
{: .subsection__title}

<article class="example" markdown="1">

### Пример 1. Свойства сетки
{: .example__title}

Файл `task_2-6_example_1.py`:

```python
import trimesh

m = trimesh.load("finger.stl")
print("Граней:", len(m.faces), "| вершин после слияния:", len(m.vertices))
print("Замкнута:", m.is_watertight, "| ориентация согласована:", m.is_winding_consistent)
print("V - E + F:", m.euler_number, "| тел:", m.body_count)
print(f"Объем: {m.volume:.2f} мм³ | габариты: {m.extents.round(2)}")
```

```text
Граней: 1104 | вершин после слияния: 554
Замкнута: True | ориентация согласована: True
V - E + F: 2 | тел: 1
Объем: 2045.39 мм³ | габариты: [ 8.63  8.63 40.  ]
```
{: .output data-label="Вывод"}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `trimesh.load` читает файл и сразу сливает совпадающие вершины: 554 вершины, как у вашей `index_mesh` на [task 2-2](task_2-2.html).
- `is_watertight` проверяет, что у каждого ребра ровно две грани ([task 2-3](task_2-3.html)); `is_winding_consistent` проверяет направление обхода общих ребер ([task 2-4](task_2-4.html)).
- `euler_number` — это *V* − *E* + *F*, `body_count` — число оболочек ([task 2-5](task_2-5.html)), `volume` — объем, `extents` — габариты.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Сверка с trimesh <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-6\_1.py</span>
{: .task__meta}

Для шести моделей из требуемого вывода напечатайте свойства из trimesh в том же формате.

```text
finger.stl     замкнута=True  ориентация=True  V-E+F= 2 тел=1
ring.stl       замкнута=True  ориентация=True  V-E+F= 0 тел=1
holed.stl      замкнута=False ориентация=True  V-E+F= 0 тел=1
flipped.stl    замкнута=True  ориентация=False V-E+F= 2 тел=1
two_cubes.stl  замкнута=False ориентация=True  V-E+F= 3 тел=1
shells.stl     замкнута=False ориентация=True  V-E+F= 8 тел=5
```
{: .output data-label="Требуемый вывод"}

Сравните таблицу со своими результатами на страницах task 2-2 … task 2-5.

<div class="quiz" data-file="task_2-6_1.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-6_1.py</code>.</p>
<div class="quiz__q">
<p>1. Для каких моделей trimesh и ваши программы со страниц task 2-2 … task 2-5 согласны?</p>
<label><input type="radio" data-ok> Для всех шести: «замкнута» совпадает с отсутствием краевых и сингулярных ребер, «ориентация» — с нулем ребер, пройденных в одну сторону, «тел» — с числом оболочек.</label>
<label><input type="radio"> Только для замкнутых моделей <code>finger.stl</code> и <code>ring.stl</code>.</label>
<label><input type="radio"> Ни для одной: trimesh считает свойства по геометрии, а ваши программы — по связности.</label>
<p class="quiz__exp" hidden>Обе стороны считают одно и то же: связность индексированной сетки. Поэтому и числа <i>V</i> − <i>E</i> + <i>F</i> совпадают.</p>
</div>
<div class="quiz__q">
<p>2. Почему для <code>two_cubes.stl</code> trimesh показывает одно тело?</p>
<label><input type="radio" data-ok> Кубы связаны общими вершинами сингулярного ребра, а тела считаются по связности граней, как у функции <code>shells</code>.</label>
<label><input type="radio"> trimesh объединяет тела, расстояние между которыми меньше допуска.</label>
<label><input type="radio"> Один из кубов trimesh отбрасывает как незамкнутый.</label>
<p class="quiz__exp" hidden>Подсчет по связности не отличает два касающихся тела от одного: для этого нужна геометрия или ручная проверка.</p>
</div>
<div class="quiz__q">
<p>3. Одна часть поверхности проходит сквозь другую, но у каждого ребра ровно две согласованные грани. Какие проверки занятия она пройдет?</p>
<label><input type="radio" data-ok> Все: и ваши, и trimesh считают связность, а самопересечение видно только при поиске пересекающихся пар граней.</label>
<label><input type="radio"> Никакие: самопересечение дает сингулярные ребра.</label>
<label><input type="radio"> Только формулу Эйлера: объем со знаком станет отрицательным.</label>
<p class="quiz__exp" hidden>Самопересечения — четвертый главный дефект из лекции, и находится он не подсчетом, а геометрической проверкой пар граней.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Ремонт и его пределы
{: .subsection__title}

<article class="example" markdown="1">

### Пример 2. Три функции ремонта
{: .example__title}

Файл `task_2-6_example_2.py`:

```python
import trimesh

holed = trimesh.load("holed.stl")
ok = trimesh.repair.fill_holes(holed)
print("fill_holes:", ok, "| граней:", len(holed.faces), "| замкнута:", holed.is_watertight)

flipped = trimesh.load("flipped.stl")
trimesh.repair.fix_normals(flipped)
print("fix_normals: ориентация", flipped.is_winding_consistent, f"| объем {flipped.volume:.2f}")

parts = trimesh.load("shells.stl").split(only_watertight=False)
main = max(parts, key=lambda p: len(p.faces))
print("split: оболочек", len(parts), "| в крупнейшей граней", len(main.faces))
```

```text
fill_holes: False | граней: 1098 | замкнута: False
fix_normals: ориентация True | объем 2045.39
split: оболочек 5 | в крупнейшей граней 1104
```
{: .output data-label="Вывод"}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `fill_holes` добавила одну грань, закрыв треугольную дыру, и вернула `False`: дыру из 6 ребер она не закрыла. По умолчанию функция закрывает только дыры из 3 и 4 ребер (trimesh 5.1.0, справка `trimesh.repair.fill_holes`). Это локальный ремонт без гарантий, как и описано в лекции. Большую дыру в [task 2-7](task_2-7.html) вы закроете сами.
- `fix_normals` делает то же, что ваша `task_2-4_fix.py`: согласует ориентацию и поворачивает сетку нормалями наружу. Объем совпал с объемом исходной фаланги.
- `split(only_watertight=False)` делит сетку на оболочки; с `only_watertight=True` незамкнутые оболочки были бы отброшены без предупреждения.

</div>

</article>

</section>

<!-- ===================== 3 ===================== -->

<section class="subsection" id="s3" markdown="1">

## <span class="subsection__num">3.</span> Упрощение с контролем отклонения
{: .subsection__title}

Упрощение схлопывает ребра: каждое схлопывание убирает 1 вершину, 3 ребра и 2 треугольника. Первыми схлопываются «дешевые» ребра, стоимость которых оценивает квадрика ошибки. В trimesh это делает `simplify_quadric_decimation(face_count=N)`.

Упрощение сдвигает поверхность, поэтому после него оценивают отклонение от исходной модели. Практический способ: взять тысячи случайных точек на одной поверхности (`sample`), найти расстояние от каждой до другой поверхности (`trimesh.proximity.signed_distance`) и взять наибольшее по модулю. Это выборочная оценка наибольшего отклонения, а не точное значение: точка с самым большим отклонением может не попасть в выборку. Измерять нужно в обе стороны: от упрощенной к исходной и от исходной к упрощенной (Cignoni et al., 1998). Допустимое отклонение, как и допуск тесселяции, берут меньше разрешения машины; на этом занятии 0,05 мм.

<article class="task" id="task-2" markdown="1">

### Задание 2. Сколько граней достаточно <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_2-6\_2.py</span>
{: .task__meta}

Упростите `finger.stl` до 800, 600, 400 и 200 граней. Для каждого варианта оцените отклонение в обе стороны по 5000 точкам (`sample(5000, seed=1)`), напечатайте наибольшее из двух и проверьте, осталась ли сетка замкнутой.

```text
граней  800: отклонение 0.020 мм, замкнута True
граней  600: отклонение 0.045 мм, замкнута True
граней  400: отклонение 0.090 мм, замкнута True
граней  200: отклонение 0.131 мм, замкнута True
```
{: .output data-label="Требуемый вывод"}

Отклонение зависит от случайных точек и версии библиотеки, поэтому ваши числа могут отличаться на несколько тысячных. Запишите комментарием в конце программы свои отклонения для 800 и 400 граней и их отношение.

<div class="quiz" data-file="task_2-6_2.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-6_2.py</code>.</p>
<div class="quiz__q">
<p>1. Какой из четырех проверенных вариантов с наименьшим числом граней укладывается в допуск 0,05 мм?</p>
<label><input type="radio"> 800 граней</label>
<label><input type="radio" data-ok> 600 граней</label>
<label><input type="radio"> 400 граней</label>
<p class="quiz__exp" hidden>Отклонение 0,045 мм при 600 гранях еще меньше 0,05 мм, при 400 гранях оно уже 0,090 мм. Ответ верен только для этой модели, этого алгоритма упрощения и этой выборочной оценки.</p>
</div>
<div class="quiz__q">
<p>2. Во сколько раз закон ошибка ∝ 1/<i>F</i> из лекции предсказывает рост отклонения при переходе от 800 к 400 граням?</p>
<label><input type="radio" data-ok> В 2 раза</label>
<label><input type="radio"> В 4 раза</label>
<label><input type="radio"> В √2 раза</label>
<p class="quiz__exp" hidden>Граней вдвое меньше — ошибка вдвое больше. По эталонному запуску отклонение выросло в 0,090 / 0,020 = 4,5 раза.</p>
</div>
<div class="quiz__q">
<p>3. Почему упрощение расходится с этим законом?</p>
<label><input type="radio" data-ok> Закон описывает равномерное измельчение всех ребер, а упрощение убирает ребра неравномерно, сначала самые дешевые.</label>
<label><input type="radio"> Отклонение оценено по случайным точкам, поэтому закон проверить нельзя.</label>
<label><input type="radio"> trimesh округляет координаты при упрощении.</label>
<p class="quiz__exp" hidden>Пока схлопываются ребра на плоских участках, ошибка растет медленно; когда очередь доходит до изогнутых, она растет быстрее, чем предсказывает закон для равномерной сетки.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== 4 ===================== -->

<section class="subsection" id="s4" markdown="1">

## <span class="subsection__num">4.</span> Сглаживание и усадка
{: .subsection__title}

Лапласово сглаживание сдвигает каждую вершину к центру ее соседей и подавляет шум сканирования. Цена сглаживания — усадка: объем модели уменьшается. Лекция предлагает компенсацию масштабированием к исходному объему:

<div class="formula"><i>β</i> = ∛(<i>V</i><sub>0</sub> / <i>V</i><sub><i>n</i></sub>)</div>
<dl class="where">
<div><dt>где <i>β</i></dt><dd>коэффициент масштабирования по всем трем осям</dd></div>
<div><dt><i>V</i><sub>0</sub></dt><dd>объем до сглаживания, мм³ (<a href="task_2-4.html">task 2-4</a>, раздел 2)</dd></div>
<div><dt><i>V</i><sub><i>n</i></sub></dt><dd>объем после <i>n</i> шагов сглаживания, мм³</dd></div>
</dl>

Масштабирование в *β* раз по всем осям умножает объем на *β*³ = *V*₀ / *V*ₙ.

В trimesh сглаживание выполняет `trimesh.smoothing.filter_laplacian(mesh, lamb=0.5, iterations=10)`. По умолчанию у нее включен параметр `volume_constraint=True`: функция сама возвращает объем масштабированием после каждого шага (trimesh 5.1.0, справка `trimesh.smoothing.filter_laplacian`). Чтобы увидеть усадку и компенсировать ее самостоятельно, передайте `volume_constraint=False`.

Ниже плоский аналог того же процесса: контур скана круга диаметром 20 мм с шумом около 0,35 мм. Двигайте ползунок и следите, как шум уменьшается, а площадь падает; затем включите компенсацию. В плоскости масштаб считается по площади:

<div class="formula"><i>β</i> = √(<i>A</i><sub>0</sub> / <i>A</i><sub><i>n</i></sub>)</div>
<dl class="where">
<div><dt>где <i>A</i><sub>0</sub>, <i>A</i><sub><i>n</i></sub></dt><dd>площадь контура до сглаживания и после <i>n</i> шагов, мм²</dd></div>
</dl>

{% include smooth-demo.html %}

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: сглаживание скана без потери объема <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_2-6\_smooth.py</span>
{: .task__meta}

**Ситуация.** Скан шарика диаметром 20 мм получился шумным: неровности около 0,25 мм. Шум нужно убрать, а размер сохранить: по модели будут проверять точность печати.

- [scan_sphere.stl](../assets/files/scan_sphere.stl){: .files__link}
{: .files}

**Требования:**

1. Программа сглаживает `scan_sphere.stl`: `lamb=0.5`, `iterations=10`, `volume_constraint=False`.
1. Вычисляет *β*, масштабирует модель относительно ее центра масс (`center_mass`): сдвиг центра в начало координат, `apply_scale(beta)`, сдвиг обратно.
1. Сохраняет результат в `scan_smooth.3mf`, читает этот файл заново (`trimesh.load` с параметром `force="mesh"`) и печатает число граней и объем.

```text
Объем скана: 4168.3 мм³
После сглаживания: 3993.8 мм³ (-4.2 %)
beta = 1.0144, объем после масштабирования: 4168.3 мм³
3MF: граней 5120, объем 4168.3 мм³
```
{: .output data-label="Требуемый вывод"}

Откройте `scan_smooth.3mf` как ZIP-архив (например, переименуйте копию в `.zip`) и найдите в файле `3D/3dmodel.model` атрибут `unit`. trimesh записывает туда `millimeter` всегда, в каких бы единицах ни были координаты (trimesh 5.1.0, модуль `trimesh/exchange/threemf.py`). Атрибут — это обещание того, кто создал файл, а не свойство самих чисел. Здесь обещание верно, потому что скан в миллиметрах.

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Просмотрщик сеток не читает 3MF, поэтому файл проверяется повторным чтением в программе и просмотром архива. Совпадение показывает, что в файл попала сглаженная и масштабированная сетка в миллиметрах.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Граней после чтения | 5120 | файл записан из другой сетки или прочитан без `force="mesh"` |
| Объем, мм³ | 4168,3 | масштаб не применен к вершинам или применен относительно начала координат, а не центра масс |
| Атрибут `unit` в `3D/3dmodel.model` | `millimeter` | открыт не тот файл архива |

</div>

<div class="quiz" data-file="task_2-6_smooth.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-6_smooth.py</code>.</p>
<div class="quiz__q">
<p>1. Кто отвечает за правильность атрибута <code>unit</code> в 3MF?</p>
<label><input type="radio" data-ok> Программа или человек, который создал файл.</label>
<label><input type="radio"> Формат 3MF: он проверяет единицы сам.</label>
<label><input type="radio"> Слайсер, который открывает файл.</label>
<p class="quiz__exp" hidden>trimesh пишет <code>millimeter</code> всегда. Верность атрибута зависит от того, в каких единицах были координаты при записи.</p>
</div>
<div class="quiz__q">
<p>2. Что было бы, если бы кольцо <code>ring.stl</code> сохранили в 3MF так же, без пересчета дюймов?</p>
<label><input type="radio" data-ok> Слайсер прочел бы его в миллиметрах, и кольцо стало бы в 25,4 раза меньше.</label>
<label><input type="radio"> trimesh пересчитал бы дюймы в миллиметры автоматически.</label>
<label><input type="radio"> Ничего: 3MF хранит единицы исходного файла.</label>
<p class="quiz__exp" hidden>Атрибут <code>millimeter</code> закрепил бы ошибку единиц: кольцо 1,42 × 1,42 × 0,32 мм вместо 36,1 × 36,1 × 8,1 мм.</p>
</div>
<div class="quiz__q">
<p>3. Почему масштабирование возвращает объем, но не точную форму?</p>
<label><input type="radio" data-ok> Сглаживание сдвигает вершины неравномерно, а масштаб одинаков по всем направлениям.</label>
<label><input type="radio"> Масштабирование меняет число граней.</label>
<label><input type="radio"> Объем после масштабирования восстанавливается только приближенно.</label>
<p class="quiz__exp" hidden>Сильнее всего сглаживание сдвигает выступы шума и изогнутые места. Общий масштаб возвращает объем, но не возвращает каждую вершину на место.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В папке `pipeline_2` создайте папку `task_2_6` и переместите в нее программы этой страницы: <span class="task__file">task\_2-6\_1.py</span>, <span class="task__file">task\_2-6\_2.py</span> и <span class="task__file">task\_2-6\_smooth.py</span>.
1. Файлы `.3mf`, которые создают программы, не переносите: они создаются заново.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_2/
    ├── task_2_1/
    ├── task_2_2/
    ├── task_2_3/
    ├── task_2_4/
    ├── task_2_5/
    └── @@task_2_6/@@
        ├── task_2-6_1.py
        ├── task_2-6_2.py
        └── task_2-6_smooth.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 3 (слайд 43), блок 4 (слайд 57) и блок 5 (слайды 64–69).
1. Garland M., Heckbert P. S. Surface Simplification Using Quadric Error Metrics — разд. 3–5, Fig. 1.
1. Desbrun M. et al. Implicit Fairing of Irregular Meshes using Diffusion and Curvature Flow, 1999 — p. 318–321.
1. Botsch M. et al. Polygon Mesh Processing. A K Peters, 2010 — p. 49, 55–57, 111–118.
1. Документация trimesh 5.1.0: `trimesh.repair.fill_holes`, `trimesh.smoothing.filter_laplacian`, `trimesh.proximity.signed_distance`, [trimesh.org](https://trimesh.org/). Измерение отклонения в обе стороны по случайным точкам: Cignoni P., Rocchini C., Scopigno R. Metro: measuring error on simplified surfaces // Computer Graphics Forum, 1998, 17(2), p. 167–174.
{: .sources__list}

</section>
