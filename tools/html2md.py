#!/usr/bin/env python3
"""
Конвертер HTML-страниц практического занятия в Markdown-страницы для Jekyll.

Использование (из корня сайта):
    python tools/html2md.py <папка_с_html> [--site .]

Что делает:
  * для каждого task_N*.html создаёт task_N/task_N*.md;
  * боковое меню, шапку, подвал, кнопки «Предыдущая / Следующая» и подпись
    автора убирает — их рисует шаблон _layouts/default.html;
  * меню занятия записывает (или обновляет) в _data/nav.yml.

Требуется: pip install beautifulsoup4 lxml
"""
import argparse
import copy
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

# ---------------------------------------------------------------------------
# Настройки разметки
# ---------------------------------------------------------------------------

# Блоки-обёртки: превращаются в <tag class="..." markdown="1"> ... </tag>,
# а их содержимое пишется в Markdown.
CONTAINER_CLASSES = {
    "section", "subsection", "theory", "goal", "callout", "example", "task",
    "analysis", "definition", "overview", "then", "final-task", "capstone",
    "mistake", "compare",
}
# Блоки, которые остаются HTML как есть (схемы, синтаксис и т. п.).
RAW_CLASSES = {"diagram", "flow", "syntax"}

BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "details", "div", "dl",
    "fieldset", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul",
}

DEFAULT_CODE_LABEL = {"": "Код", "code-block--bad": "Неверно", "code-block--good": "Верно"}
DEFAULT_OUTPUT_LABEL = "Вывод терминала"
HIGHLIGHT = "@@"  # маркер выделения: @@35@@ -> ввод пользователя / новая папка


class Fallback(Exception):
    """Элемент нельзя аккуратно выразить в Markdown — оставляем HTML."""


# ---------------------------------------------------------------------------
# Строчная разметка
# ---------------------------------------------------------------------------

def escape_text(s: str) -> str:
    s = s.replace("\\", "\\\\")
    s = re.sub(r"&(?=[A-Za-z0-9#]+;)", "&amp;", s)
    s = s.replace("<", "&lt;").replace(">", "&gt;")
    for ch in "*_`[]|":
        s = s.replace(ch, "\\" + ch)
    s = s.replace("$$", "\\$\\$")
    s = s.replace("{:", "\\{:")
    s = s.replace("...", "\\...")
    s = re.sub(r"-(?=-)", r"\\-", s)
    s = s.replace("\u00a0", "&nbsp;")
    return s


def escape_line_start(s: str) -> str:
    """Экранирует начало строки, чтобы абзац не стал списком/заголовком."""
    if re.match(r"\d+\.\s", s):
        return re.sub(r"^(\d+)\.", r"\1\\.", s)
    if s[:1] in "#-+>=:^~":
        return "\\" + s
    return s


def attrs_html(el: Tag, drop=()) -> str:
    parts = []
    for k, v in el.attrs.items():
        if k in drop:
            continue
        if isinstance(v, list):
            v = " ".join(v)
        v = v.replace("&", "&amp;").replace('"', "&quot;")
        parts.append(f' {k}="{v}"')
    return "".join(parts)


def code_span(text: str) -> str:
    runs = [len(m) for m in re.findall(r"`+", text)]
    fence = "`" * (max(runs) + 1 if runs else 1)
    pad = " " if text.startswith("`") or text.endswith("`") else ""
    return f"{fence}{pad}{text}{pad}{fence}"


def wrap_emphasis(inner: str, mark: str) -> str:
    stripped = inner.strip()
    if not stripped:
        return inner
    lead = inner[: len(inner) - len(inner.lstrip())]
    trail = inner[len(inner.rstrip()):]
    return f"{lead}{mark}{stripped}{mark}{trail}"


