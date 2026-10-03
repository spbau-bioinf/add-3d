---
work: 2
code: "task 2-4"
title: "Ориентация граней и объем"
pymods: "stl_io.py,mesh_index.py,mesh_checks.py"
pyfiles: "pyramid.stl,finger.stl,flipped.stl,two_cubes.stl"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Порядок вершин грани задает ее сторону: если вершины идут против часовой стрелки при взгляде снаружи, нормаль смотрит наружу. У исправной сетки все грани повернуты наружу согласованно. Перевернутая грань смотрит внутрь, и слайсер получает в этом месте вывернутое сечение, которое выглядит как дыра.

Перевернутые грани не меняют ни числа вершин, ни числа ребер, поэтому модель `flipped.stl` прошла оба экспресс-теста на [task 2-2](task_2-2.html). Найти их можно по направлению обхода общих ребер, а заметить по объему модели.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- вычислять объем замкнутой сетки со знаком;
- проверять согласованность ориентации по направлению обхода ребер;
- исправлять ориентацию, распространяя ее от грани к соседям.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Страница выполняется на второй практике по данной теме: задания 1 и 2 занимают около 15 минут, итоговое задание — около 25 минут.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Согласованный обход
{: .subsection__title}

<figure class="diagram">
<svg role="img" viewBox="0 0 640 210">
<title>Слева две согласованные грани обходят общее ребро в разные стороны; справа перевернутая грань обходит его в ту же сторону, что соседняя.</title>
<defs><marker id="ah24" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="d-arrowhead" d="M0,0 L10,5 L0,10 z"></path></marker></defs>
<polygon class="d-mface" points="40,100 200,100 120,20"></polygon>
<polygon class="d-mface d-mface--alt" points="40,100 200,100 120,180"></polygon>
<path class="d-arrow" d="M70,90 L170,90" marker-end="url(#ah24)"></path>
<path class="d-arrow" d="M170,112 L70,112" marker-end="url(#ah24)"></path>
<text class="d-text d-text--small" x="120" y="65" text-anchor="middle">u → v</text>
<text class="d-text d-text--small" x="120" y="140" text-anchor="middle">v → u</text>
<text class="d-text" x="120" y="205" text-anchor="middle">согласованы</text>
<polygon class="d-mface" points="400,100 560,100 480,20"></polygon>
<polygon class="d-mface d-mface--bad" points="400,100 560,100 480,180"></polygon>
<path class="d-arrow" d="M430,90 L530,90" marker-end="url(#ah24)"></path>
<path class="d-arrow" d="M430,112 L530,112" marker-end="url(#ah24)"></path>
<text class="d-text d-text--small" x="480" y="65" text-anchor="middle">u → v</text>
<text class="d-text d-text--small" x="480" y="140" text-anchor="middle">u → v</text>
<text class="d-text" x="480" y="205" text-anchor="middle">одна из граней перевернута</text>
</svg>
<figcaption class="diagram__caption">Адаптировано по Attene M. et al., 2013, п. 3.2.2 (p. 15:7); Gibson I. et al., 2021, p. 494; лекция 3, слайды 53, 56.</figcaption>
</figure>

{% include anim-orient.html %}

Обойдем вершины двух соседних граней в записанном порядке. Если обе грани повернуты наружу, общее ребро они проходят в разные стороны: одна от *u* к *v*, другая от *v* к *u*. Если направление совпало, одна из граней перевернута. Какая именно, по одному ребру сказать нельзя: для этого нужна договоренность, какая грань считается правильной.

Правило работает для ребер, у которых ровно две грани. У сингулярного ребра граней больше, и даже при правильной ориентации две из них проходят его в одну сторону: так у двух кубов из [task 2-3](task_2-3.html). Поэтому при подсчете такие ребра пропускают.

Записанная в STL (от stereolithography, стереолитография) нормаль здесь не помогает. Программа экспорта обычно вычисляет ее по тем же вершинам, поэтому у перевернутой грани и нормаль смотрит внутрь. В файле `flipped.stl` так и есть: каждая нормаль согласована со своей гранью, а грани между собой нет.


</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Объем со знаком
{: .subsection__title}

Соединим каждую грань с началом координат: получится тетраэдр. Сумма объемов таких тетраэдров со знаком:

<div class="formula"><i>V</i> = Σ <b>a</b> · (<b>b</b> × <b>c</b>) / 6</div>
<dl class="where">
<div><dt>где <i>V</i></dt><dd>объем со знаком, мм³</dd></div>
<div><dt><b>a</b>, <b>b</b>, <b>c</b></dt><dd>векторы координат вершин грани в записанном порядке, мм (<a href="task_2-1.html">task 2-1</a>, раздел 3)</dd></div>
<div><dt>· и ×</dt><dd>скалярное и векторное произведения; Σ — сумма по всем граням</dd></div>
</dl>

