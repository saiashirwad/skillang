# THROWAWAY: outline layout and lexing

**Question:** Do two-space outlines, continuations, explicit raw fences and
line-start conditionals feel right when translating real skills? This is a CLI
logic prototype, not a compiler, type checker, Markdown renderer or production
parser. No validated language decision is implied by committing it.

## Run from the repository root

```sh
bun prototype/outline/main.ts prototype/outline/fixtures/wayfinder.skl
bun prototype/outline/main.ts --watch prototype/outline/fixtures/delegate.skl
bun prototype/outline/main.ts --all
```

Bun auto-installs `parserator` when needed. To install the pinned dependency
explicitly instead: `bun install --cwd prototype/outline --frozen-lockfile`.
`--watch` debounces saves and survives atomic file replacement. `--all` should
print **11 trees and 3 intentional diagnostics**; it exits successfully so all
fixtures can be explored. A single invalid file exits 1; bad CLI usage exits 2.

## Implemented decisions

- Minimal top level: `--|` descriptions, `name : Skill A B` / `name : Outline`,
  then a separate `name =`. `fact` lines are opaque. `--` comments are ignored
  outside raw blocks. Definition bodies begin at two spaces. No metadata,
  actions, imports, type checking or fact evaluation.
- Structural indentation uses spaces in exact two-space steps. Tabs outside
  literal payloads are errors. Blank lines (including odd-width space-only
  lines) do not change nesting. Comments/blank lines can separate `when`/`else`.
- Strip indentation, then recognize `- `, `|`, `when <expr>`, `else`, `..name`,
  `literal`. A keyword inside an item/continuation is ordinary text. Code
  expressions are opaque; negative numbers never pass through bullet lexing.
- `|` (optionally followed by one space) attaches to the most recent item in
  the current scope, or the nearest ancestor item. Its newline is represented
  by a distinct continuation node; it is not silently joined with a space.
  It can be at the item's depth or a child depth. Closed branches are not
  searched. A `when` is not itself an item. A continuation without a candidate
  is an error. **Important surprise:** a continuation inside a branch can
  attach outside the branch. See `edge-continuation-after-when.skl:6`.
- A `when` contains child outline nodes (items, nested conditionals, splices).
  `else` aligns with its owning `when` and follows its body. Empty branches,
  including branches consisting solely of a parent continuation, are rejected.
- `literal` is one unit under an item; its fence is one further unit below:

  ~~~~skl
  demo : Outline
  demo =
    - Example:
      literal
        ```sh
        echo ${HOME}
        ```
  ~~~~

  Three or more backticks, optional language tag, and an exact matching closing
  fence at the same indentation. Remove only the fence's structural prefix
  from content. Preserve relative indentation, blank lines, trailing newline,
  and raw tabs after that prefix. Nothing inside is lexed as Skillang, including
  `${}`, `$${`, keywords, comments and bullets. A longer outer fence can enclose
  shorter fences. No tilde fences, interpolation or automatic Markdown-fence
  detection in ordinary prose. `literal` cannot be a standalone root item.
- `${expr}` in items/continuations balances braces and escaped single/double
  quoted strings, on **one physical line only**. `$${` becomes literal `${`.
  Errors point to the opening, even if a malformed quoted string contains
  another `${`. No expression evaluation or ML expression validation.
- `..name` records a splice at its current depth. No expansion/name resolution;
  a future expander should rebase the referenced outline's roots to that depth,
  keeping its relative child depths.

Rules are localized in `parser.ts`: `RULES`, `lineGrammar`, `prosePart`,
`literalBlock`, and `block`. `parseOutline(source)` is independent of the CLI;
`main.ts` only reads, watches, formats and prints. Every node exposes source
line and structural depth; interpolations expose their opening column.

## What to react to

| Rule | Corpus result / awkwardness |
| --- | --- |
| Two-space layout and blanks | Fits wayfinder's existing list (`wayfinder.skl:35–43`) and delegate (`delegate.skl:26–28`). Grilling blank paragraphs stay siblings (`grilling.skl:5–10`). Raw fences require two extra structural levels. |
| Line-start code vs prose | Existing prose and shell arguments stay safe (`wayfinder.skl:8`, `delegate.skl:13`). `edge-prose-when.skl:4` is prose; `edge-negative-number.skl:4–5` stays code. |
| Continuations | Grilling's long paragraph wraps cleanly (`grilling.skl:7–8`), but preserved newlines are not soft wraps. The branch-to-parent attachment above is surprising; consider forbidding it. |
| Literal blocks | Both real fenced examples retain their payload (`wayfinder.skl:17–33`, `grilling.skl:12–23`). Explicit `literal` avoids magic Markdown modes, but adds indentation/noise. |
| Interpolation/escape | The corpus does not exercise actual `${expr}`; edge files do. Backticks do not suppress interpolation (`edge-shell.skl:4–9`); shell prose needs `$${HOME}` or a literal block. |
| when/else | Herdr rule fits (`wayfinder.skl:49–54`). Delegate retains the words "In Claude Code" (`delegate.skl:17–22`) but that label adds an arguably redundant nesting level. |
| Splices | No original skill has a splice; only `edge-splice.skl:4–7` exercises it. Depth is visible, expansion is deliberately unimplemented. |

## Parserator observations

Uses the published **0.3.0** package after reading the local checkout's README
and JSON/query/toy-ML examples. Generator grammars, `choice`, `commit`, recursive
balanced groups, prefix parsing and `withSpan` work well. No missing combinator
blocked the prototype. There is no built-in indentation stack; layout and raw
fence collection use a small explicit recursive line walker. Full-source
line/column conversion and an opener-focused interpolation diagnostic live in
this prototype. `withSpan` requires a callback; a short README example would
make that more discoverable. Multi-error recovery is not supplied (and not
implemented here); the CLI reports the first error without consuming later
physical lines as part of the interpolation.

Manually exercised all fixtures, ordinary and atomic saves, cold dependency
resolution, nested quoted braces/escaped quotes, and exact raw payload equality
against the source skills. No test suite or generated output is committed.