def inline(nodes, ctx) -> str:
    out = []
    for n in nodes:
        if isinstance(n, Comment):
            continue
        if isinstance(n, NavigableString):
            out.append(escape_text(re.sub(r"[ \t\r\n]+", " ", str(n))))
            continue
        if not isinstance(n, Tag):
            continue
        name = n.name
        classes = n.get("class", [])
        if name in BLOCK_TAGS:
            raise Fallback(f"блочный <{name}> внутри строки")
        if name == "code" and not n.find(True) and not n.attrs:
            out.append(code_span(n.get_text()))
        elif name in ("strong", "b") and not n.attrs:
            out.append(wrap_emphasis(inline(n.children, ctx), "**"))
        elif name in ("em", "i") and not n.attrs:
            out.append(wrap_emphasis(inline(n.children, ctx), "*"))
        elif name == "a" and set(n.attrs) <= {"href"} and n.get("href"):
            href = n["href"]
            if re.search(r"[\s()<>]", href):
                href = f"<{href}>"
            out.append(f"[{inline(n.children, ctx)}]({href})")
        elif name == "span" and classes == ["user-input"]:
            out.append(HIGHLIGHT + escape_text(n.get_text()) + HIGHLIGHT)
        elif name == "br":
            out.append("<br>")
        else:
            out.append(f"<{name}{attrs_html(n)}>{inline(n.children, ctx)}</{name}>")
    return "".join(out)


def para_text(nodes, ctx) -> str:
    return escape_line_start(inline(nodes, ctx).strip())


# ---------------------------------------------------------------------------
# Блочная разметка
# ---------------------------------------------------------------------------

def ial(el: Tag, ctx, drop_classes=(), extra=None) -> str:
    """Строка атрибутов kramdown вида {: #id .class key="value"}."""
    bits = []
    el_id = el.get("id")
    if el_id and el_id not in ctx["drop_ids"]:
        bits.append("#" + el_id)
    for c in el.get("class", []):
        if c not in drop_classes:
            bits.append("." + c)
    for k, v in (extra or {}).items():
        v = v.replace("\\", "\\\\").replace('"', '\\"')
        bits.append(f'{k}="{v}"')
    return "{: " + " ".join(bits) + "}" if bits else ""


def pre_text(pre: Tag) -> str:
    parts = []
    for n in pre.descendants:
        if isinstance(n, Comment):
            continue
        if isinstance(n, NavigableString):
            parent = n.parent
            hl = parent.name == "span" and set(parent.get("class", [])) & {"user-input", "tree-new"}
            parts.append(HIGHLIGHT + str(n) + HIGHLIGHT if hl else str(n))
    return "".join(parts).rstrip("\n")


def fenced(text: str, lang: str, attrs: str) -> str:
    runs = [len(m) for m in re.findall(r"^`{3,}", text, re.M)]
    fence = "`" * max(3, max(runs, default=0) + 1)
    block = f"{fence}{lang}\n{text}\n{fence}"
    return block + ("\n" + attrs if attrs else "")


def guess_lang(label: str, text: str) -> str:
    if "Терминал" in label:
        return "text"
    if text.lstrip().startswith("{") and '":' in text:
        return "json"
    return "python"


def code_block(div: Tag, ctx) -> str:
    classes = div.get("class", [])
    label_el = div.find(class_="code-block__label", recursive=False)
    label = label_el.get_text(" ", strip=True) if label_el else ""
    pre = div.find("pre", recursive=False)
    if pre is None or len([c for c in div.find_all(True, recursive=False)]) > 2:
        raise Fallback("нестандартный code-block")
    text = pre_text(pre)
    variant = next((c for c in classes if c.startswith("code-block--")), "")
    extra = {} if label == DEFAULT_CODE_LABEL.get(variant) else {"data-label": label}
    attrs = ial(div, ctx, drop_classes={"code-block"}, extra=extra)
    return fenced(text, guess_lang(label, text), attrs)


def output_block(div: Tag, ctx) -> str:
    label_el = div.find(class_="output__label", recursive=False)
    label = label_el.get_text(" ", strip=True) if label_el else ""
    pre = div.find("pre", recursive=False)
    if pre is None or len(div.find_all(True, recursive=False)) > 2:
        raise Fallback("нестандартный output")
    extra = {} if label == DEFAULT_OUTPUT_LABEL else {"data-label": label}
    return fenced(pre_text(pre), "text", ial(div, ctx, extra=extra))


