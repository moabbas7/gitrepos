/** GitHub linguist colours for common languages (github-linguist languages.yml). */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#663399",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  "Jupyter Notebook": "#DA5B0B",
  Lua: "#000080",
  Zig: "#ec915c",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  R: "#198CE7",
  Julia: "#a270ba",
  Nix: "#7e7eff",
  OCaml: "#ef7a08",
  Clojure: "#db5855",
  "Objective-C": "#438eff",
  Perl: "#0298c3",
  MDX: "#fcb32c",
  Solidity: "#AA6746",
  HCL: "#844FBA",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  Assembly: "#6E4C13",
  Gleam: "#ffaff3",
  Mojo: "#ff4c1f",
  Nim: "#ffc200",
  Crystal: "#000100",
  "F#": "#b845fc",
  PowerShell: "#012456",
  "Vim Script": "#199f4b",
  "Emacs Lisp": "#c065db",
  TeX: "#3D6117",
  Cuda: "#3A4E3A",
  GDScript: "#355570",
  Odin: "#60AFFE",
};

export const FALLBACK_LANGUAGE_COLOR = "#8c93b8";

export function languageColor(lang: string | null | undefined): string {
  return (lang && LANGUAGE_COLORS[lang]) || FALLBACK_LANGUAGE_COLOR;
}

/** URL slug for a language: "C++" -> "c-plus-plus", "Jupyter Notebook" -> "jupyter-notebook". */
export function languageSlug(lang: string): string {
  return lang
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/#/g, "-sharp")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
