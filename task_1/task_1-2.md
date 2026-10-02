---
work: 1
code: "task 1-2"
title: "Сколько выдавить: расчет подачи нити <code>E</code>"
head_title: "Task 1-2. Сколько выдавить: расчет подачи нити E"
---

<section class="theory" markdown="1">

## Теоретические сведения
{: .section__title}

В экструзионном принтере нить подается в разогретое сопло, плавится и укладывается на платформу по заданной траектории. Число после `E` в строке G-кода — это длина нити, которую нужно подать за время движения сопла по отрезку. Слайсер вычисляет его из баланса объема: объем материала, вошедшего в сопло, равен объему материала, уложенного в дорожку.

Разрешение детали определяют диаметр сопла и высота слоя: меньшее сопло и более тонкий слой дают более гладкую поверхность и лучшую детализацию. Поэтому ширина и высота дорожки — главные параметры в расчете `E`.

</section>

<section class="goal" markdown="1">

## 🎯 Цель работы
{: .section__title}

Научиться:

- выводить формулу подачи нити из баланса объема;
- рассчитывать `E` для отрезка по ширине и высоте дорожки и диаметру нити;
- предсказывать, как изменится `E` при смене нити, слоя или ширины дорожки;
- решать обратную задачу: по `E` из файла находить ширину дорожки.

</section>

<aside class="callout callout--hint" markdown="1">

⏱ Время и место выполнения
{: .callout__title}

Страница выполняется на первой встрече: задания 1 и 2 занимают около 10 минут, итоговое задание — около 10 минут. Теоретическую часть используйте как справочник: к нужному разделу ведут ссылки в условиях заданий.

</aside>

<!-- ===================== 1 ===================== -->

<section class="subsection" id="s1" markdown="1">

## <span class="subsection__num">1.</span> Баланс объема
{: .subsection__title}

<figure class="diagram">
<svg role="img" viewBox="0 0 700 280">
<title>Нить диаметром d входит в сопло со скоростью подачи; из сопла выходит дорожка шириной W и высотой H, сопло движется со скоростью перемещения.</title>
<defs>
<marker id="m20" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="9" refY="5" viewBox="0 0 10 10"><path class="d-arrowhead" d="M0,0 L10,5 L0,10 z"></path></marker>
</defs>
<g transform="translate(60,0)">
<rect class="d-box d-box--name" x="96" y="14" width="40" height="100"></rect>
<text class="d-text" x="86" y="56" text-anchor="end">нить</text>
<text class="d-text d-text--small" x="86" y="76" text-anchor="end">диаметр d = 2r</text>
<path class="d-arrow" d="M156,24 L156,96" marker-end="url(#m20)"></path>
<text class="d-text d-text--mono" x="166" y="66">v_f</text>
<path class="d-box d-box--nozzle" d="M76,114 L156,114 L124,176 L108,176 Z"></path>
<text class="d-text d-text--small" x="170" y="150">сопло</text>
<rect class="d-box d-box--object" x="108" y="178" width="300" height="28"></rect>
<text class="d-text" x="258" y="197" text-anchor="middle">дорожка</text>
<line class="d-plate" x1="40" y1="208" x2="440" y2="208"></line>
<text class="d-text d-text--small" x="240" y="228" text-anchor="middle">платформа или предыдущий слой</text>
<path class="d-arrow" d="M320,160 L400,160" marker-end="url(#m20)"></path>
<text class="d-text d-text--mono" x="340" y="150">v_r</text>
</g>
<g transform="translate(50,0)">
<text class="d-text" x="566" y="46" text-anchor="middle">сечение дорожки</text>
<rect class="d-box d-box--object" x="510" y="70" width="112" height="56"></rect>
<path class="d-dim" d="M510,142 H622 M510,136 V148 M622,136 V148"></path>
<text class="d-text d-text--mono" x="566" y="166" text-anchor="middle">W</text>
<path class="d-dim" d="M632,70 V126 M626,70 H638 M626,126 H638"></path>
<text class="d-text d-text--mono" x="618" y="102" text-anchor="end">H</text>
</g>
</svg>
<figcaption class="diagram__caption">Адаптировано по Gibson et al., 2021, Fig. 6.1 и ур. 6.1–6.3 (p. 174–175).</figcaption>
</figure>