def list_block(el: Tag, ctx, indent: str = "") -> str:
    if el.get("start") or el.get("type") or el.get("reversed"):
        raise Fallback("нумерация списка")
    marker = "- " if el.name == "ul" else "1. "
    pad = " " * len(marker)
    lines = []
    for li in el.find_all(recursive=False):
        if li.name != "li" or li.attrs:
            raise Fallback("элемент списка с атрибутами")
        inline_nodes, sublists = [], []
        for c in li.children:
            if isinstance(c, Tag) and c.name in ("ul", "ol"):
                sublists.append(c)
            elif isinstance(c, Tag) and c.name in BLOCK_TAGS:
                raise Fallback("блок внутри пункта списка")
            else:
                if sublists and (isinstance(c, Tag) or str(c).strip()):
                    raise Fallback("текст после вложенного списка")
                inline_nodes.append(c)
        lines.append(indent + marker + para_text(inline_nodes, ctx))
        for sub in sublists:
            if sub.attrs:
                raise Fallback("вложенный список с атрибутами")
            lines.append(list_block(sub, ctx, indent + pad))
    return "\n".join(lines)


def table_block(t: Tag, ctx) -> str:
    if t.find("caption") or t.find(attrs={"colspan": True}) or t.find(attrs={"rowspan": True}):
        raise Fallback("сложная таблица")
    thead, tbody = t.find("thead"), t.find("tbody")
    if not thead or not tbody or len(thead.find_all("tr")) != 1 or tbody.find("th"):
        raise Fallback("таблица без простой шапки")
    head = [para_text(c.children, ctx) for c in thead.tr.find_all(["th", "td"])]
    rows = []
    for tr in tbody.find_all("tr", recursive=False):
        cells = tr.find_all(["td", "th"], recursive=False)
        if len(cells) != len(head) or tr.attrs:
            raise Fallback("неровная таблица")
        rows.append([para_text(c.children, ctx) for c in cells])
    lines = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    lines += ["| " + " | ".join(r) + " |" for r in rows]
    attrs = ial(t, ctx, drop_classes={"data-table"})
    return "\n".join(lines) + ("\n" + attrs if attrs else "")


def raw_html(el: Tag) -> str:
    el = copy.copy(el)
    if el.name == "div" and "table-scroll" in el.get("class", []):
        inner = el.find_all(True, recursive=False)
        if len(inner) == 1:
            el = inner[0]  # обёртку добавит шаблон
    for wrap in el.select("div.table-scroll"):
        wrap.unwrap()
    tables = [el] if el.name == "table" else el.find_all("table")
    for t in tables:
        cls = [c for c in t.get("class", []) if c != "data-table"]
        if cls:
            t["class"] = cls
        elif "class" in t.attrs:
            del t["class"]
    for tag in [el] + el.find_all(True):
        tag.attrs.pop("aria-labelledby", None)
    return str(el)


def container(el: Tag, ctx) -> str:
    for c in el.children:
        if isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip():
            raise Fallback("текст прямо в контейнере")
        if isinstance(c, Tag) and c.name not in BLOCK_TAGS:
            raise Fallback(f"строчный <{c.name}> прямо в контейнере")
    attrs = attrs_html(el, drop=("aria-labelledby",))
    body = blocks(el.children, ctx)
    return f'<{el.name}{attrs} markdown="1">\n\n{body}\n\n</{el.name}>'


