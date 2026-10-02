---
title: "Проверка кода Python"
kicker: "Инструменты · tool"
head_title: "Проверка кода Python"
tool: true
show_author: false
---

<section class="section" markdown="1">

## Что это
{: .section__title}

Окно, в котором любую программу занятия можно запустить, не выходя из браузера. Код выполняется настоящим интерпретатором CPython 3.12, собранным для браузера (Pyodide): результат такой же, как в терминале. Такие же окна встроены в задания; здесь оно общее, без требуемого вывода.

- Вставьте код и нажмите «Запустить». Вывод появится под окном; ошибка покажет последние строки сообщения интерпретатора.
- Модули `gen.py` и `stats.py` уже подключены: работают `from gen import square_part` и `from stats import gcode_stats`, а файлы `square.gcode` и `scaffold.gcode` созданы заранее.
- Файлы, которые записала программа, перечисляются под окном: G-код можно открыть в просмотрщике ниже, остальные — скачать.
{: .checklist}

</section>

{% capture code %}
from gen import square_part
from stats import gcode_stats

open("square_30.gcode", "w").write(square_part(infill=0.3))
print(gcode_stats("square_30.gcode"))
{% endcapture %}{% include pyrun.html code=code title="Запуск кода" %}

<aside class="callout callout--warning" markdown="1">

Ограничения
{: .callout__title}

- При первом запуске загружается интерпретатор, около 10 МБ: нужен интернет; дальше работа идет без сети.
- Код выполняется в основном потоке страницы: программа с бесконечным циклом подвесит вкладку, ее придется закрыть.
- Доступны стандартная библиотека и два модуля занятия; сторонние пакеты (например, FullControl) не установить. Ввод `input()` работает только в окнах заданий, где строки ввода заданы заранее.
- Файлы живут в памяти страницы и исчезают после ее перезагрузки; файл для сдачи сохраняйте у себя.
- Проверка в окне не заменяет запуск на своем компьютере: преподаватель проверяет файлы из вашей папки.

</aside>

<section class="section" markdown="1">

## Просмотрщик
{: .section__title}

{% include gcode-viewer.html presets="square,scaffold" %}

</section>
