/* theme.js — настройки показа сайта: тема, цветовой профиль, объем теории, режим «Только задачи».
   Подключается в <head> без defer, чтобы атрибуты и цвета стояли до отрисовки.

   Настройка   значения (первое — по умолчанию)        что делает
   theme       light, dark                              data-theme="dark" у <html>
   pl, pd      default или ключ профиля из PALETTES      цветовой профиль для светлой (pl) и темной (pd) темы:
                                                        переменные цветов ставятся в style у <html>
   theory      full, brief                              data-theory="brief": блоки .th-full скрыты («Кратко»)
   view        all, tasks                               data-view="tasks": видны только задания («Только задачи»)

   Меняет их settings.js (меню ⚙) через window.add3dSetting(имя, значение); кнопка .theme-btn
   переключает тему. Таблица профилей — PALETTES (цвета редакторов кода, как в практике по Python):
   [ключ, название, тема, где встречается, [фон, поверхность, граница, текст, текст 2, акцент,
   фон кода, текст кода, ключевое слово, встроенная функция, число, строка, оператор, комментарий]].

   Где хранится выбор:
   * localStorage, ключи add3d-<настройка>. На сайте (http, https) хранилище общее для всех страниц.
   * Параметры адреса ?theme=…&pl=…. При открытии сайта с диска (file://) браузеры на основе Firefox
     дают каждой странице свое хранилище, и выбор не переходил бы на другие страницы. Поэтому на
     file:// скрипт дописывает параметры к внутренним ссылкам при щелчке, а следующая страница читает
     их, сохраняет и убирает из адресной строки. */