{% include anim-balance.html %}

<div class="definition" markdown="1">

<span class="definition__term">Дорожка</span> (road) — полоса материала, которую сопло укладывает за один проход. В модели ее сечение считается прямоугольником шириной *W* и высотой *H*.

</div>

Объемный расход материала на входе в сопло определяется скоростью подачи нити *v*<sub>f</sub> и ее радиусом *r*, на выходе — скоростью перемещения сопла *v*<sub>r</sub> и сечением дорожки:

<div class="formula"><i>Q</i> = <i>v</i><sub>f</sub> · π · <i>r</i>² = <i>v</i><sub>r</sub> · <i>W</i> · <i>H</i>,&nbsp;&nbsp;&nbsp;&nbsp;откуда&nbsp;&nbsp;&nbsp;&nbsp;<i>v</i><sub>f</sub> = <i>v</i><sub>r</sub> · <i>W</i> · <i>H</i> / (π · <i>r</i>²)</div>
<dl class="where">
<div><dt>где <i>Q</i></dt><dd>объемный расход материала, мм³/с: одинаков на входе в сопло и на выходе из него</dd></div>
<div><dt><i>v</i><sub>f</sub></dt><dd>скорость подачи нити роликами, мм/с</dd></div>
<div><dt><i>r</i></dt><dd>радиус нити, мм: половина диаметра <i>d</i></dd></div>
<div><dt><i>v</i><sub>r</sub></dt><dd>скорость перемещения сопла, мм/с: в G-коде это скорость <code>F</code>, переведенная из мм/мин (<a href="task_1-1.html">task 1-1</a>, раздел 4)</dd></div>
<div><dt><i>W</i>, <i>H</i></dt><dd>ширина и высота дорожки, мм (определение выше)</dd></div>
</dl>

Сопло проходит отрезок длиной *L* за время *L* / *v*<sub>r</sub>. За это время подается нить длиной *v*<sub>f</sub> · *L* / *v*<sub>r</sub>. Отсюда формула, которой пользуются на этом занятии:

<div class="formula"><i>E</i> = <i>L</i> · <i>W</i> · <i>H</i> / (π · (<i>d</i> / 2)²)</div>
<dl class="where">
<div><dt>где <i>E</i></dt><dd>длина нити, которую нужно подать на отрезке, мм: число после буквы <code>E</code> в строке G-кода (<a href="task_1-1.html">task 1-1</a>, раздел 1)</dd></div>
<div><dt><i>L</i></dt><dd>длина отрезка траектории в плоскости XY, мм</dd></div>
<div><dt><i>W</i>, <i>H</i></dt><dd>ширина и высота дорожки, мм</dd></div>
<div><dt><i>d</i></dt><dd>диаметр нити, мм</dd></div>
</dl>

### Учебные параметры
{: .block-title}

| Параметр | Значение | Откуда |
|---|---|---|
| диаметр нити *d* | 1,75 мм | нить обычно выпускают диаметром 1,75 или 3 мм |
| ширина дорожки *W* | 0,4 мм | пример ширины дорожки из экструзионного сопла |
| высота слоя *H* | 0,2 мм | учебный выбор. По Gibson et al. слой в экструзионной печати обычно толще 0,078 мм (п. 6.6, p. 192), а у некоторых экструзионных машин равен 0,254 мм (п. 3.3, p. 60) |

<article class="example" markdown="1">

### Пример 1. Подача на сторону квадрата
{: .example__title}

