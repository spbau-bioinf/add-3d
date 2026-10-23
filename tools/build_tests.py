"""Тесты кнопки «Проверить» окон Python: ответы считаются по эталонным решениям.

Запуск: python tools/build_tests.py <репозиторий> N --solutions <папка эталонов> [--check]

Спецификации лежат в _data/tests/task_N-M.json (по файлу на страницу, ключ — имя файла окна):
  {"task_2-3_1.py": {"order": "any", "prefix": true,      // необязательные поля сравнения
                     "tests": [{"note": "модель из условия"},
                               {"note": "другая модель", "files": {"holed.stl": "finger.stl"}},
                               {"note": "…", "set": {"W": "0.5"}},
                               {"note": "…", "input": "0.8\\n15\\n30"},
                               {"note": "…", "call": "print(len(holes(faces)))"}]}}
Для каждого теста эталон <файл окна> из папки эталонов (поиск по имени во вложенных папках)
запускается в пустой папке с файлами assets/files так же, как в браузере (assets/js/pyrun.js):
замены файлов, подстановка строк «имя = …», ввод без печати приглашений, код call после
программы (печатается только его вывод). Вывод записывается в поле "output".

Проверки (код выхода 1 при ошибке):
  * первый тест без подстановок совпадает с «Требуемым выводом» окна на странице;
  * файлы для замен есть на странице (pymods, pyfiles, gen.py → square.gcode и scaffold.gcode);
  * у каждого окна задания с «Требуемым выводом» есть тесты (окна примеров и листинги модулей
    не проверяются);
  * эталон не падает ни на одном тесте.
С --check файлы не переписываются, а сверяются: ответы в _data/tests должны совпасть с эталонами.
"""
import json, re, shutil, subprocess, sys, tempfile, os
os.environ.setdefault("PYTHONUTF8", "1"); os.environ.setdefault("PYTHONIOENCODING", "utf-8")   # дочерние Python печатают в UTF-8 и на Windows
from pathlib import Path

HARNESS = r'''
import builtins, contextlib, io, re, runpy, sys
spec = __import__("json").loads(sys.argv[1])
lines = spec.get("input", "").split("\n") if spec.get("input", "") != "" else []
def _input(prompt=""):
    if not lines: raise EOFError("EOF when reading a line")
    return lines.pop(0)
builtins.input = _input
sys.argv = [spec["file"]]
code = open(spec["file"], encoding="utf-8").read()
for name, value in spec.get("set", {}).items():
    code, n = re.subn(r"^" + name + r"\s*=.*$", name + " = " + value, code, count=1, flags=re.M)
    if not n: sys.exit("нет строки " + name + " = …")
open(spec["file"], "w", encoding="utf-8").write(code)
if spec.get("call"):
    with contextlib.redirect_stdout(io.StringIO()):
        g = runpy.run_path(spec["file"], run_name="__main__")
    exec(spec["call"], g)
else:
    runpy.run_path(spec["file"], run_name="__main__")
'''


def norm(t):
    t = re.sub(r"[ \t]+$", "", t.replace("\r", ""), flags=re.M)
    return t.strip("\n")


def page_windows(md):
    """Окна страницы: {файл: требуемый вывод или None} и файлы страницы."""
    s = md.read_text(encoding="utf-8")
    fm = re.match(r"---\n(.*?)\n---", s, re.S).group(1)
    def field(k, default):
        m = re.search(rf'^{k}:\s*"?([^"\n]*)"?', fm, re.M)
        return [x.strip() for x in (m.group(1) if m else default).split(",") if x.strip()]
    files = set(field("pymods", "gen.py,stats.py") + field("pyfiles", ""))
    if "gen.py" in files: files |= {"square.gcode", "scaffold.gcode"}
    wins = {}
    for m in re.finditer(r"\{% capture code %\}.*?\{% endcapture %\}(?:\{% capture expected %\}(.*?)\{% endcapture %\})?"
                         r"\{% include pyrun\.html file=\"([^\"]+)\"", s, re.S):
        wins[m.group(2)] = norm(m.group(1)) if m.group(1) is not None else None
    return wins, files


def run(sol, repo, test):
    d = Path(tempfile.mkdtemp())
    for f in (repo / "assets/files").iterdir():
        if f.is_file(): shutil.copy(f, d)
    shutil.copy(sol, d / sol.name)
    src = {dst: (d / s).read_bytes() for dst, s in test.get("files", {}).items()}
    for dst, data in src.items(): (d / dst).write_bytes(data)
    spec = dict(test, file=sol.name)
    r = subprocess.run([sys.executable, "-c", HARNESS, json.dumps(spec)], cwd=d, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    shutil.rmtree(d, ignore_errors=True)
    if r.returncode: return None, (r.stderr.strip().splitlines() or ["ошибка"])[-1]
    return norm(r.stdout), None


def main():
    repo, n = Path(sys.argv[1]), sys.argv[2]
    sols = Path(sys.argv[sys.argv.index("--solutions") + 1])
    check = "--check" in sys.argv
    bad = 0
    for md in sorted((repo / f"task_{n}").glob(f"task_{n}-*.md")):
        wins, files = page_windows(md)
        jf = repo / "_data/tests" / (md.stem + ".json")
        data = json.loads(jf.read_text(encoding="utf-8")) if jf.exists() else {}
        for win, exp in wins.items():
            if exp is not None and win not in data and win.startswith("task_") and "example" not in win:
                print(f"{md.stem}: окно {win} с требуемым выводом без тестов"); bad += 1
        for win, spec in data.items():
            if win not in wins: print(f"{jf.name}: на странице нет окна {win}"); bad += 1; continue
            cands = sorted(sols.rglob(win))
            if not cands: print(f"{jf.name}: нет эталона {win} в {sols}"); bad += 1; continue
            for i, t in enumerate(spec["tests"]):
                for s in t.get("files", {}).values():
                    if s not in files: print(f"{jf.name} {win} тест {i + 1}: файла {s} нет на странице (pyfiles)"); bad += 1
                out, err = run(cands[-1], repo, t)
                if err: print(f"{jf.name} {win} тест {i + 1}: эталон упал: {err}"); bad += 1; continue
                if i == 0 and wins[win] is not None and not any(k in t for k in ("files", "set", "input", "call")):
                    exp = wins[win]
                    got = out.split("\n")[:len(exp.split("\n"))] if spec.get("prefix") else out.split("\n")
                    a, b = (sorted(got), sorted(exp.split("\n"))) if spec.get("order") == "any" else (got, exp.split("\n"))
                    if a != b: print(f"{jf.name} {win}: эталон не совпал с «Требуемым выводом» страницы"); bad += 1
                if check:
                    if t.get("output") != out: print(f"{jf.name} {win} тест {i + 1}: ответ устарел"); bad += 1
                else:
                    t["output"] = out
            print(f"{md.stem} {win}: тестов {len(spec['tests'])}")
        if data and not check:
            jf.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("тесты в порядке" if not bad else f"замечаний: {bad}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
