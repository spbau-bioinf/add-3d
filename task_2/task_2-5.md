---
work: 2
code: "task 2-5"
title: "Оболочки и вырожденные грани"
pymods: "stl_io.py,mesh_index.py,mesh_checks.py"
pyfiles: "finger.stl,two_cubes.stl,shells.stl"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

Файл STL (от stereolithography, стереолитография) может содержать несколько отдельных кусков поверхности. Иногда так и задумано: две детали в одном файле. Но у отсканированной или сегментированной модели лишние оболочки обычно оказываются мусором: крошки шума рядом с объектом, остатки соседних структур, мелкие пузыри внутри. К ним добавляются вырожденные грани: треугольники нулевой площади, у которых вершины совпадают или лежат на одной прямой.

Оболочки находятся подсчетом связных компонент, вырожденные грани по площади. В схеме ремонта из лекции выбор крупнейшей компоненты входит в первую, топологическую фазу, а удаление вырожденных граней во вторую, геометрическую. В итоговом задании этой страницы порядок обратный: так проще разобрать алгоритмы по одному. Это учебное упрощение, а не универсальный порядок ремонта.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- разбивать сетку на связные оболочки;
- находить грани нулевой площади;
- очищать модель, оставляя крупнейшую оболочку.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Задания 1 и 2 выполняются на второй практике по данной теме и занимают около 15 минут. Итоговое задание (около 20 минут) выполняется самостоятельно после второй практики по данной теме.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Связные оболочки
{: .subsection__title}

<div class="definition" markdown="1">

<span class="definition__term">Оболочка</span> в этом занятии: связная группа граней, в которой от любой грани до любой другой можно дойти по граням с общими вершинами. Оболочка не обязательно отдельное физическое тело: два куба, касающиеся по ребру, образуют одну оболочку.

</div>

Две грани принадлежат одной оболочке, если от одной до другой можно дойти по граням с общими вершинами. Чтобы разбить сетку на оболочки, каждой вершине дают метку группы и для каждой грани объединяют группы трех ее вершин. В конце грани раскладывают по группам.

Скачайте модель для заданий и сохраните ее в рабочую папку.

- [shells.stl](../assets/files/shells.stl){: .files__link}
{: .files}

<article class="example" markdown="1">

### Пример 1. Сколько оболочек в модели
{: .example__title}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh


def shells(n_verts, faces):
    """Разбивает грани на связные группы (оболочки); возвращает списки номеров граней."""
    parent = list(range(n_verts))          # сначала каждая вершина сама себе группа

    def root(x):
        while parent[x] != x:
            x = parent[x]
        return x

    for a, b, c in faces:                  # вершины одной грани в одной группе
        for u in (b, c):
            parent[root(u)] = root(a)
    groups = {}
    for i, f in enumerate(faces):
        groups.setdefault(root(f[0]), []).append(i)
    return list(groups.values())