| Шаг | Что вычисляем | Результат |
|---|---|---|
| 1 | сечение нити π · (1,75 / 2)² | 2,40528 мм² |
| 2 | сечение дорожки 0,4 · 0,2 | 0,08 мм² |
| 3 | подача на 1 мм пути 0,08 / 2,40528 | 0,03326 мм |
| 4 | подача на отрезок 20 мм 20 · 0,03326 | 0,6652 мм |

<div class="analysis" markdown="1">

Разбор
{: .analysis__title}

- Это число стоит в первой рабочей строке файла из [task 1-1](task_1-1.html): `G1 X110 Y90 E0.6652`.
- Подача нити примерно в 30 раз меньше пути сопла: сечение нити в 30 раз больше сечения дорожки.

</div>

</article>

<article class="task" id="task-1" markdown="1">

### Задание 1. Функция подачи <span class="level level--1">Уровень 1 · воспроизведение</span>
{: .task__title}

Файл: <span class="task__file">task\_1-2\_1.py</span>
{: .task__meta}

Напишите функцию `e_for(L, W=0.4, H=0.2, d=1.75)`, которая возвращает подачу нити для отрезка длиной `L` по формуле из раздела 1. С ее помощью выведите:

```text
E на 1 мм: 0.03326
E на 20 мм: 0.6652
E на 20 мм (нить 3 мм): 0.2264
```
{: .output data-label="Требуемый вывод"}

Числа 0.03326, 0.6652 и 0.2264 в программе не записываются — они получаются при вычислении. Число π берите из модуля `math`.

{% capture code %}
import math


def e_for(L, W=0.4, H=0.2, d=1.75):
    return 0   # замените 0 на формулу раздела 1


print(f"E на 1 мм: {e_for(1):.5f}")
# допишите две оставшиеся строки вывода
{% endcapture %}{% capture expected %}
E на 1 мм: 0.03326
E на 20 мм: 0.6652
E на 20 мм (нить 3 мм): 0.2264
{% endcapture %}{% include pyrun.html file="task_1-2_1.py" code=code expected=expected %}

</article>

</section>

<!-- ===================== 2 ===================== -->

<section class="subsection" id="s2" markdown="1">

## <span class="subsection__num">2.</span> Что меняет подачу
{: .subsection__title}

Из формулы видно: `E` растет пропорционально ширине и высоте дорожки и обратно пропорционально квадрату диаметра нити. Проверьте это в калькуляторе: меняйте по одному параметру и следите за результатом.

{% include e-calc.html %}

<aside class="callout callout--warning" markdown="1">

Модель приближенная
{: .callout__title}

Дорожку прижимают к предыдущему слою, и она ложится овалом, а не прямоугольником. Кроме того, на поворотах сопло замедляется, и при той же подаче в углу окажется лишний материал. Точное управление подачей — компромисс многих факторов: давления, температуры, диаметра сопла, свойств материала. Слайсеры учитывают больше, чем эта формула, но порядок величин она дает верный.

</aside>

<article class="task" id="task-2" markdown="1">

### Задание 2. Три изменения <span class="level level--2">Уровень 2 · понимание</span>
{: .task__title}

Файл: <span class="task__file">task\_1-2\_2.py</span>
{: .task__meta}

Используя функцию из задания 1, выведите подачу на отрезок 20 мм при слое 0,1 мм, при ширине дорожки 0,45 мм и во сколько раз уменьшается подача при переходе с нити 1,75 мм на нить 3 мм:

```text
E на 20 мм при H = 0.1 мм: 0.3326
E на 20 мм при W = 0.45 мм: 0.7484
Нить 3 мм вместо 1.75 мм: E меньше в 2.94 раза
```
{: .output data-label="Требуемый вывод"}

{% capture code %}
import math


def e_for(L, W=0.4, H=0.2, d=1.75):
    return L * W * H / (math.pi * (d / 2) ** 2)


