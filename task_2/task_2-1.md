---
work: 2
code: "task 2-1"
title: "STL изнутри: чтение файла на Python"
pymods: "stl_io.py"
pyfiles: "pyramid.stl,finger.stl,ring.stl,scan_sphere.stl"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

STL (от stereolithography, стереолитография) описывает поверхность детали набором треугольников. Каждая грань задана единичной нормалью и тремя вершинами, и больше в файле ничего нет: ни связей между гранями, ни цвета, ни материала, ни единиц измерения. Формат бывает текстовым (ASCII, по названию кодировки символов American Standard Code for Information Interchange) и двоичным; двоичный компактнее, поэтому системы автоматизированного проектирования (CAD, computer-aided design) обычно пишут его.

На этой странице вы прочитаете оба варианта собственной программой. Библиотеки для этого не нужны: хватит модуля `struct` из стандартной библиотеки Python.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- отличать двоичный STL от текстового по размеру файла;
- читать грани STL в список Python;
- вычислять габариты модели и замечать ошибку единиц измерения.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Страница выполняется на первой встрече: задания 1 и 2 занимают около 15 минут, итоговое задание — около 15 минут. Все файлы занятия создавайте в рабочей папке `mesh_work`; в конце страницы (блок «Затем») вы перенесете их в личную папку.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Текстовый STL
{: .subsection__title}

Скачайте модели занятия и сохраните их в рабочую папку.

- [pyramid.stl](../assets/files/pyramid.stl){: .files__link}
- [finger.stl](../assets/files/finger.stl){: .files__link}
- [ring.stl](../assets/files/ring.stl){: .files__link}
- [scan_sphere.stl](../assets/files/scan_sphere.stl){: .files__link}
{: .files}

Файл `pyramid.stl` текстовый, его можно открыть в редакторе кода. Это треугольная пирамида из лекции:

```text
solid triangular_pyramid
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 0 1
    endloop
  endfacet
  ...
endsolid triangular_pyramid
```
{: .output .output--file data-label="pyramid.stl"}

- `solid` открывает объект, `endsolid` закрывает. После слова идет имя, на данные оно не влияет.
- Каждая грань занимает 7 строк: `facet normal` с тремя координатами нормали, затем `outer loop`, три строки `vertex` и две закрывающие строки.
- Вершины перечислены против часовой стрелки, если смотреть на грань снаружи. Нормаль первой грани (0, −1, 0): грань лежит в плоскости *y* = 0 и смотрит в сторону отрицательных *y*, то есть из пирамиды наружу.
- Порядок граней в файле любой. На грань приходится 12 чисел: 3 для нормали и по 3 на вершину.
{: .checklist}

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Двоичный STL: 84 + 50·F байт
{: .subsection__title}

<figure class="diagram">
<svg role="img" viewBox="0 0 660 170">
<title>Двоичный STL: заголовок 80 байт, число граней 4 байта, затем по 50 байт на грань: нормаль 12, три вершины по 12, атрибут 2.</title>
<rect class="d-box" x="10" y="20" width="150" height="44"></rect><text class="d-text" x="85" y="47" text-anchor="middle">заголовок 80 Б</text>
<rect class="d-box d-box--name" x="160" y="20" width="110" height="44"></rect><text class="d-text" x="215" y="47" text-anchor="middle">F: 4 Б</text>
<rect class="d-box d-box--object" x="270" y="20" width="110" height="44"></rect><text class="d-text" x="325" y="47" text-anchor="middle">грань 50 Б</text>
<rect class="d-box d-box--object" x="380" y="20" width="110" height="44"></rect><text class="d-text" x="435" y="47" text-anchor="middle">грань 50 Б</text>
<rect class="d-box" x="490" y="20" width="160" height="44"></rect><text class="d-text" x="570" y="47" text-anchor="middle">… всего F граней</text>
<path class="d-arrow" d="M270,70 L60,110 M380,70 L640,110"></path>
<rect class="d-box" x="20" y="110" width="120" height="40"></rect><text class="d-text d-text--small" x="80" y="135" text-anchor="middle">нормаль 12 Б</text>
<rect class="d-box" x="140" y="110" width="120" height="40"></rect><text class="d-text d-text--small" x="200" y="135" text-anchor="middle">вершина 1: 12 Б</text>
<rect class="d-box" x="260" y="110" width="120" height="40"></rect><text class="d-text d-text--small" x="320" y="135" text-anchor="middle">вершина 2: 12 Б</text>
<rect class="d-box" x="380" y="110" width="120" height="40"></rect><text class="d-text d-text--small" x="440" y="135" text-anchor="middle">вершина 3: 12 Б</text>
<rect class="d-box" x="500" y="110" width="140" height="40"></rect><text class="d-text d-text--small" x="570" y="135" text-anchor="middle">атрибут 2 Б</text>
</svg>
<figcaption class="diagram__caption">Адаптировано по Gibson I. et al., 2021, п. 17.2.1.1 (p. 494–495); лекция 3, слайд 39.</figcaption>
</figure>