(function () {
  "use strict";
  /* palettes:begin — таблица из практики по Python (scripts/build_palettes.py того Skill) */
  var PALETTES = [["vscode-light", "Light+", "light", "VS Code", ["#F8F8F8", "#FFFFFF", "#E5E5E5", "#1F1F1F", "#4D4D4D", "#005FB8", "#FFFFFF", "#000000", "#AF00DB", "#795E26", "#098658", "#A31515", "#000000", "#008000"]], ["vscode-dark", "Dark+", "dark", "VS Code", ["#1F1F1F", "#252526", "#3C3C3C", "#CCCCCC", "#A6A6A6", "#55A4FF", "#1E1E1E", "#D4D4D4", "#C586C0", "#DCDCAA", "#B5CEA8", "#CE9178", "#D4D4D4", "#6A9955"]], ["intellij", "IntelliJ Light", "light", "PyCharm", ["#F7F8FA", "#FFFFFF", "#EBECF0", "#1E1F22", "#494B57", "#2F66D4", "#FFFFFF", "#080808", "#0033B3", "#000080", "#1750EB", "#067D17", "#080808", "#737373"]], ["darcula", "Darcula", "dark", "PyCharm", ["#1E1F22", "#2B2D30", "#393B40", "#DFE1E5", "#B4B8BF", "#80A8F9", "#2B2B2B", "#A9B7C6", "#CF803E", "#8C8CC8", "#6897BB", "#809972", "#A9B7C6", "#939393"]], ["github-light", "GitHub Light", "light", "github.com, VS Code", ["#F6F8FA", "#FFFFFF", "#D1D9E0", "#1F2328", "#59636E", "#0969DA", "#F6F8FA", "#1F2328", "#CF222E", "#8250DF", "#0550AE", "#0A3069", "#CF222E", "#6B737D"]], ["github-dark", "GitHub Dark", "dark", "github.com, VS Code", ["#0D1117", "#151B23", "#3D444D", "#E6EDF3", "#9198A1", "#4A96F8", "#151B23", "#E6EDF3", "#FF7B72", "#D2A8FF", "#79C0FF", "#A5D6FF", "#FF7B72", "#8B949E"]], ["one-light", "One Light", "light", "Atom, VS Code", ["#FAFAFA", "#FFFFFF", "#DBDBDC", "#383A42", "#5C5F69", "#3767CF", "#FAFAFA", "#383A42", "#A626A4", "#986801", "#986801", "#3F7F3E", "#0178AB", "#707175"]], ["one-dark", "One Dark Pro", "dark", "Atom, VS Code", ["#282C34", "#2C313A", "#3E4451", "#D7DAE0", "#ABB2BF", "#74B9F1", "#21252B", "#ABB2BF", "#C678DD", "#E5C07B", "#D19A66", "#98C379", "#56B6C2", "#878B95"]], ["latte", "Catppuccin Latte", "light", "VS Code, JetBrains", ["#EFF1F5", "#FFFFFF", "#CCD0DA", "#4C4F69", "#5C5F77", "#8839EF", "#E6E9EF", "#4C4F69", "#8437E8", "#1B5DDF", "#B24608", "#2F751F", "#036F99", "#666879"]], ["mocha", "Catppuccin Mocha", "dark", "VS Code, JetBrains", ["#1E1E2E", "#313244", "#45475A", "#CDD6F4", "#BAC2DE", "#CDA9F7", "#181825", "#CDD6F4", "#CBA6F7", "#89B4FA", "#FAB387", "#A6E3A1", "#89DCEB", "#9399B2"]], ["dracula", "Dracula", "dark", "почти все редакторы", ["#282A36", "#343746", "#44475A", "#F8F8F2", "#C9CBD9", "#CDADFA", "#21222C", "#F8F8F2", "#FF79C6", "#8BE9FD", "#BD93F9", "#F1FA8C", "#FF79C6", "#7E8BB4"]], ["monokai", "Monokai", "dark", "Sublime Text, VS Code", ["#272822", "#32332C", "#49483E", "#F8F8F2", "#CFCFC2", "#A6E22E", "#1E1F1C", "#F8F8F2", "#F9337A", "#66D9EF", "#AE81FF", "#E6DB74", "#F9337A", "#8A8676"]], ["nord", "Nord", "dark", "почти все редакторы", ["#2E3440", "#3B4252", "#4C566A", "#ECEFF4", "#D8DEE9", "#A8D1DD", "#242933", "#D8DEE9", "#81A1C1", "#88C0D0", "#B48EAD", "#A3BE8C", "#81A1C1", "#8791A5"]], ["material-lighter", "Material Lighter", "light", "VS Code, JetBrains", ["#FAFAFA", "#FFFFFF", "#E0E0E0", "#37474F", "#546E7A", "#007782", "#F5F5F5", "#37474F", "#784BF7", "#526E9C", "#B45034", "#5D7639", "#28797F", "#606E75"]], ["material-darker", "Material Darker", "dark", "VS Code, JetBrains", ["#212121", "#292929", "#424242", "#EEFFFF", "#B0BEC5", "#80CBC4", "#1A1A1A", "#EEFFFF", "#C792EA", "#82AAFF", "#F78C6C", "#C3E88D", "#89DDFF", "#828282"]], ["light-owl", "Light Owl", "light", "VS Code", ["#FBFBFB", "#FFFFFF", "#D9D9D9", "#403F53", "#5F5E75", "#1F7871", "#F6F6F6", "#403F53", "#994CC3", "#426BC3", "#AA0982", "#AB5856", "#0A7B7F", "#6A6F7C"]], ["night-owl", "Night Owl", "dark", "VS Code", ["#011627", "#0B2942", "#1D3B53", "#D6DEEB", "#A7B6C7", "#7FDBCA", "#01111D", "#D6DEEB", "#C792EA", "#82AAFF", "#F78C6C", "#ECC48D", "#7FDBCA", "#6C7F7F"]], ["tokyo-day", "Tokyo Night Day", "light", "VS Code, Neovim", ["#E1E2E7", "#F2F2F5", "#C4C8DA", "#3760BF", "#4C5A8A", "#2564BA", "#E9E9ED", "#3760BF", "#8147CD", "#2666BF", "#A15400", "#557137", "#006A83", "#606684"]], ["tokyo-night", "Tokyo Night", "dark", "VS Code, Neovim", ["#1A1B26", "#24283B", "#292E42", "#C0CAF5", "#A9B1D6", "#82A8F7", "#16161E", "#C0CAF5", "#BB9AF7", "#7AA2F7", "#FF9E64", "#9ECE6A", "#89DDFF", "#7981A2"]], ["ayu-light", "Ayu Light", "light", "VS Code, Sublime Text", ["#FCFCFC", "#FFFFFF", "#E7EAED", "#5C6166", "#686E73", "#9F5A27", "#F8F9FA", "#5C6166", "#A85E2A", "#946A2D", "#8664A7", "#5E7D00", "#9F6244", "#6F6F71"]], ["ayu-dark", "Ayu Dark", "dark", "VS Code, Sublime Text", ["#0B0E14", "#131721", "#1E222A", "#BFBDB6", "#A6A49E", "#E6B450", "#0D1017", "#BFBDB6", "#FF8F40", "#FFB454", "#D2A6FF", "#AAD94C", "#F29668", "#757C84"]], ["solarized-light", "Solarized Light", "light", "почти все редакторы", ["#FDF6E3", "#FFFBF0", "#E3DCC6", "#586E75", "#566971", "#1E6FA7", "#F5EFDC", "#586E75", "#657400", "#1E6EA6", "#C03176", "#1F766F", "#657400", "#626C6C"]], ["solarized-dark", "Solarized Dark", "dark", "почти все редакторы", ["#002B36", "#073642", "#0E4A57", "#B0BABA", "#8E9E9F", "#78B7E3", "#00212B", "#93A1A1", "#859900", "#268BD2", "#DA5495", "#2AA198", "#859900", "#76888E"]], ["gruvbox-light", "Gruvbox Light", "light", "Vim, VS Code", ["#FBF1C7", "#F9F5D7", "#D5C4A1", "#3C3836", "#504945", "#076678", "#F2E5BC", "#3C3836", "#9D0006", "#8A5A0F", "#8F3F71", "#6A660C", "#3C7050", "#6F6458"]], ["gruvbox-dark", "Gruvbox Dark", "dark", "Vim, VS Code", ["#282828", "#32302F", "#504945", "#EBDBB2", "#D5C4A1", "#FABD2F", "#1D2021", "#EBDBB2", "#FB4934", "#FABD2F", "#D3869B", "#B8BB26", "#8EC07C", "#958778"]], ["rose-pine-dawn", "Rosé Pine Dawn", "light", "VS Code, Neovim", ["#FAF4ED", "#FFFAF3", "#DFDAD9", "#575279", "#68647E", "#746188", "#F2E9E1", "#575279", "#286983", "#905754", "#8F6020", "#8F6020", "#6A6781", "#6A6774"]], ["rose-pine", "Rosé Pine", "dark", "VS Code, Neovim", ["#191724", "#26233A", "#403D52", "#E0DEF4", "#A9A5C4", "#C4A7E7", "#1F1D2E", "#E0DEF4", "#568DA3", "#EBBCBA", "#F6C177", "#F6C177", "#908CAA", "#88859C"]], ["everforest-light", "Everforest Light", "light", "Vim, VS Code", ["#FDF6E3", "#FFFBEF", "#E0DCC7", "#5C6A72", "#5F6B65", "#616F01", "#F4F0D9", "#5C6A72", "#BC413E", "#637101", "#A34D88", "#8F6600", "#A45419", "#676F66"]], ["everforest-dark", "Everforest Dark", "dark", "Vim, VS Code", ["#2D353B", "#343F44", "#475258", "#D6C9AF", "#A8B3A9", "#B9CD9B", "#232A2E", "#D3C6AA", "#E67E80", "#A7C080", "#D699B6", "#DBBC7F", "#E69875", "#89958D"]], ["noctis-lux", "Noctis Lux", "light", "VS Code", ["#FEF8EC", "#FFFCF5", "#E9DCC0", "#005661", "#2F6B73", "#007482", "#F9F1E1", "#005661", "#BA406B", "#007A8A", "#5842FF", "#007D49", "#CA3900", "#5E6F6F"]], ["noctis", "Noctis", "dark", "VS Code", ["#052529", "#0A3237", "#16474D", "#B2CACD", "#91ACB0", "#40D4E7", "#041D20", "#B2CACD", "#DF769B", "#16A3B6", "#8173ED", "#49E9A6", "#E66533", "#60898E"]], ["kanagawa-lotus", "Kanagawa Lotus", "light", "Neovim, VS Code", ["#F2ECBC", "#F8F3D0", "#D5CEA3", "#545464", "#5D5C70", "#486392", "#E5DDB0", "#545464", "#624C83", "#46608D", "#8D4860", "#516439", "#6F5E3F", "#61605A"]], ["kanagawa", "Kanagawa Wave", "dark", "Neovim, VS Code", ["#1F1F28", "#2A2A37", "#363646", "#DCD7BA", "#C8C093", "#8DA8DD", "#16161D", "#DCD7BA", "#957FB8", "#7E9CD8", "#D27E99", "#98BB6C", "#C0A36E", "#83827B"]], ["xcode-light", "Xcode Light", "light", "Xcode", ["#FFFFFF", "#FFFFFF", "#E0E0E0", "#262626", "#545454", "#0064E1", "#FFFFFF", "#262626", "#9B2393", "#326D74", "#1C00CF", "#C41A16", "#262626", "#5D6C79"]], ["xcode-dark", "Xcode Dark", "dark", "Xcode", ["#1F1F24", "#292A30", "#3A3A40", "#DFDFE0", "#A3A3A8", "#54AAFF", "#1F1F24", "#DFDFE0", "#FF7AB2", "#67B7A4", "#D9C97C", "#FF8170", "#DFDFE0", "#7F8C98"]], ["palenight", "Palenight", "dark", "VS Code", ["#292D3E", "#34324A", "#3A3F58", "#C3C9E9", "#A6ACCD", "#D1A6EE", "#232637", "#A6ACCD", "#C792EA", "#82AAFF", "#F78C6C", "#C3E88D", "#89DDFF", "#878CAB"]], ["cobalt2", "Cobalt2", "dark", "VS Code", ["#193549", "#1F4662", "#255A80", "#FFFFFF", "#C2D4E2", "#FFC600", "#122738", "#FFFFFF", "#FF9D00", "#FFC600", "#FF628C", "#3AD900", "#FF9D00", "#088CFF"]], ["shades-of-purple", "Shades of Purple", "dark", "VS Code", ["#2D2B55", "#393665", "#4A4785", "#FFFFFF", "#C6BEF5", "#FAD000", "#1E1E3F", "#FFFFFF", "#FF9D00", "#FAD000", "#FF628C", "#A5FF90", "#FF9D00", "#B362FF"]], ["synthwave", "SynthWave '84", "dark", "VS Code", ["#262335", "#34294F", "#495495", "#F0EFF5", "#C4BFD4", "#FF86DD", "#241B2F", "#F0EFF5", "#FEDE5D", "#36F9F6", "#F97E72", "#FF8B39", "#FEDE5D", "#848BBD"]], ["andromeda", "Andromeda", "dark", "VS Code", ["#23262E", "#2B2F38", "#3B3F4A", "#D5CED9", "#B6B0BB", "#00E8C6", "#1B1D23", "#D5CED9", "#C74DED", "#FFE66D", "#F39C12", "#96E072", "#EE5D43", "#A0A1A7"]]];
  /* palettes:end */
  window.ADD3D_PALETTES = PALETTES;
  var keysOf = function (m) { return ["default"].concat(PALETTES.filter(function (p) { return p[2] === m; }).map(function (p) { return p[0]; })); };
  var OPTS = {theme: ["light", "dark"], pl: keysOf("light"), pd: keysOf("dark"), theory: ["full", "brief"], view: ["all", "tasks"]};
  var ATTR = {theme: 1, theory: 1, view: 1};                       // настройки с атрибутом data-… у <html>
  // переменные сайта ← номера цветов профиля
  var VARS = [["--c-bg-soft", 0], ["--c-bg", 1], ["--c-border", 2], ["--c-code-border", 2], ["--c-text", 3], ["--c-text-soft", 4],
    ["--c-muted", 4], ["--c-accent", 5], ["--c-accent-strong", 5], ["--c-accent-bright", 5], ["--c-link", 5], ["--c-link-hover", 5],
    ["--c-code-bg", 6], ["--win-code-bg", 6], ["--win-code-text", 7], ["--win-code-border", 2], ["--win-out-bg", 1],
    ["--win-out-text", 3], ["--win-out-border", 2], ["--hl-kw", 8], ["--hl-bi", 9], ["--hl-fn", 9], ["--hl-num", 10],
    ["--hl-str", 11], ["--hl-com", 13]];
  var PVARS = ["--p-bg", "--p-surface", "--p-border", "--p-text", "--p-text2", "--p-accent", "--p-code", "--p-code-text", "--p-on-accent", "--p-head-accent", "--p-deep", "--p-bar", "--p-header",
    "--p-accent-text", "--p-tint", "--p-tint-strong", "--p-accent-line", "--p-good", "--p-good-line", "--p-warn", "--p-warn-line", "--p-bad", "--p-bad-line",
    "--p-file", "--p-file-line", "--p-l1", "--p-l1-text", "--p-l2", "--p-l2-text", "--p-l3", "--p-l3-text", "--p-l5", "--p-l5-text"];
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function hex(a) { return "#" + a.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function lum(hex) {                                              // относительная яркость цвета #rrggbb
    var n = parseInt(hex.slice(1), 16), ch = [n >> 16, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  var root = document.documentElement, LOCAL = location.protocol === "file:", vals = {};
  function valid(k, v) { return OPTS[k].indexOf(v) >= 0; }
  function stored(k) { try { return localStorage.getItem("add3d-" + k); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem("add3d-" + k, v); } catch (e) { /* хранилище недоступно */ } }
  function current(k) { return vals[k] || OPTS[k][0]; }
  function paint() {                                               // профиль текущей темы
    var key = current(current("theme") === "dark" ? "pd" : "pl"), p = null;
    PALETTES.forEach(function (x) { if (x[0] === key) p = x; });
    // цвета профиля для слоя html[data-palette] в dark.css (раздел 10): основа, текст на акценте,
    // оттенки выносок и меток, смешанные с поверхностью профиля. Смешивание считается здесь, а не
    // color-mix в CSS: каждый цвет текста проверяется по WCAG 2.1 AA (4,5:1) со всеми фонами,
    // на которых он стоит, и при нехватке контраста подмешивается к основному тексту профиля
    var c = p ? p[4] : null, dark = current("theme") === "dark", V = {}, X = {};
    if (c) {
      var mix = function (a, pct, b) { var x = rgb(a), y = rgb(b); return hex(x.map(function (v, i) { return v * pct / 100 + y[i] * (1 - pct / 100); })); };
      var ink = dark ? "#ffffff" : "#000000";
      var fit = function (fg, bgs) {                               // ближайший к fg цвет с контрастом 4,6:1 со всеми фонами
        var to = [c[3], ink];
        for (var j = 0; j < 2; j++) for (var q = 100; q >= 0; q -= 4) {
          var col = mix(fg, q, to[j]);
          if (bgs.every(function (b) { return ratio(col, b) >= 4.6; })) return col;
        }
        return ink;
      };
      X = {"--p-bg": c[0], "--p-surface": c[1], "--p-border": c[2], "--p-accent": c[5], "--p-code": c[6],
        "--p-head-accent": mix(c[5], 55, "#ffffff"),
        "--p-deep": mix(c[6], 82, dark ? "#000000" : c[3]), "--p-bar": mix(c[6], dark ? 70 : 88, dark ? "#000000" : c[3]), "--p-header": mix(c[5], 22, dark ? c[0] : "#14181f"),
        "--p-tint": mix(c[5], 14, c[1]), "--p-tint-strong": mix(c[5], 28, c[1]), "--p-accent-line": mix(c[5], 55, c[2]),
        "--p-good": mix("#3fae5c", 14, c[1]), "--p-good-line": mix("#3fae5c", 50, c[2]), "--p-warn": mix("#d29922", 14, c[1]), "--p-warn-line": mix("#d29922", 50, c[2]),
        "--p-bad": mix("#e5534b", 13, c[1]), "--p-bad-line": mix("#e5534b", 50, c[2]), "--p-file": mix("#c9a227", 12, c[1]), "--p-file-line": mix("#c9a227", 50, c[2]),
        "--p-l1": mix(c[10], 16, c[1]), "--p-l2": mix(c[9], 16, c[1]), "--p-l3": mix(c[8], 16, c[1]), "--p-l5": mix(c[11], 16, c[1])};
      var bgs = [c[0], c[1], c[6], X["--p-tint"], X["--p-tint-strong"], X["--p-good"], X["--p-warn"], X["--p-bad"], X["--p-file"], X["--p-deep"], X["--p-bar"]];
      var text = fit(c[3], bgs), soft = fit(c[4], bgs), acc = fit(c[5], bgs), code = fit(c[7], [c[6], X["--p-deep"], X["--p-bar"], c[1]]);
      X["--p-text"] = text; X["--p-text2"] = soft; X["--p-accent-text"] = fit(mix(c[5], 80, c[3]), bgs); X["--p-code-text"] = code;
      X["--p-on-accent"] = ratio("#ffffff", c[5]) >= ratio("#10151b", c[5]) ? "#ffffff" : "#10151b";   // белый или почти черный: что контрастнее
      [[1, 10], [2, 9], [3, 8], [5, 11]].forEach(function (l) { X["--p-l" + l[0] + "-text"] = fit(mix(c[l[1]], 75, c[3]), [X["--p-l" + l[0]], c[1]]); });
      VARS.forEach(function (v) { V[v[0]] = c[v[1]]; });
      V["--c-text"] = text; V["--c-text-soft"] = V["--c-muted"] = soft; V["--win-out-text"] = text; V["--win-code-text"] = code;
      ["--c-accent", "--c-accent-strong", "--c-accent-bright", "--c-link", "--c-link-hover"].forEach(function (k) { V[k] = acc; });
      V["--c-good"] = fit(dark ? "#45bf63" : "#1b7f3b", [X["--p-good"], c[0], c[1]]); V["--c-bad"] = fit(dark ? "#ff8686" : "#b42f2f", [X["--p-bad"], c[0], c[1]]);
    }
    VARS.concat([["--c-good"], ["--c-bad"]]).forEach(function (v) { if (c) root.style.setProperty(v[0], V[v[0]]); else root.style.removeProperty(v[0]); });
    PVARS.forEach(function (k) { if (c) root.style.setProperty(k, X[k]); else root.style.removeProperty(k); });
    if (p) root.setAttribute("data-palette", key); else root.removeAttribute("data-palette");
  }
  function apply(k, v) {
    vals[k] = v;
    if (ATTR[k]) { if (v === OPTS[k][0]) root.removeAttribute("data-" + k); else root.setAttribute("data-" + k, v); }
  }

  // 1. Значение из адреса (переход между страницами с диска) важнее сохраненного
  var params = null;
  try { params = new URLSearchParams(location.search); } catch (e) { /* старый браузер */ }
  var clean = false;
  Object.keys(OPTS).forEach(function (k) {
    var v = params && params.get(k);
    if (v && valid(k, v)) { store(k, v); apply(k, v); clean = true; }
    else if (valid(k, stored(k))) apply(k, stored(k));
  });
  paint();
  if (clean) {
    try {
      var u = new URL(location.href);
      Object.keys(OPTS).forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* параметры останутся в адресе, это не мешает */ }
  }

  function set(k, v) {
    apply(k, v); store(k, v); paint(); mark();
    document.dispatchEvent(new CustomEvent(k === "theme" ? "themechange" : "viewchange", {detail: {key: k, value: v}}));
  }
  window.add3dSetting = set;
  window.add3dGet = current;
  window.add3dResetSettings = function () {
    Object.keys(OPTS).forEach(function (k) { try { localStorage.removeItem("add3d-" + k); } catch (e) { /* нет хранилища */ } apply(k, OPTS[k][0]); });
    paint(); mark(); document.dispatchEvent(new CustomEvent("viewchange", {detail: {}}));
  };
  function mark() {                                                // нажатые кнопки групп
    Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), function (b) {
      b.setAttribute("aria-pressed", String(current(b.getAttribute("data-set")) === b.getAttribute("data-val")));
    });
  }
  window.add3dMark = mark;

  // 2а. Пока тянут мышью или пальцем модель, схему или ползунок, текст страницы не выделяется
  // (Safari иначе выделяет весь блок синим): класс no-select у <html> до отпускания кнопки
  document.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (t.closest && t.closest('input[type="range"], .anim svg, .anim canvas, .mdemo svg, .demo svg, .demo canvas, .gv canvas, .mv canvas')) {
      root.classList.add("no-select");
      if (window.getSelection) window.getSelection().removeAllRanges();
    }
  }, true);
  ["pointerup", "pointercancel"].forEach(function (n) { document.addEventListener(n, function () { root.classList.remove("no-select"); }, true); });

  // 2. Кнопки и классы страницы
  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".theme-btn"), function (b) {
      b.addEventListener("click", function () { set("theme", current("theme") === "dark" ? "light" : "dark"); });
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-set]");
      if (b) set(b.getAttribute("data-set"), b.getAttribute("data-val"));
    });
    var main = document.querySelector("main");
    if (main && main.querySelector(".th-full")) root.classList.add("has-th-full");
    if (main && !main.querySelector(".task, .final-task, .capstone")) root.classList.add("no-tasks");
    // «Только задачи»: под заголовком раздела с заданиями кнопка, открывающая его теорию и примеры
    if (main) Array.prototype.forEach.call(main.querySelectorAll(".subsection"), function (sec) {
      var h = sec.querySelector(".subsection__title");
      if (!h || !sec.querySelector(".task")) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "view-peek tool-btn";
      b.textContent = "Показать теорию и примеры раздела"; b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () {
        var on = sec.classList.toggle("view-open");
        b.setAttribute("aria-expanded", String(on));
        b.textContent = on ? "Скрыть теорию и примеры раздела" : "Показать теорию и примеры раздела";
      });
      h.parentNode.insertBefore(b, h.nextSibling);
    });
    mark();
  });

  // 3. С диска: настройки передаются следующей странице через адрес ссылки
  if (LOCAL) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      var href = a.getAttribute("href");
      // абсолютные ссылки file:/// (меню заданий, результаты поиска) тоже получают параметры:
      // раньше они пропускались, и в Firefox переход из меню «Только задачи» сбрасывал тему и режим
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        var u = new URL(a.href); if (u.protocol !== "file:" || !/\.html?$/i.test(u.pathname)) return;
        Object.keys(OPTS).forEach(function (k) { u.searchParams.set(k, current(k)); });
        a.href = u.href;
      } catch (err) { /* ссылка остается как есть */ }
    }, true);
  }
})();