# выведите три строки из условия; отношение считайте делением двух вызовов e_for
{% endcapture %}{% capture expected %}
E на 20 мм при H = 0.1 мм: 0.3326
E на 20 мм при W = 0.45 мм: 0.7484
Нить 3 мм вместо 1.75 мм: E меньше в 2.94 раза
{% endcapture %}{% include pyrun.html file="task_1-2_2.py" code=code expected=expected %}

<div class="quiz" data-file="task_1-2_2.py" data-comment="#">
<p class="quiz__title">Вопрос к заданию</p>
<p class="quiz__intro">Ответьте и скопируйте полученный комментарий в конец файла <code>task_1-2_2.py</code>.</p>
<div class="quiz__q">
<p>1. Почему при переходе с нити 1,75 мм на нить 3 мм подача уменьшается в 2,94 раза, а не в 3 / 1,75 ≈ 1,71?</p>
<label><input type="radio"> Подача зависит от длины окружности нити, а она растет линейно с диаметром.</label>
<label><input type="radio" data-ok> Подача обратно пропорциональна площади сечения нити, то есть квадрату диаметра: (3 / 1,75)² ≈ 2,94.</label>
<label><input type="radio"> Слайсер округляет диаметр нити до целых миллиметров.</label>
<p class="quiz__exp" hidden>Объем нити на отрезке равен площади сечения, умноженной на длину. При той же дорожке объем одинаков, поэтому длина обратно пропорциональна площади сечения, а площадь пропорциональна квадрату диаметра.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</article>

</section>

<!-- ===================== ИТОГОВОЕ ===================== -->

<section class="final-task" id="final" markdown="1">

## Итоговое задание: таблица подачи и обратная задача <span class="level level--5">Уровень 5 · итоговое</span>

Файл: <span class="task__file">task\_1-2\_table.py</span>
{: .task__meta}

**Ситуация.** Оператору нужна справочная таблица: сколько нити подавать на отрезок 20 мм при разной высоте слоя для двух диаметров нити. Кроме того, он получил файл, в котором на отрезок 20 мм подается 0,6652 мм нити при слое 0,2 мм, и хочет знать, на какую ширину дорожки рассчитан этот файл.

Напишите программу, которая выводит ровно следующее:

```text
Подача нити на отрезок 20 мм, W = 0.4 мм
H, мм   нить 1.75 мм   нить 3 мм
0.10    0.3326         0.1132
0.15    0.4989         0.1698
0.20    0.6652         0.2264
0.25    0.8315         0.2829
0.30    0.9978         0.3395
Ширина дорожки по E = 0.6652 на 20 мм при H = 0.2 мм: 0.40 мм
```
{: .output data-label="Требуемый вывод"}

**Требования:**

1. Строки таблицы печатаются в цикле по списку высот слоя; расчет — через функцию `e_for` из задания 1.
1. Столбцы выровнены с помощью f-строк с шириной поля.
1. Ширина дорожки получается из формулы раздела 1, решенной относительно *W*; число 0.40 в программе не записывается.
1. Ответьте на вопросы мини-теста ниже и вставьте полученный комментарий в конец файла.

{% capture code %}
import math


def e_for(L, W=0.4, H=0.2, d=1.75):
    return L * W * H / (math.pi * (d / 2) ** 2)


print("Подача нити на отрезок 20 мм, W = 0.4 мм")
# заголовок и строки таблицы в цикле по списку высот слоя; f-строки с шириной поля

# обратная задача: выразите W из формулы раздела 1
{% endcapture %}{% capture expected %}
Подача нити на отрезок 20 мм, W = 0.4 мм
H, мм   нить 1.75 мм   нить 3 мм
0.10    0.3326         0.1132
0.15    0.4989         0.1698
0.20    0.6652         0.2264
0.25    0.8315         0.2829
0.30    0.9978         0.3395
Ширина дорожки по E = 0.6652 на 20 мм при H = 0.2 мм: 0.40 мм
{% endcapture %}{% include pyrun.html file="task_1-2_table.py" code=code expected=expected %}