{% include anim-stl-bytes.html %}

Каждое число в двоичном STL занимает 4 байта (вещественное число одинарной точности), поэтому 12 чисел грани занимают 48 байт, и еще 2 байта отведены под атрибут. Отсюда размер файла:

<div class="formula">размер = 84 + 50·<i>F</i></div>
<dl class="where">
<div><dt>где размер</dt><dd>длина двоичного файла STL, байт</dd></div>
<div><dt>84</dt><dd>заголовок (80 байт) и счетчик граней (4 байта)</dd></div>
<div><dt>50</dt><dd>байт на грань: 12 чисел по 4 байта и атрибут 2 байта</dd></div>
<div><dt><i>F</i></dt><dd>число граней, записанное в байтах 80–83</dd></div>
</dl>

Для пирамиды из лекции 84 + 50·4 = 284 байта.

Эта формула дает практический признак двоичного файла: прочитать счетчик из байтов 80–83 и сравнить 84 + 50·*F* с настоящим размером файла. Строгим доказательством формата совпадение не является, но для файлов этого занятия признак работает без ошибок.

<aside class="callout callout--warning" markdown="1">

Единиц в STL нет
{: .callout__title}

Число 10 в файле может означать 10 мм или 10 дюймов: это знает только тот, кто экспортировал модель. Проверить единицы по самому файлу нельзя, можно только заметить, что габариты неправдоподобны для этого изделия.

</aside>

</section>

<!-- ===================== 3 ===================== -->

<section class="subsection" id="s3" markdown="1">

## <span class="subsection__num">3.</span> Модуль чтения STL
{: .subsection__title}

Скачайте файл и сохраните его в рабочую папку: задания этой и следующих страниц импортируют из него функции.

- [stl_io.py](../assets/files/stl_io.py){: .files__link}
{: .files}

<article class="example" markdown="1">

### Пример 1. Функция `read_stl`
{: .example__title}

{% capture code %}
import os
import struct


def read_stl(path):
    """Читает STL (двоичный или ASCII) и возвращает список граней.

    Грань: кортеж из трех вершин, вершина: кортеж (x, y, z).
    """
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        data = f.read()
    if size >= 84:
        n = struct.unpack("<I", data[80:84])[0]
        if size == 84 + 50 * n:                      # двоичный: 84 + 50·F байт
            tris = []
            for k in range(n):
                vals = struct.unpack("<12f", data[84 + 50 * k: 84 + 50 * k + 48])
                tris.append((vals[3:6], vals[6:9], vals[9:12]))   # нормаль vals[0:3] пропускаем
            return tris
    tris, loop = [], []                              # иначе текстовый (ASCII)
    for line in data.decode("ascii", errors="ignore").splitlines():   # имя после solid может быть не латиницей
        words = line.split()
        if words and words[0] == "vertex":
            loop.append(tuple(float(w) for w in words[1:4]))
            if len(loop) == 3:
                tris.append(tuple(loop))
                loop = []
    return tris


