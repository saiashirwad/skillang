# Skillang v0: design summary (for review)

Context: repo saiashirwad/skillang (`/Users/texoport/code/skillang`). Read `CONTEXT.md` (glossary) and the map issue `gh issue view 1`. Research notes are on branches `research/prior-art`, `research/plain-text-problems`, `research/project-facts`, `research/prose-syntax`, `research/typed-json` under `docs/research/` (use `git show origin/<branch>:docs/research/<slug>.md`). The author's real skills are in `~/.agents/skills/` (wayfinder, delegate, grilling, domain-modeling); they are the test corpus.

The author is new to language design and knows some compilers. Goal: a "quaint", small, statically typed, ML-like language for agent skills, with a compiler that flattens skills per project.

## Decided
- **Framing.** Skills first, in a DSPy spirit. The agent running a skill is the "model": a skill can declare a typed signature, and the agent returns typed values via `skl return <skill> '<json>'`, which the interpreter checks.
- **File shape.** The top level is code: `type`, `extern`, actions and `fact` declarations, each with a signature. A skill is a typed top-level binding whose body is an **Outline**:
  - `- ` items, one per line, with `|` continuation lines
  - indented `when` / `else`
  - `${expr}` interpolation, with `$${` as the escape
  - `..name` splices a shared outline
  - a `--|` doc comment becomes the frontmatter description
  - lexer rule: a line starting with `- ` is prose until end of line; code keywords count only at line start
- **Inference.** Annotate top-level definitions; infer locals.
- **Records.** Row-polymorphic (`{ title: Line | r }`), with nested updates as `{ r with a.b = v }`.
- **Effects.** Row-polymorphic like Koka (`map : (a -> {| e} b) -> List a -> {| e} List b`), sharing machinery with records. One word, "effect": actions use effects and targets handle them. Effects are:
  - checked at compile time
  - turned into generated harness permissions (`allowed-tools`)
  - guarded at runtime by the interpreter
- **JSON.** `Json` is opaque. Decode at the boundary into typed records; extra keys are ignored by default, and `decode strict` rejects them. Runtime decode errors carry JSON paths.
- **Externs.** `extern name : Type = cmd "..." ...` types external CLIs. The stdlib's gh/git/herdr wrappers use the same syntax. Raw `sh` is an escape hatch with the `{Shell}` effect.
- **Facts.** The compiler knows only `fact`, three binding times and `says`. Every concrete fact (packageManager, os, inHerdr…) is stdlib or user code; `detect` is a stdlib function.
  - `global`: known in every build
  - `project`: known only in a build inside a repo
  - `session`: known only while the agent runs
  - A fact with no value in a build is emitted as prose using its `says` phrases (e.g. "In Herdr" / "Outside Herdr").
- **Builds.**
  - A global build writes `~/.agents/skills`; project facts stay as prose.
  - A project build writes the repo's `.agents/skills`, flattened, committed, and checked for staleness by `skl check`.
  - Output is one shared `.agents/skills` format; `harness` is a session fact.
- **Actions.** Run by an interpreter: `skl run skill.action 42 "gist" < stdin`. Arguments are positional and decoded by parameter type.
- **Testing.** `test` blocks with fake effect handlers, plus snapshot tests of compiled output. Lints are ordinary functions `Outline -> List Warning`.
- **Done for this map.** `docs/spec.md` plus `wayfinder` and `delegate` hand-written in Skillang. Implementation (later) is TypeScript on Bun with the author's parser-combinator library `parserator`. There is no editor tooling, but error messages must be excellent.

## Still open
- Where gh extern types come from: curated CLI externs, GraphQL generation, or both
- How a prose line references an action, and how `skl return` works
- Modules, imports, stdlib layout, location of the source library
- Whether harnesses other than Claude Code respect `allowed-tools`