<div class="quiz" data-file="task_1-2_table.py" data-comment="#">
<p class="quiz__title">Вопросы к итоговому заданию</p>
<p class="quiz__intro">После верных ответов скопируйте комментарий в конец файла <code>task_1-2_table.py</code>.</p>
<div class="quiz__q">
<p>1. Где в просмотрщике из task 1-1 видна ширина дорожки, рассчитанная в обратной задаче?</p>
<label><input type="radio"> В поле «Диаметр нити»: просмотрщик подбирает диаметр под ширину дорожки.</label>
<label><input type="radio" data-ok> В статистике «Ширина дорожки по E, мм»: она равна «E на 1 мм пути», умноженной на сечение нити и деленной на высоту слоя.</label>
<label><input type="radio"> В подписи к ползунку «Слой»: там указана толщина линии.</label>
<p class="quiz__exp" hidden>Просмотрщик решает ту же обратную задачу: из подачи на 1 мм пути и сечения нити он получает площадь сечения дорожки, а затем делит ее на высоту слоя.</p>
</div>
<div class="quiz__q">
<p>2. Почему просмотрщику для этого нужна высота слоя?</p>
<label><input type="radio" data-ok> Подача задает только площадь сечения дорожки W · H; чтобы выделить ширину, площадь нужно разделить на высоту, а ее просмотрщик берет как шаг Z между слоями.</label>
<label><input type="radio"> Высота слоя входит в сечение нити π · (d / 2)².</label>
<label><input type="radio"> Без высоты слоя нельзя посчитать число слоев, а от него зависит ширина дорожки.</label>
<p class="quiz__exp" hidden>В формуле подачи ширина и высота входят только произведением W · H. Одно число E не позволяет разделить их; второе уравнение дает шаг Z.</p>
</div>
<div class="quiz__bar"><button type="button" class="tool-btn tool-btn--main quiz__check">Проверить</button><span class="quiz__status"></span></div>
<div class="quiz__result" hidden><p>Комментарий для вставки в файл:</p><pre class="quiz__comment"></pre><div class="quiz__bar"><button type="button" class="tool-btn quiz__copy">Скопировать</button><span class="quiz__copied"></span></div></div>
</div>

</section>

<!-- ===================== ЗАТЕМ ===================== -->

<section class="then" markdown="1">

## Затем
{: .then__title}

1. Внутри папки `pipeline_1` создайте папку `task_1_2`.
1. Переместите в нее все файлы этой страницы: <span class="task__file">task\_1-2\_1.py</span>, <span class="task__file">task\_1-2\_2.py</span> и <span class="task__file">task\_1-2\_table.py</span>.
{: .steps}

Итоговая структура папок должна выглядеть так:

```text
ivanov_ii/
└── pipeline_1/
    ├── task_1_1/
    │   ├── task_1-1_1.gcode
    │   ├── task_1-1_2.gcode
    │   └── task_1-1_fix.gcode
    └── @@task_1_2/@@
        ├── task_1-2_1.py
        ├── task_1-2_2.py
        └── task_1-2_table.py
```
{: .folder-tree}

</section>

<section class="section sources" markdown="1">

## Источники
{: .section__title}

1. Gibson I., Rosen D., Stucker B., Khorasani M. Additive Manufacturing Technologies. 3rd ed. Springer, 2021 — п. 6.2 и 6.3: ур. 6.1–6.3, Fig. 6.1 (p. 174–175), управление подачей (p. 181–183), толщина слоя (п. 3.3, p. 60; п. 6.6, p. 192).
1. Redwood B., Schöffer F., Garret B. The 3D Printing Handbook. 3D Hubs, 2017 — гл. 2: п. 2.2.1 (параметры принтера), 2.2.3 (овальная дорожка), 2.4 (диаметр нити).
1. Diegel O., Nordin A., Motte D. A Practical Guide to Design for Additive Manufacturing. Springer, 2020 — п. 8.1.5 (p. 106): пример дорожки шириной 0,4 мм.
{: .sources__list}

</section>