def write_stl(path, tris):
    """Записывает грани в двоичный STL; нормаль считается по порядку вершин."""
    with open(path, "wb") as f:
        f.write(b"binary STL".ljust(80, b" "))
        f.write(struct.pack("<I", len(tris)))
        for a, b, c in tris:
            u = [b[i] - a[i] for i in range(3)]
            v = [c[i] - a[i] for i in range(3)]
            n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
            length = sum(x * x for x in n) ** 0.5 or 1.0
            f.write(struct.pack("<12fH", *[x / length for x in n], *a, *b, *c, 0))


if __name__ == "__main__":
    tris = read_stl("pyramid.stl")
    print("Граней:", len(tris))
    print("Первая грань:", tris[0])
{% endcapture %}{% capture expected %}
Граней: 4
Первая грань: ((0.0, 0.0, 0.0), (1.0, 0.0, 0.0), (0.0, 0.0, 1.0))
{% endcapture %}{% include pyrun.html file="stl_io.py" code=code expected=expected note="Листинг модуля <code>stl_io.py</code>: его код совпадает с файлом для скачивания. При запуске модуль читает <code>pyramid.stl</code>." %}

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- `read_stl` читает файл целиком в байты `data` и сначала проверяет формулу размера. `struct.unpack("<I", data[80:84])` превращает байты 80–83 в целое число без знака; `<` означает порядок байтов «младший первым», так записан STL.
- Для двоичного файла цикл идет по граням: грань `k` начинается с байта `84 + 50 * k`. Формат `"<12f"` читает 12 вещественных чисел; `vals[0:3]` нормаль, дальше три вершины. Нормаль пропускается: ее можно вычислить по вершинам, и на [task 2-4](task_2-4.html) вы увидите, почему записанной нормали не стоит доверять.
- Текстовый файл разбирается по словам: каждая строка `vertex` дает вершину, три вершины подряд образуют грань. `errors="ignore"` пропускает символы не из ASCII: русскоязычная CAD-система может записать после `solid` имя кириллицей, и без этого параметра чтение упадет.
- Грань возвращается кортежем из трех вершин, вершина кортежем (x, y, z). Это и есть «треугольный суп»: у соседних граней общая вершина записана заново.
- `write_stl` записывает двоичный STL. Она понадобится на [task 2-5](task_2-5.html); пока ее можно не разбирать.
- Двоичные числа имеют одинарную точность, поэтому координаты из `finger.stl` выглядят как `62.08449935913086`, а не `62.0845`. При выводе округляйте их форматом, например `f"{x:.2f}"`.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Двоичный или текстовый <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_2-1\_1.py</span>
{: .task__meta}

Для файлов `pyramid.stl`, `finger.stl` и `scan_sphere.stl` программа читает первые 84 байта, извлекает счетчик граней и печатает строку: имя, размер файла, счетчик, ожидаемый размер 84 + 50·*F* и вывод «двоичный» или «не двоичный». Размер файла дает `os.path.getsize`.

```text
pyramid.stl: 538 Б, счетчик 538976266, 84 + 50·538976266 = 26948813384 -> не двоичный
finger.stl: 55284 Б, счетчик 1104, 84 + 50·1104 = 55284 -> двоичный
scan_sphere.stl: 256084 Б, счетчик 5120, 84 + 50·5120 = 256084 -> двоичный
```
{: .output data-label="Требуемый вывод"}

Числа из требуемого вывода в программе не записываются: они получаются чтением файлов.

{% capture code %}
import os
import struct

