"""Индексы сайта: поиск assets/js/search-index.js (читает search.js) и задания assets/js/tasks-index.js
(читает settings.js: меню «Только задачи» и прогресс).

Запуск: python tools/build_search.py <собранный сайт> [<репозиторий>]

Читает собранные страницы (index.html, task_N/*.html, страницы инструментов), делит текст
<main> на разделы по заголовкам h2–h4 и пишет window.ADD3D_SEARCH = [{u, p, s, t}, …]:
адрес раздела, страница, заголовок раздела, текст (с кодом окон Python). Файл кладется
в assets/js собранного сайта и, если указан репозиторий, в его assets/js: на GitHub Pages
индекс приходит из репозитория, поэтому после правки страниц его нужно пересобрать
(build_site.py Skill делает это сам). Только стандартная библиотека.

tasks-index.js: window.ADD3D_TASKS = [{w, u, id, code, title, parts}, …] по всем заданиям страниц
task_N-*.html (кроме необязательных task--star): номер занятия, страница, id блока, код «2-3.1» или
«2-3.И», название, число проверяемых частей — окна Python с тестами, мини-тесты и таблицы
«Проверьте себя» с G-кодом (их проверяет gcheck.js). Задание решено, когда пройдены все части.
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

SKIP = {"script", "style", "svg", "nav", "button", "template"}
SKIP_CLASS = ("page-tools", "view-banner", "theory-switch")                # панель показа страницы: не текст страницы
VOID = {"br", "img", "input", "meta", "hr", "link", "source", "wbr", "col", "area"}


class Sections(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = 0; self.skip = 0; self.head = None
        self.title = ""; self.in_title = False
        self.secs = [["", "", []]]                         # [id, заголовок, куски текста]
        self.stack = []                                    # открытые теги main: (тег, пропускается ли)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "main": self.in_main += 1
        if not self.in_main: return
        cls = a.get("class") or ""
        hide = tag in SKIP or any(c in cls.split() for c in SKIP_CLASS)
        if tag not in VOID: self.stack.append((tag, hide))
        if hide: self.skip += 1
        elif re.fullmatch(r"h[2-4]", tag) and not self.skip:
            self.secs.append([a.get("id", ""), "", []]); self.head = tag

    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "main": self.in_main -= 1
        if not self.in_main: return
        while self.stack:                                  # закрыть до парного тега (HTML прощает незакрытые)
            t, hide = self.stack.pop()
            if hide and self.skip: self.skip -= 1
            if t == tag: break
        if tag == self.head: self.head = None

    def handle_data(self, data):
        if self.in_title: self.title += data
        if not self.in_main or self.skip: return
        if self.head: self.secs[-1][1] += data
        else: self.secs[-1][2].append(data)


GKEYS = ("Слоев", "Нить E, мм", "E на 1 мм пути", "Путь печати, м", "Холостые, м", "Высота слоя, мм", "Масса, г")
OPEN = re.compile(r'<(article|section)\b[^>]*class="(task[^"]*|final-task|capstone)"[^>]*id="([^"]+)"[^>]*>')


def block(html, m):
    """Текст элемента от открывающего тега до парного закрывающего."""
    tag, depth, i = m.group(1), 1, m.end()
    for t in re.finditer(r"<(/?)" + tag + r"\b", html[i:]):
        depth += -1 if t.group(1) else 1
        if not depth: return html[m.start():i + t.start()]
    return html[m.start():]


def tasks(site):
    out = []
    for f in sorted(site.glob("task_*/task_*-*.html")):
        html = f.read_text(encoding="utf-8"); page = f.stem.replace("task_", "")
        for m in OPEN.finditer(html):
            if "task--star" in m.group(2): continue
            b = block(html, m)
            h = re.search(r"<h[23][^>]*>(.*?)</h[23]>", b, re.S)
            raw = re.sub(r"<span class=\"level.*?</span>", "", h.group(1), flags=re.S) if h else ""
            raw = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", raw)).strip()
            t = re.match(r"Задание\s+(\d+)\.\s*(.*)", raw)
            code = page + "." + (t.group(1) if t else "И")
            title = t.group(2) if t else re.sub(r"^(Общее итоговое|Итоговое) задание:\s*", "", raw)
            parts = b.count('class="pyrun__btn pyrun__check"') + b.count('<div class="quiz"')
            for c in re.finditer(r'<div class="check[^"]*"[^>]*>(.*?)</table>', b, re.S):
                ths = re.findall(r"<th[^>]*>(.*?)</th>", c.group(1))
                if ths[:2] == ["Показатель", "Значение"] and any(f"<td>{k}</td>" in c.group(1) for k in GKEYS): parts += 1
            out.append({"w": int(page.split("-")[0]), "u": f.relative_to(site).as_posix(), "id": m.group(3), "code": code, "title": title, "parts": parts})
    return out


def main():
    site = Path(sys.argv[1])
    pages = [site / "index.html"] + sorted(site.glob("task_*/*.html")) + sorted(p for p in site.glob("*.html") if p.name != "index.html")
    out = []
    for f in pages:
        if not f.exists(): continue
        p = Sections(); p.feed(f.read_text(encoding="utf-8"))
        page = p.title.split("|")[0].strip()
        url = f.relative_to(site).as_posix()
        for sid, head, parts in p.secs:
            text = re.sub(r"\s+", " ", " ".join(parts)).strip()
            head = re.sub(r"\s+", " ", head).strip()
            if not text and not head: continue
            out.append({"u": url + ("#" + sid if sid else ""), "p": page, "s": head, "t": text[:6000]})
    js = "/* Индекс поиска: собирает tools/build_search.py, вручную не правится. */\nwindow.ADD3D_SEARCH = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    targets = [site / "assets/js/search-index.js"] + ([Path(sys.argv[2]) / "assets/js/search-index.js"] if len(sys.argv) > 2 else [])
    for t in targets: t.write_text(js, encoding="utf-8")
    tl = tasks(site)
    tj = "/* Задания сайта: собирает tools/build_search.py, вручную не правится. */\nwindow.ADD3D_TASKS = " + json.dumps(tl, ensure_ascii=False, separators=(",", ":")) + ";\n"
    for t in targets: t.with_name("tasks-index.js").write_text(tj, encoding="utf-8")
    print(f"индекс заданий: {len(tl)} заданий")
    print(f"индекс поиска: {len(out)} разделов, {len(js) // 1024} КБ")


if __name__ == "__main__":
    main()