for name in ["finger.stl", "two_cubes.stl"]:
    verts, faces = index_mesh(read_stl(name))
    print(name, "оболочек:", len(shells(len(verts), faces)))
{% endcapture %}{% capture expected %}
finger.stl оболочек: 1
two_cubes.stl оболочек: 1
{% endcapture %}{% include pyrun.html file="task_2-5_example.py" code=code expected=expected %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- Список `parent` хранит для каждой вершины «старшую» вершину ее группы. Функция `root` поднимается по этим ссылкам до вершины, которая ссылается сама на себя: это представитель группы.
- Строка `parent[root(u)] = root(a)` сливает группу вершины `u` с группой вершины `a`. После прохода по всем граням у вершин одной оболочки общий представитель.
- Цепочки ссылок в `parent` могут становиться длинными, и в больших сетках их укорачивают по ходу поиска («сжатие путей»). Для моделей занятия из нескольких тысяч граней простой версии достаточно (Tarjan, 1975).
- Перенесите функцию `shells` в `mesh_checks.py`: она нужна в заданиях этой страницы и в [task 2-7](task_2-7.html).
- Грани раскладываются по представителю своей первой вершины: остальные две вершины в той же группе.
- Кубы из `two_cubes.stl` дали одну оболочку: они связаны через общие вершины сингулярного ребра. Счет оболочек по вершинам не отличает два касающихся тела от одного.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Оболочки модели с мусором <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-5\_1.py</span>
{: .task__meta}

С помощью функции `shells` из `mesh_checks.py` для модели `shells.stl` найдите число оболочек и число граней в каждой, по убыванию.

```text
Оболочек: 5
Граней в оболочках: [1104, 80, 12, 1, 1]
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl
from mesh_index import index_mesh
from mesh_checks import shells

verts, faces = index_mesh(read_stl("shells.stl"))
groups = []   # замените [] на оболочки, которые находит функция shells
print("Оболочек:", len(groups))
print("Граней в оболочках:", [])   # число граней в каждой оболочке, по убыванию
{% endcapture %}{% capture expected %}
Оболочек: 5
Граней в оболочках: [1104, 80, 12, 1, 1]
{% endcapture %}{% include pyrun.html file="task_2-5_1.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-5_1.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-5_1.py</code>.</p>
<div class="quiz__q">
<p>Оболочка из 1104 граней — сама фаланга. Чем, скорее всего, являются оболочки из 80 и 12 граней?</p>
<label><input type="radio" data-ok> Простейшая сфера из треугольников (80 граней) и куб (12 граней): мусор рядом с моделью и внутри нее.</label>
<label><input type="radio"> Две половины фаланги, разрезанной при сегментации.</label>
<label><input type="radio"> Заплаты, которыми программа сегментации закрыла дыры.</label>
<p class="quiz__exp" hidden>У куба 12 треугольных граней, у простейшей триангулированной сферы (икосаэдр, разбитый один раз) — 80. Такие куски появляются как шум сегментации или забытые вспомогательные тела.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Вырожденные грани
{: .subsection__title}

Площадь треугольника равна половине длины векторного произведения двух его сторон:

<div class="formula"><i>S</i> = |(<b>b</b> − <b>a</b>) × (<b>c</b> − <b>a</b>)| / 2</div>
<dl class="where">
<div><dt>где <i>S</i></dt><dd>площадь грани, мм²</dd></div>
<div><dt><b>a</b>, <b>b</b>, <b>c</b></dt><dd>векторы координат вершин грани, мм (<a href="task_2-1.html">task 2-1</a>, раздел 3)</dd></div>
<div><dt>×, | |</dt><dd>векторное произведение и длина вектора</dd></div>
</dl>

У вырожденной грани площадь равна нулю. Сравнивать с нулем точно нельзя: вычисления с вещественными числами дают погрешность. Поэтому грань считают вырожденной, если площадь меньше малого порога; на этом занятии порог 10⁻⁶ мм². Порог задан в квадратных миллиметрах и годится только для координат в миллиметрах.

Грань с совпадающими вершинами, например (*a*, *a*, *b*), ломает и подсчет ребер. Функция `edges_of` создает для нее ребро-петлю (*a*, *a*): у петли одна грань, и она считается краевой. Сторона (*a*, *b*) встречается в этой грани дважды и выглядит как нормальное ребро с двумя гранями. Поэтому вырожденные грани ищут по площади, а не по счетчику ребер.

<article class="task" id="task-2" markdown="1">

### Задание 2. Грани нулевой площади <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файлы: <span class="task__file">task\_2-5\_2.py</span>, функция `face_area` в <span class="task__file">mesh\_checks.py</span>
{: .task__meta}

Добавьте в `mesh_checks.py` функцию `face_area(a, b, c)`, которая возвращает площадь треугольника по трем вершинам. Найдите с ее помощью в `shells.stl` грани с площадью меньше 10⁻⁶ и напечатайте их число и номера (номер грани — это ее место в списке `read_stl`, начиная с 0).

```text
Вырожденных граней: 2 | номера: [1196, 1197]
```
{: .output data-label="Требуемый вывод"}

Напечатайте вершины найденных граней и сравните их.

{% capture code %}
from stl_io import read_stl


def face_area(a, b, c):
    """Площадь треугольника по трем вершинам."""
    return 1.0   # замените на половину длины векторного произведения сторон


tris = read_stl("shells.stl")
bad = []   # номера граней с площадью меньше 1e-6
print("Вырожденных граней:", len(bad), "| номера:", bad)
{% endcapture %}{% capture expected %}
Вырожденных граней: 2 | номера: [1196, 1197]
{% endcapture %}{% include pyrun.html file="task_2-5_2.py" code=code expected=expected note="В окне функция <code>face_area</code> стоит в программе; в файле для сдачи перенесите ее в <code>mesh_checks.py</code>. Строки с вершинами граней, которые вы допечатаете, окно покажет как расхождение с требуемым выводом; это нормально." %}

<div class="quiz" data-file="task_2-5_2.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-5_2.py</code>.</p>
<div class="quiz__q">
<p>Чем отличаются грани 1196 и 1197?</p>
<label><input type="radio" data-ok> У грани 1196 три разные вершины на одной прямой, у грани 1197 две вершины совпадают.</label>
<label><input type="radio"> Обе грани повернуты внутрь модели.</label>
<label><input type="radio"> Грань 1197 больше по площади, но меньше порога по периметру.</label>
<p class="quiz__exp" hidden>Обе грани имеют нулевую площадь, но по-разному: точки (52, 44, 1), (53, 44, 1), (54, 44, 1) лежат на одной прямой, а у грани 1197 первая и вторая вершины одинаковы.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

Когда задания 1 и 2 решены, откройте `shells.stl` в просмотрщике: все оболочки, кроме крупнейшей, показаны фиолетовым. Снаружи видна только одна мелкая оболочка, крошка рядом с фалангой. Кубик внутри фаланги закрыт непрозрачной поверхностью. Вырожденная грань из трех точек на одной прямой видна только как крошечный красный отрезок: ее ребра краевые. Грань из совпадающих вершин не видна вовсе. Надежно их находит только подсчет: счетчик «Оболочек» показывает все 5.

{% include mesh-viewer.html presets="shells,two_cubes" default="shells" %}

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: очистка модели <span class="level level--5">Уровень 5 · итоговое</span>

Файлы: <span class="task__file">task\_2-5\_clean.py</span>, функции `remove_degenerate` и `keep_largest` в <span class="task__file">mesh\_checks.py</span>
{: .task__meta}

**Ситуация.** Модель фаланги пришла из сегментации вместе с мусором. Перед печатью нужно оставить только саму фалангу.

**Требования:**

1. Добавьте в `mesh_checks.py` две функции. `remove_degenerate(verts, faces, eps=1e-6)` возвращает список граней без вырожденных. `keep_largest(verts, faces)` возвращает пару: грани крупнейшей оболочки (с наибольшим числом граней) и число отброшенных оболочек.
1. Программа `task_2-5_clean.py` работает с индексированной сеткой `shells.stl`. Она печатает *F* и *V* − *E* + *F* до очистки и число исходных оболочек.
1. Затем удаляет вырожденные грани и печатает, сколько оболочек осталось, оставляет крупнейшую, печатает число отброшенных малых оболочек и записывает крупнейшую функцией `write_stl` в `shells_clean.stl`.
1. Программа читает `shells_clean.stl` заново и печатает *F* и *V* − *E* + *F* после очистки.

```text
До очистки: F = 1198, V - E + F = 8
Исходных оболочек: 5
После удаления вырожденных граней: 3
Отброшено малых оболочек: 2
После очистки: F = 1104, V - E + F = 2
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl, write_stl
from mesh_index import index_mesh, edges_of
from mesh_checks import shells


def face_area(a, b, c):
    return 1.0   # вставьте функцию из задания 2


def remove_degenerate(verts, faces, eps=1e-6):
    """Грани без вырожденных: площадь не меньше eps."""
    return list(faces)


def keep_largest(verts, faces):
    """Грани крупнейшей оболочки и число отброшенных оболочек."""
    return list(faces), 0


verts, faces = index_mesh(read_stl("shells.stl"))
E = len(edges_of(faces))
print(f"До очистки: F = {len(faces)}, V - E + F = {len(verts) - E + len(faces)}")
# допишите остальные строки требуемого вывода и запись shells_clean.stl
{% endcapture %}{% capture expected %}
До очистки: F = 1198, V - E + F = 8
Исходных оболочек: 5
После удаления вырожденных граней: 3
Отброшено малых оболочек: 2
После очистки: F = 1104, V - E + F = 2
{% endcapture %}{% include pyrun.html file="task_2-5_clean.py" code=code expected=expected note="В окне функции стоят в программе; в файле для сдачи перенесите их в <code>mesh_checks.py</code>. Записанный файл <code>shells_clean.stl</code> можно скачать кнопкой под выводом." %}

<div class="check" markdown="1">

Проверьте себя
{: .check__title}

Откройте `shells_clean.stl` в просмотрщике кнопкой загрузки файла. Совпадение показывает, что в файле осталась ровно одна замкнутая фаланга.

| Показатель | Значение | Если не совпало |
|---|---|---|
| Оболочек | 1 | выбрана не крупнейшая оболочка или оболочки собраны по ребрам, а не по общим вершинам |
| Вырожденных граней | 0 | вырожденные грани удалялись после выбора оболочки, и одна осталась в ней |
| V − E + F | 2 | в файле остались грани малых оболочек |
| Объем со знаком | 2&nbsp;045,39 | записаны вершины не той оболочки |

</div>

<div class="quiz" data-file="task_2-5_clean.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-5_clean.py</code>.</p>
<div class="quiz__q">
<p>1. Почему после удаления вырожденных граней из пяти оболочек осталось три?</p>
<label><input type="radio" data-ok> Две вырожденные грани были отдельными оболочками из одной грани.</label>
<label><input type="radio"> Удаление граней сливает соседние оболочки.</label>
<label><input type="radio"> Порог площади удалил две малые оболочки целиком.</label>
<p class="quiz__exp" hidden>Список «Граней в оболочках» из задания 1 заканчивается на 1, 1. Если сначала выбрать крупнейшую оболочку, результат здесь будет тем же; но вырожденная грань внутри основной оболочки при таком порядке осталась бы.</p>
</div>
<div class="quiz__q">
<p>2. Оболочки из 1104, 80 и 12 граней дают по 2 в сумме <i>V</i> − <i>E</i> + <i>F</i>, а всего получилось 8. Откуда еще 2?</p>
<label><input type="radio" data-ok> Каждая оболочка из одной грани дает <i>V</i> − <i>E</i> + <i>F</i> = 1.</label>
<label><input type="radio"> В модели есть две дыры.</label>
<label><input type="radio"> У куба род 1, и он дает лишние 2.</label>
<p class="quiz__exp" hidden>Отдельная грань: 3 вершины, 3 ребра, 1 грань, сумма 1. У грани с совпадающими вершинами 2 вершины, 2 ребра (одно из них петля) и 1 грань — тоже 1.</p>
</div>
<div class="quiz__q">
<p>3. Оболочка из 12 граней лежит внутри фаланги. Когда внутреннюю оболочку удалять нельзя?</p>
<label><input type="radio" data-ok> Когда полость задумана: облегчение импланта, канал, пористая часть для прорастания кости.</label>
<label><input type="radio"> Когда в оболочке меньше 20 граней.</label>
<label><input type="radio"> Никогда: внутренние оболочки всегда мусор.</label>
<p class="quiz__exp" hidden>Лекция предупреждает, что объемный ремонт теряет задуманные полости. Перед удалением внутренней оболочки нужно знать, что она означает.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В папке `pipeline_2` создайте папку `task_2_5` и переместите в нее программы этой страницы: <span class="task__file">task\_2-5\_1.py</span>, <span class="task__file">task\_2-5\_2.py</span> и <span class="task__file">task\_2-5\_clean.py</span>.
1. Скопируйте в `task_2_5` модули, которые импортируют программы: `mesh_checks.py`, `mesh_index.py` и `stl_io.py`. Так папка запускается сама по себе.
1. Рабочие копии модулей и модели `.stl` оставьте в `mesh_work`: они нужны на следующих страницах. Файл `mesh_checks.py` в рабочей папке продолжайте пополнять; в папку страницы кладется его копия на момент сдачи.
1. Очищенную модель `.stl` не переносите: программа создает ее заново.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_2/
    ├── task_2_1/
    ├── task_2_2/
    ├── task_2_3/
    ├── task_2_4/
    └── @@task_2_5/@@
        ├── mesh_checks.py
        ├── mesh_index.py
        ├── stl_io.py
        ├── task_2-5_1.py
        ├── task_2-5_2.py
        └── task_2-5_clean.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 4 (слайды 52–53, 57–58).
1. Attene M. et al. Polygon Mesh Repairing: An Application Perspective. ACM Computing Surveys, 2013 — p. 15:4–15:9, 15:12.
1. Attene M. A lightweight approach to repairing digitized polygon meshes. The Visual Computer, 2010 — p. 1, 4–9.
1. Botsch M. et al. Polygon Mesh Processing. A K Peters, 2010 — p. 132–135.
1. Tarjan R. E. Efficiency of a Good But Not Linear Set Union Algorithm // Journal of the ACM, 1975, 22(2), p. 215–225 (сжатие путей при поиске корня).
{: .sources__list}

</section>