def block(el: Tag, ctx) -> str:
    classes = set(el.get("class", []))
    name = el.name

    if classes & RAW_CLASSES:
        return raw_html(el)
    if name == "div" and "table-scroll" in classes:
        inner = el.find_all(True, recursive=False)
        if len(inner) == 1 and inner[0].name == "table":
            return block(inner[0], ctx)
        return raw_html(el)
    if name == "ol" and "toc" in classes and ctx.get("toc_include"):
        return "{% include toc.html %}"
    if name == "div" and "code-block" in classes:
        return code_block(el, ctx)
    if name == "div" and "output" in classes:
        return output_block(el, ctx)
    if name == "pre" and "folder-tree" in classes:
        return fenced(pre_text(el), "text", ial(el, ctx))
    if name in ("section", "article", "aside", "div") and classes & CONTAINER_CLASSES:
        return container(el, ctx)
    if name in ("h2", "h3", "h4", "h5", "h6"):
        text = inline(el.children, ctx).strip()
        text = re.sub(r"#$", r"\\#", text)
        attrs = ial(el, ctx)
        return "#" * int(name[1]) + " " + text + ("\n" + attrs if attrs else "")
    if name == "p":
        attrs = ial(el, ctx)
        return para_text(el.children, ctx) + ("\n" + attrs if attrs else "")
    if name in ("ul", "ol"):
        attrs = ial(el, ctx)
        return list_block(el, ctx) + ("\n" + attrs if attrs else "")
    if name == "table":
        return table_block(el, ctx)
    raise Fallback(f"неизвестный блок <{name} class={sorted(classes)}>")


def blocks(nodes, ctx) -> str:
    out = []
    prev_list = False
    for n in nodes:
        if isinstance(n, Comment):
            out.append(f"<!--{n}-->")
            prev_list = False
            continue
        if not isinstance(n, Tag):
            continue
        if n.name == "nav" and "pager" in n.get("class", []):
            continue
        if n.name == "p" and "author" in n.get("class", []):
            continue
        try:
            md = block(n, ctx)
        except Fallback as why:
            ctx["fallbacks"].append(f"{n.name}.{'.'.join(n.get('class', []))}: {why}")
            md = raw_html(n)
        is_list = n.name in ("ul", "ol") and not md.startswith("<")
        if is_list and prev_list:
            out.append("^")
        out.append(md)
        prev_list = is_list
    return "\n\n".join(out)


# ---------------------------------------------------------------------------
# Страница целиком
# ---------------------------------------------------------------------------

def yaml_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def page_inner_html(el: Tag) -> str:
    return "".join(str(c) for c in el.children).strip()


def convert_page(path: Path, work: int, work_title: str, site_title: str):
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")
    main = soup.find("main")
    current = soup.select_one(".menu__link--current .menu__code")
    code = current.get_text(strip=True) if current else path.stem.replace("_", " ")
    h1 = soup.select_one(".page-header__title")
    title = page_inner_html(h1)
    kicker = soup.select_one(".page-header__kicker").get_text(strip=True)
    head_title = soup.title.get_text(strip=True)

    ref_ids = {i for el in soup.find_all(attrs={"aria-labelledby": True})
               for i in el["aria-labelledby"].split()}
    linked = {a["href"][1:] for a in soup.find_all("a", href=True) if a["href"].startswith("#")}
    ctx = {"drop_ids": ref_ids - linked, "fallbacks": [], "toc_include": True}

    fm = ["---", f"work: {work}", f"code: {yaml_str(code)}", f"title: {yaml_str(title)}"]
    if kicker != f"{work_title} · {code}":
        fm.append(f"kicker: {yaml_str(kicker)}")
    default_head = f"{code[:1].upper()}{code[1:]}. {h1.get_text()} | {site_title}"
    if head_title != default_head:
        fm.append(f"head_title: {yaml_str(head_title.removesuffix(' | ' + site_title))}")
    if not main.find(class_="author"):
        fm.append("show_author: false")
    fm.append("---")

    body = blocks(main.children, ctx)
    body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"
    return "\n".join(fm) + "\n\n" + body, ctx["fallbacks"]


def read_nav(path: Path, work: int):
    folder = f"task_{work}/"
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")
    tags = {}
    for item in soup.select(".toc__item"):
        link = item.select_one(".toc__link")
        tag = item.select_one(".toc__tag")
        if link and tag:
            tags[link["href"]] = tag.get_text(strip=True)
    pages = []
    for li in soup.select(".menu__item"):
        a = li.select_one(".menu__link")
        entry = {
            "url": folder + a["href"],
            "code": a.select_one(".menu__code").get_text(strip=True),
            "title": page_inner_html(a.select_one(".menu__title")),
        }
        if "menu__item--extra" in li.get("class", []):
            entry["extra"] = True
        if a["href"] in tags:
            entry["tag"] = tags[a["href"]]
        if not pages:
            entry["menu_title"] = "Навигация по занятию"
        pages.append(entry)
    return pages