Для замкнутой согласованной сетки сумма по всем граням дает объем тела; части тетраэдров снаружи тела входят в сумму с разными знаками и сокращаются (Zhang, Chen, 2001).

Для замкнутой согласованной сетки результат не зависит от того, где находится начало координат: сдвиг модели меняет объемы отдельных тетраэдров, но не их сумму. Знак суммы говорит об ориентации: положительный объем означает, что нормали смотрят наружу, отрицательный, что сетка вывернута целиком. Если перевернута только часть граней, сумма перестает быть объемом тела и начинает зависеть от положения начала координат, а знак может остаться прежним.

<article class="example" markdown="1">

### Пример 1. Объем пирамиды
{: .example__title}

Скачайте файл и сохраните его в рабочую папку, если еще не сделали этого на [task 2-2](task_2-2.html).

- [flipped.stl](../assets/files/flipped.stl){: .files__link}
{: .files}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh


def signed_volume(verts, faces):
    """Объем со знаком: сумма объемов тетраэдров (начало координат, грань)."""
    vol = 0.0
    for i, j, k in faces:
        a, b, c = verts[i], verts[j], verts[k]
        vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
                - a[1] * (b[0] * c[2] - b[2] * c[0])
                + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    return vol


verts, faces = index_mesh(read_stl("pyramid.stl"))
print(f"Пирамида: {signed_volume(verts, faces):.4f}")
inside_out = [(a, c, b) for a, b, c in faces]     # обход всех граней в обратную сторону
print(f"Вывернутая пирамида: {signed_volume(verts, inside_out):.4f}")
{% endcapture %}{% capture expected %}
Пирамида: 0.1667
Вывернутая пирамида: -0.1667
{% endcapture %}{% include pyrun.html file="task_2-4_example.py" code=code expected=expected %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- Выражение в скобках — это определитель матрицы из координат **a**, **b**, **c**, записанный по первой строке. Он равен **a** · (**b** × **c**).
- Объем пирамиды с ребрами 1 по осям равен 1/6 ≈ 0,1667, как и должно быть.
- Функция работает с индексированной сеткой: `verts[i]` дает координаты вершины по ее номеру.
- Тройка `(a, c, b)` меняет порядок обхода грани на обратный. Если так поступить со всеми гранями, объем меняет знак.
- Перенесите функцию `signed_volume` в `mesh_checks.py`: она нужна в заданиях этой страницы и в [task 2-7](task_2-7.html). В окнах запуска она уже есть во вшитом `mesh_checks.py`.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Что объем знает о пяти гранях <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-4\_1.py</span>
{: .task__meta}

Вычислите объем со знаком для моделей `finger.stl` и `flipped.stl` функцией `signed_volume` из `mesh_checks.py`.

```text
finger.stl: объем 2045.39 мм³
flipped.stl: объем 1793.57 мм³
```
{: .output data-label="Требуемый вывод"}

В `flipped.stl` перевернуто только 5 граней из 1104.

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import signed_volume

for name in ("finger.stl", "flipped.stl"):
    verts, faces = index_mesh(read_stl(name))
    vol = 0.0   # замените 0.0 на объем со знаком
    print(f"{name}: объем {vol:.2f} мм³")
{% endcapture %}{% capture expected %}
finger.stl: объем 2045.39 мм³
flipped.stl: объем 1793.57 мм³
{% endcapture %}{% include pyrun.html file="task_2-4_1.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-4_1.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-4_1.py</code>.</p>
<div class="quiz__q">
<p>Почему объем <code>flipped.stl</code> (1793,57 мм³) так отличается от 2045,39 мм³, хотя перевернуто 5 граней из 1104?</p>
<label><input type="radio" data-ok> Перевернутые грани дают тетраэдры с обратным знаком. Сумма перестает быть независимой от начала координат, а модель далеко от него (минимум 55,68; 45,68 из task 2-1).</label>
<label><input type="radio"> Пять граней при чтении удалены из модели, и объем уменьшился на их долю.</label>
<label><input type="radio"> Объем со знаком всегда зависит от положения начала координат.</label>
<p class="quiz__exp" hidden>У замкнутой согласованной сетки вклады тетраэдров снаружи тела сокращаются. У перевернутой грани тетраэдр до начала координат длинный, и ошибка знака дает большой вклад.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Ребра, пройденные в одну сторону <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файлы: <span class="task__file">task\_2-4\_2.py</span>, функция `same_direction` в <span class="task__file">mesh\_checks.py</span>
{: .task__meta}

Добавьте в `mesh_checks.py` функцию `same_direction(faces)`. Она обходит стороны всех граней как упорядоченные пары (*u*, *v*) в порядке записи вершин и возвращает, сколько раз пара встречается повторно, то есть ребро пройдено в ту же сторону, что у соседа. Ребра, у которых больше двух граней, не учитываются: у сингулярного ребра две пары граней проходят его в каждую сторону даже при правильной ориентации (проверьте на `two_cubes.stl`, должно получиться 0). Программа `task_2-4_2.py` применяет функцию к `flipped.stl`.

```text
Ребер, которые соседи обходят в одну сторону: 7
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import edge_faces


def same_direction(faces):
    """Сколько раз упорядоченная пара (u, v) встречается повторно.

    Ребра, у которых больше двух граней, не учитываются.
    """
    return 0


verts, faces = index_mesh(read_stl("flipped.stl"))
print("Ребер, которые соседи обходят в одну сторону:", same_direction(faces))
{% endcapture %}{% capture expected %}
Ребер, которые соседи обходят в одну сторону: 7
{% endcapture %}{% include pyrun.html file="task_2-4_2.py" code=code expected=expected note="В окне функция <code>same_direction</code> стоит в программе; в файле для сдачи перенесите ее в <code>mesh_checks.py</code>. Проверка: для <code>two_cubes.stl</code> функция возвращает 0." %}

<div class="quiz" data-file="task_2-4_2.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-4_2.py</code>.</p>
<div class="quiz__q">
<p>Почему таких ребер 7, а не 5 × 3 = 15?</p>
<label><input type="radio" data-ok> Пять перевернутых граней соседние: общее ребро двух перевернутых граней они проходят в разные стороны, и ошибки на нем нет.</label>
<label><input type="radio"> Часть ребер функция считает дважды и потом делит пополам.</label>
<label><input type="radio"> У перевернутой грани проверяются только два ребра из трех.</label>
<p class="quiz__exp" hidden>Ошибку дает только граница заплатки из перевернутых граней: снаружи от нее грани правильные, внутри — перевернутые, но согласованные между собой.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

Когда задание 2 решено, сверьте результат в просмотрщике: янтарным отмечены грани, которые пришлось бы развернуть, чтобы согласовать их с первой гранью. Откройте `flipped.stl`, найдите заплатку из 5 граней, затем на `finger.stl` в режиме «развернуть грань» переверните одну грань сами. Сколько ребер стало пройдено в одну сторону и как изменился объем со знаком?

{% include mesh-viewer.html presets="finger,flipped" default="flipped" %}

</section>

<!-- ===================== 3 ===================== -->

<section class="subsection" id="s3" markdown="1">

## <span class="subsection__num">3.</span> Как исправить ориентацию
{: .subsection__title}

<ol aria-label="Исправление ориентации" class="flow">
<li class="flow__step"><span class="flow__title">Опорная грань</span><span class="flow__text">первую грань считаем правильной</span></li>
<li class="flow__step"><span class="flow__title">Обход соседей</span><span class="flow__text">сосед идет по общему ребру в ту же сторону → развернуть</span></li>
<li class="flow__step"><span class="flow__title">Очередь</span><span class="flow__text">каждая грань проверяется один раз</span></li>
<li class="flow__step"><span class="flow__title">Знак объема</span><span class="flow__text">если объем отрицательный, развернуть все грани</span></li>
</ol>

После обхода все грани согласованы с опорной, но опорная сама могла смотреть внутрь. Последний шаг решает это по знаку объема. Для обхода нужен словарь «ребро → грани этого ребра»; он строится одним проходом по граням, как на [task 2-3](task_2-3.html).

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: исправление ориентации <span class="level level--5">Уровень 5 · итоговое</span>

Файлы: <span class="task__file">task\_2-4\_fix.py</span>, функция `fix_orientation` в <span class="task__file">mesh\_checks.py</span>
{: .task__meta}

**Ситуация.** Слайсер открыл `flipped.stl` без ошибок, но в предпросмотре слоев на боковой стороне фаланги виден разрыв контура. Модель нужно исправить до печати, не трогая координаты вершин.

**Требования:**

1. Добавьте в `mesh_checks.py` функцию `fix_orientation(verts, faces)`. Она исправляет ориентацию по схеме из раздела 3 (сосед разворачивается перестановкой двух его вершин) и возвращает пару: новый список граней и число развернутых граней.
1. Программа `task_2-4_fix.py` печатает число ребер, пройденных в одну сторону, до исправления, вызывает `fix_orientation` и записывает исправленные грани функцией `write_stl` в файл `flipped_fixed.stl`.
1. Затем программа читает `flipped_fixed.stl` заново и печатает число ребер, пройденных в одну сторону, после исправления. Число развернутых граней берется из результата `fix_orientation`, а объем считается по перечитанному файлу.

```text
До: ребер с одним направлением обхода 7
После: ребер с одним направлением обхода 0
Развернуто граней: 5
Объем: 2045.39 мм³
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl, write_stl
from mesh_index import index_mesh
from mesh_checks import signed_volume


def same_direction(faces):
    return 0   # вставьте функцию из задания 2


def fix_orientation(verts, faces):
    """Согласует ориентацию граней по разделу 3; возвращает (новые грани, число развернутых)."""
    return list(faces), 0


verts, faces = index_mesh(read_stl("flipped.stl"))
print("До: ребер с одним направлением обхода", same_direction(faces))
fixed, n = fix_orientation(verts, faces)
write_stl("flipped_fixed.stl", [[verts[i] for i in f] for f in fixed])
# прочитайте flipped_fixed.stl заново и допишите три строки требуемого вывода
{% endcapture %}{% capture expected %}
До: ребер с одним направлением обхода 7
После: ребер с одним направлением обхода 0
Развернуто граней: 5
Объем: 2045.39 мм³
{% endcapture %}{% include pyrun.html file="task_2-4_fix.py" code=code expected=expected note="В окне функции стоят в программе; в файле для сдачи перенесите их в <code>mesh_checks.py</code>. Файл <code>flipped_fixed.stl</code>, записанный в окне, можно скачать кнопкой под выводом и открыть в просмотрщике выше." %}

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Откройте `flipped_fixed.stl` в просмотрщике кнопкой загрузки файла. Совпадение показывает, что исправлена только ориентация: координаты и связность остались прежними.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Ребер с одним направлением | 0 | обход не дошел до части граней: каждая проверенная соседняя грань должна попасть в очередь |
| V, E, F | 554, 1656, 1104 | в файл записан другой список граней, например исходный |
| Объем со знаком | 2&nbsp;045,39 | отрицательный объем: опорная грань была перевернута, а общий разворот по знаку объема не выполнен |

</div>

<div class="quiz" data-file="task_2-4_fix.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-4_fix.py</code>.</p>
<div class="quiz__q">
<p>1. Почему объем исправленной модели совпал с объемом <code>finger.stl</code>?</p>
<label><input type="radio" data-ok> Порядок вершин пяти граней восстановлен, а координаты не менялись.</label>
<label><input type="radio"> Программа копирует объем из <code>finger.stl</code>.</label>
<label><input type="radio"> Объем со знаком не зависит от ориентации граней.</label>
<p class="quiz__exp" hidden><code>flipped.stl</code> отличается от <code>finger.stl</code> только порядком вершин пяти граней; после исправления сетки совпадают.</p>
</div>
<div class="quiz__q">
<p>2. Что было бы, если бы опорной оказалась одна из перевернутых граней?</p>
<label><input type="radio" data-ok> Развернутыми оказались бы все остальные грани; сетка согласована, но объем отрицательный, и последний шаг разворачивает все грани.</label>
<label><input type="radio"> Алгоритм остановился бы с ошибкой.</label>
<label><input type="radio"> Ничего: результат обхода не зависит от опорной грани.</label>
<p class="quiz__exp" hidden>Обход согласует все грани с опорной. Знак объема — единственная проверка, которая говорит, смотрят ли нормали наружу.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В папке `pipeline_2` создайте папку `task_2_4` и переместите в нее программы этой страницы: <span class="task__file">task\_2-4\_1.py</span>, <span class="task__file">task\_2-4\_2.py</span> и <span class="task__file">task\_2-4\_fix.py</span>.
1. Скопируйте в `task_2_4` модули, которые импортируют программы: `mesh_checks.py`, `mesh_index.py` и `stl_io.py`. Так папка запускается сама по себе.
1. Рабочие копии модулей и модели `.stl` оставьте в `mesh_work`: они нужны на следующих страницах. Файл `mesh_checks.py` в рабочей папке продолжайте пополнять; в папку страницы кладется его копия на момент сдачи.
1. Файл `.stl` с исправленной сеткой не переносите: программа создает его заново.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_2/
    ├── task_2_1/
    ├── task_2_2/
    ├── task_2_3/
    └── @@task_2_4/@@
        ├── mesh_checks.py
        ├── mesh_index.py
        ├── stl_io.py
        ├── task_2-4_1.py
        ├── task_2-4_2.py
        └── task_2-4_fix.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 3 (слайд 38) и блок 4 (слайды 53, 55–56).
1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — Fig. 17.2, p. 494–495, 509–510.
1. Attene M. et al. Polygon Mesh Repairing: An Application Perspective. ACM Computing Surveys, 2013 — p. 15:6–15:9.
1. Zhang C., Chen T. Efficient feature extraction for 2D/3D objects in mesh representation // Proc. IEEE International Conference on Image Processing (ICIP), 2001 (объем сетки как сумма объемов тетраэдров со знаком).
{: .sources__list}

</section>
