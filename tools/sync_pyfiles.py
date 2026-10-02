"""Копии модулей и моделей для окон Python (_includes/files) против assets/files.

Запуск: python tools/sync_pyfiles.py [--fix]
Для каждой страницы с полями pymods и pyfiles: _includes/files/<модуль> совпадает с assets/files,
_includes/files/<модель>.b64 равен base64 файла из assets/files. С --fix копии пересоздаются.
Код выхода 1 при расхождении (без --fix).
"""
import base64, re, sys
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
fix, bad, need = "--fix" in sys.argv, 0, {}
for p in repo.glob("**/*.md"):
    if "_site" in p.parts or "vendor" in p.parts: continue
    s = p.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---", s, re.S)
    if not m: continue
    for key in ("pymods", "pyfiles"):
        v = re.search(rf'^{key}:\s*"?([^"\n]+)"?', m.group(1), re.M)
        if v:
            for name in v.group(1).split(","):
                need[name.strip()] = key
for name, key in sorted(need.items()):
    src = repo / "assets/files" / name
    if key == "pymods":
        dst, data = repo / "_includes/files" / name, src.read_text(encoding="utf-8")
    else:
        dst, data = repo / "_includes/files" / (name + ".b64"), base64.b64encode(src.read_bytes()).decode()
    ok = dst.exists() and dst.read_text(encoding="utf-8") == data
    if not ok and fix: dst.write_text(data, encoding="utf-8"); ok = True; print(f"обновлен {dst.relative_to(repo)}")
    if not ok: bad += 1; print(f"{dst.relative_to(repo)}: нет или отличается от assets/files/{name}")
print(f"проверено копий: {len(need)}; " + ("расхождений нет" if not bad else f"расхождений: {bad}"))
sys.exit(1 if bad else 0)