def nav_yaml(work: int, work_title: str, pages, extra_lines=()) -> str:
    lines = [f"- work: {work}", f"  title: {yaml_str(work_title)}"]
    lines += list(extra_lines)
    lines.append("  pages:")
    for p in pages:
        lines.append(f"    - url: {p['url']}")
        lines.append(f"      code: {yaml_str(p['code'])}")
        lines.append(f"      title: {yaml_str(p['title'])}")
        if p.get("menu_title"):
            lines.append(f"      menu_title: {yaml_str(p['menu_title'])}")
        if p.get("extra"):
            lines.append("      extra: true")
        if p.get("tag"):
            lines.append(f"      tag: {yaml_str(p['tag'])}")
    return "\n".join(lines) + "\n"


def work_extra_lines(nav_file: Path, work: int):
    """Поля занятия, заданные вручную (description, tags, image…), сохраняются."""
    if not nav_file.exists():
        return []
    for chunk in re.split(r"(?m)^(?=- work: )", nav_file.read_text(encoding="utf-8")):
        if chunk.startswith(f"- work: {work}\n"):
            head = chunk.split("\n  pages:")[0].splitlines()[1:]
            return [l for l in head if not l.startswith("  title:")]
    return []


def update_nav_file(nav_file: Path, work: int, block_text: str):
    text = nav_file.read_text(encoding="utf-8") if nav_file.exists() else ""
    chunks = re.split(r"(?m)^(?=- work: )", text)
    header = chunks[0] if chunks and not chunks[0].startswith("- work:") else ""
    works = [c for c in chunks if c.startswith("- work:")]
    works = [c for c in works if not c.startswith(f"- work: {work}\n")]
    works.append(block_text)
    works.sort(key=lambda c: int(re.match(r"- work: (\d+)", c).group(1)))
    nav_file.write_text(header + "\n".join(w.rstrip("\n") + "\n" for w in works), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", help="папка с HTML-файлами одного занятия")
    ap.add_argument("--site", default=".", help="корень сайта (где лежит _config.yml)")
    args = ap.parse_args()

    src, site = Path(args.src), Path(args.site)
    files = sorted(src.glob("task_*.html"))
    hub = [f for f in files if re.fullmatch(r"task_\d+\.html", f.name)]
    if not hub:
        sys.exit("Не найден файл навигации вида task_N.html")
    hub = hub[0]
    work = int(re.search(r"\d+", hub.stem).group())

    site_title = "Язык программирования Python"
    cfg = site / "_config.yml"
    if cfg.exists():
        m = re.search(r'(?m)^title:\s*"?(.*?)"?\s*$', cfg.read_text(encoding="utf-8"))
        if m:
            site_title = m.group(1)

    sub = next(f for f in files if f != hub)
    kicker = BeautifulSoup(sub.read_text(encoding="utf-8"), "lxml").select_one(".page-header__kicker")
    work_title = kicker.get_text(strip=True).split(" · ")[0]

    out_dir = site / f"task_{work}"
    out_dir.mkdir(exist_ok=True)
    for f in files:
        md, fallbacks = convert_page(f, work, work_title, site_title)
        (out_dir / f.with_suffix(".md").name).write_text(md, encoding="utf-8")
        note = f" (оставлено HTML: {len(fallbacks)})" if fallbacks else ""
        print(f"{f.name} -> {out_dir.name}/{f.with_suffix('.md').name}{note}")
        for fb in fallbacks:
            print("   ·", fb)

    nav_dir = site / "_data"
    nav_dir.mkdir(exist_ok=True)
    nav_file = nav_dir / "nav.yml"
    extra = work_extra_lines(nav_file, work)
    update_nav_file(nav_file, work, nav_yaml(work, work_title, read_nav(hub, work), extra))
    print(f"_data/nav.yml: меню занятия {work} обновлено")


if __name__ == "__main__":
    main()