for name in ("pyramid.stl", "finger.stl", "scan_sphere.stl"):
    size = os.path.getsize(name)
    n = 0          # замените 0 на счетчик граней из байтов 80-83 файла
    expected = 0   # замените 0 на размер двоичного файла с n гранями
    print(f"{name}: {size} Б, счетчик {n}, 84 + 50·{n} = {expected} -> ?")
{% endcapture %}{% capture expected %}
pyramid.stl: 538 Б, счетчик 538976266, 84 + 50·538976266 = 26948813384 -> не двоичный
finger.stl: 55284 Б, счетчик 1104, 84 + 50·1104 = 55284 -> двоичный
scan_sphere.stl: 256084 Б, счетчик 5120, 84 + 50·5120 = 256084 -> двоичный
{% endcapture %}{% include pyrun.html file="task_2-1_1.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-1_1.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-1_1.py</code>.</p>
<div class="quiz__q">
<p>Откуда у текстового файла <code>pyramid.stl</code> счетчик 538976266?</p>
<label><input type="radio"> В текстовом STL счетчик граней записан цифрами в заголовке файла.</label>
<label><input type="radio" data-ok> Байты 80–83 текстового файла — это символы текста (перевод строки и пробелы); прочитанные как целое число, они дают 538976266 = 0x2020200A.</label>
<label><input type="radio"> Это число граней пирамиды, умноженное на размер записи грани.</label>
<p class="quiz__exp" hidden>Модуль <code>struct</code> толкует любые 4 байта как число и не знает, что файл текстовый. Поэтому признак двоичного файла — совпадение 84 + 50·<i>F</i> с размером файла, а не сам счетчик.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

<article class="task" id="task-2" markdown="1">

### Задание 2. Кольцо в полтора миллиметра <span class="level level--3">Уровень 3 · применение</span>
{: .task__title}

Файл: <span class="task__file">task\_2-1\_2.py</span>
{: .task__meta}

Файл `ring.stl` прислали как модель кольца-ортеза для пальца. Прочитайте его функцией `read_stl`, вычислите габариты по трем осям (разность наибольшей и наименьшей координаты) и напечатайте их как есть и в пересчете из дюймов в миллиметры (1 дюйм = 25,4 мм).

```text
Габариты в файле: 1.42 x 1.42 x 0.32
Если это дюймы, мм: 36.1 x 36.1 x 8.1
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
from stl_io import read_stl

tris = read_stl("ring.stl")
dims = [0, 0, 0]   # габариты по x, y, z: наибольшая координата минус наименьшая
print("Габариты в файле: " + " x ".join(f"{d:.2f}" for d in dims))
# допишите строку с габаритами в пересчете из дюймов в миллиметры
{% endcapture %}{% capture expected %}
Габариты в файле: 1.42 x 1.42 x 0.32
Если это дюймы, мм: 36.1 x 36.1 x 8.1
{% endcapture %}{% include pyrun.html file="task_2-1_2.py" code=code expected=expected %}

<div class="quiz" data-file="task_2-1_2.py" data-comment="#">
<p class="quiz__title">Вопросы к заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-1_2.py</code>.</p>
<div class="quiz__q">
<p>1. В каких единицах, скорее всего, экспортировано кольцо и почему слайсер не может это определить сам?</p>
<label><input type="radio"> В миллиметрах: слайсер читает единицы из заголовка файла.</label>
<label><input type="radio" data-ok> В дюймах: единиц в STL нет, и слайсер видит только числа 1,42 × 1,42 × 0,32.</label>
<label><input type="radio"> В сантиметрах: слайсер определяет их по длине нормалей.</label>
<p class="quiz__exp" hidden>В двоичном STL записаны только числа; кольцо шириной 1,42 мм на палец не наденется, а 36,1 мм — правдоподобный наружный размер.</p>
</div>
<div class="quiz__q">
<p>2. Кольцо лежит плашмя. Каков внутренний диаметр кольца в миллиметрах?</p>
<label><input type="radio" data-ok> Около 20 мм: на палец подойдет.</label>
<label><input type="radio"> Около 36 мм: это браслет.</label>
<label><input type="radio"> Около 0,8 мм: это бусина.</label>
<p class="quiz__exp" hidden>Внутренний радиус кольца в файле 0,39 дюйма, диаметр 0,78 · 25,4 ≈ 19,8 мм. Наружный размер 36,1 мм включает обод.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: карточка STL-файла <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_2-1\_info.py</span>
{: .task__meta}

**Ситуация.** Перед подготовкой к печати оператор заполняет карточку модели: формат, число граней, габариты и положение. Карточка нужна, чтобы заметить ошибку единиц до печати, а не после.

**Требования:**

1. Программа спрашивает имя файла (приглашение `Файл STL: `) и печатает карточку в формате примеров ниже.
1. Формат определяется по формуле размера; грани читаются функцией `read_stl`.
1. «Минимум» — это наименьшие координаты по x, y и z.
1. Если наибольший габарит меньше 5 единиц, программа печатает предупреждение с габаритами в миллиметрах в предположении, что файл в дюймах.

```text
Файл STL: @@finger.stl@@
Формат: двоичный
Размер файла: 55284 Б
Граней: 1104
Габариты: 8.63 x 8.63 x 40.00
Минимум: 55.68, 45.68, 0.00
```
{: .output data-label="Пример работы 1"}

```text
Файл STL: @@ring.stl@@
Формат: двоичный
Размер файла: 57684 Б
Граней: 1152
Габариты: 1.42 x 1.42 x 0.32
Минимум: 1.29, 1.29, 0.00
Внимание: модель меньше 5 единиц. Проверьте единицы: в дюймах это 36.1 x 36.1 x 8.1 мм
```
{: .output data-label="Пример работы 2"}

Запустите программу и для `pyramid.stl`. В окне ниже ввод `finger.stl` подставляется сам; чтобы проверить другую модель, замените в коде строку с `input` на `name = "ring.stl"`.

{% capture code %}
import os

from stl_io import read_stl

name = input("Файл STL: ")
tris = read_stl(name)
print("Формат: ?")   # определите формат по формуле 84 + 50·F
print(f"Размер файла: {os.path.getsize(name)} Б")
print("Граней:", len(tris))
# допишите строки «Габариты» и «Минимум» и предупреждение для моделей меньше 5 единиц
{% endcapture %}{% include pyrun.html file="task_2-1_info.py" code=code stdin="finger.stl" %}

<div class="quiz" data-file="task_2-1_info.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_2-1_info.py</code>.</p>
<div class="quiz__q">
<p>Почему правило «меньше 5 единиц» остается только подсказкой?</p>
<label><input type="radio" data-ok> Маленькой бывает и правильно экспортированная деталь: у пирамиды 1 × 1 × 1 из лекции предупреждение срабатывает, хотя ошибки в файле нет.</label>
<label><input type="radio"> Правило всегда находит дюймы, но не находит сантиметры.</label>
<label><input type="radio"> Правило не работает для двоичных файлов.</label>
<p class="quiz__exp" hidden>Правило сравнивает только размеры и не знает назначения детали. Оно подсказывает, где проверить единицы, но решение принимает человек, который знает изделие.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. В личной папке рядом с `pipeline_1` создайте папку `pipeline_2`.
1. В папке `pipeline_2` создайте папку `task_2_1` и переместите в нее программы этой страницы: <span class="task__file">task\_2-1\_1.py</span>, <span class="task__file">task\_2-1\_2.py</span> и <span class="task__file">task\_2-1\_info.py</span>.
1. Скопируйте в `task_2_1` модули, которые импортируют программы: `stl_io.py`. Так папка запускается сама по себе.
1. Рабочие копии модулей и модели `.stl` оставьте в `mesh_work`: они нужны на следующих страницах.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
├── pipeline_1/
└── @@pipeline_2/@@
    └── @@task_2_1/@@
        ├── stl_io.py
        ├── task_2-1_1.py
        ├── task_2-1_2.py
        └── task_2-1_info.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Лекция 3 «Цифровой конвейер аддитивного производства», блок 3 (слайды 38–40).
1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — Fig. 17.2, p. 494–495, 509, 522.
1. Witherell P., Farret J. // ASM Handbook. Vol. 24A: Additive Manufacturing Design and Applications. ASM International, 2023 — p. 6.
1. Документация Python: модуль struct, [docs.python.org/3/library/struct.html](https://docs.python.org/3/library/struct.html).
{: .sources__list}

</section>
