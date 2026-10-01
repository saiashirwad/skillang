## TL;DR
- The design is three projects: a skill compiler, an ML language, and an agent runtime. Ship only the compiler plus typed process boundaries in v0.
- Cut record/effect rows first; use closed records and explicit, finite effect sets.
- Keep actions, but make v0 actions typed aliases of existing scripts; defer general interpretation and agent-session orchestration.
- Restrict facts to Bool/enums, literal equality branches, and exhaustive phrases; forbid unresolved value interpolation.
- Keep deterministic Markdown output, source-located diagnostics, opaque JSON, boundary decoding, shared outlines, and `skl check`.
- Preserve scripts/resources and invocation metadata: the real corpus needs these more than polymorphism.
- v0.5 adds straight-line action composition; v1 considers richer effects, facts, and return orchestration only against demonstrated needs.

## Scope judgment

The map's current destination is a **spec and two hand-written examples**, not implementation. It is fine to finish that in a few weekends, but easy to “type-check by hand” features whose implementation takes much longer. Label postponed syntax explicitly instead of locking an expansive v0 under a small-project name. [M]

The compelling product is: **one authored skill library, fewer irrelevant instructions per repo, reliable packaged actions**. Neither general-purpose ML programming nor DSPy-style orchestration is required to demonstrate that. The cuts below are implementation-risk judgments, not measured estimates.

All snippets below are **proposed restricted syntax**, not claims about an existing grammar.

## Top three cuts, ranked

### 1. Remove row polymorphism from both records and effects

> “Records. Row-polymorphic (`{ title: Line | r }`)”
> “Effects. Row-polymorphic like Koka … sharing machinery with records.”

This is the largest avoidable language-design commitment. Rows mean checking functions against partially known field/effect sets, handling row variables and substitutions, and explaining failures involving those variables. Sharing a data structure does not make record compatibility, effect propagation, and effect handling the same semantics. Higher-order effect inference adds work even after record rows exist.

**Alternative:** closed record types; no user-defined generic or higher-order functions in v0; explicit finite effects on actions. Check an extern's effects against the action declaration. No language-defined effect handlers.

```skl
type Issue = { number: Int, title: Line }
extern readIssue : Int -> {GitHubRead} Issue =
  cmd "gh" ["issue", "view", arg 1, "--json", "number,title"]
action wayfinder.show : Int -> {GitHubRead} Issue = readIssue
```

Make the small runner own the effect policy. `GitHubRead` is an explicit claim about this vetted wrapper, not a property inferred from the executable name `gh`.

Also defer:

> “nested updates as `{ r with a.b = v }`”

Ordinary field access and explicit reconstruction suffice when composition arrives:

```skl
type Author = { login: Line }
type Detail = { author: Author, title: Line }
-- v0.5: reconstruct, or support only shallow updates
let edited = { detail with author = { detail.author with login = "new" } }
```

Do not conflate “ignore extra JSON keys” with open record types. A closed record decoder can ignore extras perfectly well; the typed-JSON research explicitly recommends this v0 and says rows can wait. [J §§1,6A]

### 2. Shrink the interpreter to a typed process runner; defer session orchestration

> “Actions. Run by an interpreter”
> “a skill can declare a typed signature … `skl return <skill> '<json>'`”

There are two distinct runtimes hiding here: evaluating action programs, and tracking an agent's skill invocation. The second needs invocation identity, input delivery, output storage, overlapping calls, and a rule for what consumes a returned value. A process named `skl return` cannot return into an already-exited `skl run` process without another protocol.

**Alternative:** v0 actions are typed aliases to externs, not arbitrary programs. Keep existing Bash scripts. Decode positional arguments; pass stdin through under one declared contract; validate stdout before emitting success. This still delivers **typed actions**—just at their boundary rather than inside their Bash implementation.

```skl
extern resolveTicket : (Int, Line) -> {Shell} String =
  cmd "scripts/resolve" [arg 1, arg 2] stdin String stdout String
action wayfinder.resolve : (Int, Line) -> {Shell} String = resolveTicket

wayfinder : Outline =
  - After inspecting the answer, ${call wayfinder.resolve}.
```

Here `${call ...}` is a compiler-recognized reference that renders documented CLI usage, not a function call at build time. It catches action-name typos and avoids authors manually spelling unstable install paths. Define the command it generates, for example `skl run wayfinder.resolve <ticket> <gist>`, and its stdin requirement.

The real `resolve` already coordinates comment, close, and map editing; it can partially succeed. Rewriting that orchestration in a new language does not make it atomic. Delegate's `spawn` already coordinates temporary files, Rift, Git, Herdr tabs, and agent startup; `await` polls state and times out. Preserve these working scripts rather than reimplementing loops/process management first. [W-script; D-spawn; D-await]

If typed skill outputs are indispensable to the framing, keep **only a stateless validator** in v0:

```skl
type Review = { summary: Line, accepted: Bool }
review : Unit -> Review =
  - Emit a JSON value with summary and accepted.
```

Proposed command: `skl validate review --stdin`. It validates and prints normalized JSON; it neither records completion nor resumes another action. Otherwise defer skill signatures altogether and use `skill : Outline` initially. The DSPy analogy is motivating, not an implementation obligation. [A, “Prompt languages and DSLs”]

### 3. Restrict fact residualization, rather than implementing general staged evaluation

> “three binding times and `says`”
> “A fact with no value in a build is emitted as prose using its `says` phrases”

The simple case is good. The unrestricted case is not simple. What does `${testCommand}` mean when the command is unknown? How does `when os == Linux && inHerdr` become prose if only one operand is known? What happens to an action argument derived from an unknown fact? Phrases for individual values do not supply a renderer for arbitrary computations over unknown inputs.

**Alternative:** v0 facts are Bool or finite enums, supplied by an explicit typed facts file. `when` accepts only `fact == literal`; every value has a phrase. Build-known branches disappear; unknown branches render their phrase and both applicable outlines. No arbitrary conditions or unresolved interpolation.

```skl
fact inHerdr : session Bool
  says true "In Herdr"
  says false "Outside Herdr"

fact packageManager : project PackageManager
  says Bun "If this project uses Bun"
  says Npm "If this project uses npm"

delegate : Outline =
  when inHerdr == true
    - ${call delegate.spawn}.
  else
    - Leave AFK tickets open for a Herdr session.
```

Specify the exact residual Markdown and snapshot it. Distinguish unknown, conflicting, and invalid fact inputs; invalid input must not quietly become a generic branch. Put unrestricted `detect` functions and derived facts in v0.5 or later. Initially feed the compiler explicit values; a tiny detector outside the language may later produce the same facts format. Never guess commands. [F]

Also: “global: known in every build” is an availability rule, not a stability guarantee. An OS value taken from the build machine may be wrong for a committed skill used on another machine. Declare the intended deployment assumption; prefer session binding for facts that vary between users. [C, “Binding time”; F]

## Remaining cuts, in order

### 4. Defer general extern generation and command-template programming

> “curated CLI externs, GraphQL generation, or both”

Choose curated, versioned wrappers, and only those required by the two examples. `gh --json` gives names, not types; CLI output has transformations and pagination limits absent from the GraphQL wire shape. GraphQL generation is a separate adapter project. [J §5]

```skl
type IssueSummary = { number: Int, title: Line }
extern listIssues : Unit -> {GitHubRead} List IssueSummary =
  cmd "gh" ["issue", "list", "--json", "number,title"]
```

Use executable plus argv, not an interpolated shell command string. Parameter text is one argument, even if it contains quotes or shell operators. Keep raw shell only as an explicit `{Shell}` escape hatch. Derive codecs for the small type grammar; avoid configurable schema combinators, selection/path DSLs, and implicit field-to-CLI projection.

### 5. Defer language-level tests with fake effect handlers

> “`test` blocks with fake effect handlers”

Tests are necessary; a handler language is not. Start with compiler snapshots, negative diagnostic fixtures, JSON decoder fixtures, and a runner test double supplied by the TypeScript implementation.

```skl
-- ordinary source; a host test provides fake stdout and an exit code
extern readIssue : Int -> {GitHubRead} Issue =
  cmd "gh" ["issue", "view", arg 1, "--json", "number,title"]
```

A test must verify the constructed argv as well as the decoded response. Fixture coverage should include malformed JSON, extra keys, missing fields, null, and nonzero process exits. Built-in tests can use the existing Bun tooling without enlarging Skillang.

### 6. Defer user-programmable lints

> “Lints are ordinary functions `Outline -> List Warning`.”

This requires exposing the Outline representation, traversal/library primitives, user execution during builds, and warning/source-span APIs. It is not a free benefit of calling instructions a value.

```skl
-- v0: no custom lint function; normal outline composition
shared : Outline =
  - Refer to issues by linked title, never bare number.
wayfinder : Outline =
  ..shared
```

Ship a fixed handful of compiler diagnostics: missing description, broken declared resources, cyclic splices/imports, unknown actions, invalid facts. Add plugin lints only when real custom rules cannot be expressed by host-side checks.

### 7. Stop promising universal permissions from one shared format

> “turned into generated harness permissions (`allowed-tools`)”
> “guarded at runtime by the interpreter”

Keep effects, but separate three guarantees: declaration checking, runner allow/deny policy, and harness metadata. `allowed-tools` is not a portable sandbox. An agent can invoke Bash outside `skl`, and an allowed Bash script can perform undeclared operations. A finite effect set guards the runner's declared entry points, not arbitrary child-process behavior.

```skl
extern spawn : (Line, String) -> {Shell} String =
  cmd "scripts/spawn" [arg 1, arg 2]
```

Do not pretend this wrapper is narrowly `HerdrWrite`: it also runs Git and writes local state. Declare `{Shell}` honestly until there is an actual constrained adapter. Target one verified harness/discovery configuration first; other harnesses may consume the same Markdown, without equivalent permissions. Keep adapters out of fact residualization. [A; F]

## Minimal release ladder

### v0: compiler plus boundary runner

- Source: descriptions, explicit metadata, small type declarations, externs/action aliases, named Outline bindings, splices, simple facts/branches, and restricted interpolation.
- Types: `Unit`, `Bool`, bounded `Int`, `String`, newline-free `Line`, finite enums, closed records; built-in `List` and `Option`. No user generics, rows, higher-order functions, recursion, or custom handlers.
- Codecs: ignore extras by default; strict mode at boundaries; missing versus null defined; path-rich errors. No schema DSL.
- Builds: deterministic global/project outputs; one verified package/discovery target; copy declared scripts/references; owned-output manifest; `skl check` compares without writing.
- Runtime: validate arguments, invoke argv without shell interpolation, pass declared stdin, check exit status, decode stdout. Flat effect policy, no sandbox claim.
- Testing: host-side snapshots, negative diagnostics, codec/runner fixtures. No language `test` construct.
- Acceptance: complete wayfinder/delegate instructions and packaging, retaining existing scripts. Check the other two skills for formatting/resource preservation. Hand-checking is useful but must include concrete generated Markdown, action argv, and malformed-input behavior.

### v0.5: small action programs and better project inputs

Add straight-line `let`, calls, records, field access, shallow updates, and explicit `Result` propagation. Compute action effects as a union of known callees' finite sets; check that union against annotated effects. Add a few vetted detectors with provenance and conflict diagnostics, a minimal curated `gh` catalog, and stateless signature validation if omitted in v0. Expand harness adapters only with conformance fixtures.

### v1: justified generalization

Consider first-order functions/list helpers, richer fact expressions with an explicit residual representation, durable skill invocation/return IDs, and extensible lints. Add record/effect rows or user handlers only after corpus examples prove concrete alternatives inadequate. GraphQL wrapper generation can ship independently. “v1” should not automatically reinstate everything cut.

## Day-one spec gaps that cannot be deferred

1. **Exact lexical rules.** Specify indentation, tabs, blank lines, `|` continuation placement, nested lists, fenced blocks, literal `${`, braces inside interpolation, and negative-number/code versus prose ambiguity. “Keywords count only at line start” needs an explicit notion of logical line start after indentation. Test literal shell `${VAR}` and Markdown code fences. Wayfinder includes a substantial fenced map template; domain-modeling references two Markdown format files. [W; DM; P]
2. **Metadata/resources.** A description doc comment is good, but wayfinder also has `disable-model-invocation: true`. Preserve it explicitly. Define relative resource resolution and copy rules; do not leave generated project skills pointing at mutable home scripts. Copy script siblings such as `lib.sh`; preserve executable bits. [W; W-script; D]
3. **Source/library resolution.** Choose one configured source root and local relative imports. Reject cycles; specify duplicate names and splice order. No registry or package manager. Define how global and project copies shadow one another in the supported harness.
4. **Build purity and ownership.** Never execute actions while compiling. Specify every input to `check`: source, facts, resources, compiler/adapter version. Avoid timestamps and undeclared environment dependencies. Delete only previously owned outputs; do not overwrite unrelated skills. Compilation determinism means same declared inputs, same bytes—not merely that a detector happened to return the same value.
5. **Runtime contracts.** Define positional String versus JSON-record arguments, booleans, integer range, stdin, empty stdout/Unit, stdout versus stderr, exit codes, cwd, environment inheritance, timeout/cancellation, and output limits. No auto-retries for writes. State what happens after partial external success.
6. **Decoder semantics.** Required `Option T` may accept null but should not automatically accept absence. Decide unknown enum variants, duplicate JSON keys, and numeric bounds. Strictness applies recursively under a defined rule. Errors need action name, source declaration, JSON path, expected/actual category, and redaction—not whole private payload dumps. [J §§6A, shared acceptance criteria]
7. **Residual meaning.** Unknown facts can condition prose, but cannot silently supply concrete arguments or interpolate concrete values. Validate both branches before flattening. Specify empty branches, nested residual branches, and exhaustive phrases. Provide an inspectable facts/dependency report.
8. **Meaning of `return`.** Either specify a stateless validator or define invocation ID, schema/version selection, storage, and who reads it. A skill name alone is not an invocation identity. Typed success proves shape, not truth, completion, or obedience. [T; A; M]

## Good decisions to retain

- Skills and outlines as the center, not model-provider calls.
- Deterministic flattened Markdown, project outputs committed, `skl check` for drift.
- Top-level annotations and useful source-located errors; infer only the small local language actually shipped.
- Opaque JSON, typed boundary decoding, explicit strictness, JSON paths.
- Explicit shared outlines and a documented literal interpolation escape.
- Facts outside the compiler's concrete domain vocabulary; native config over guessed commands.
- Real author-owned skills as acceptance tests. They reveal packaging, lifecycle, and prose fidelity requirements that toy programs miss.

## Sources

- **[T]** Design brief, `/var/folders/_f/yb2trsh50c1gv2dpybhtbw7r0000gn/T/delegate.review-scope.HuG8Mi/brief.md`, “Decided” and “Still open.” Decision quotations above are from this brief.
- **[M]** [Map issue #1](https://github.com/saiashirwad/skillang/issues/1), read with `gh issue view 1`; especially Destination, implementation notes, and typed-JSON decision.
- **[C]** `/Users/texoport/code/skillang/CONTEXT.md`, Skill, Fact, Binding time, Signature, Extern, Global build, Project build.
- **[A]** `origin/research/prior-art:docs/research/prior-art.md`, Recommendations; skill package formats; prompt-language comparison.
- **[F]** `origin/research/project-facts:docs/research/project-facts.md`, Harness output differences; Reuse conventions, not guesses; compiler recommendation.
- **[J]** `origin/research/typed-json:docs/research/typed-json.md`, §§1,5,6 and shared acceptance criteria.
- **[P]** `origin/research/prose-syntax:docs/research/prose-syntax.md`, Indentation: incompatible precedents; Candidate designs.
- **[W]** `/Users/texoport/.agents/skills/wayfinder/SKILL.md`, frontmatter, map template, Herdr branches, Scripts.
- **[W-script]** `/Users/texoport/.agents/skills/wayfinder/scripts/resolve`, comment/close/map update sequence and sibling `lib.sh` import.
- **[D]** `/Users/texoport/.agents/skills/delegate/SKILL.md`, spawn/await/finish workflows and Claude-specific branches.
- **[D-spawn]** `/Users/texoport/.agents/skills/delegate/scripts/spawn`, Rift/Git preparation, job files, Herdr startup and prompt submission.
- **[D-await]** `/Users/texoport/.agents/skills/delegate/scripts/await`, state polling, timeout/stall/hung distinction.
- **[DM]** `/Users/texoport/.agents/skills/domain-modeling/SKILL.md`, references to `CONTEXT-FORMAT.md` and `ADR-FORMAT.md`.
- Also read `origin/research/plain-text-problems:docs/research/plain-text-problems.md` and `/Users/texoport/.agents/skills/grilling/SKILL.md`; the former reinforces that structural validation cannot guarantee activation or compliance, and the latter is predominantly ordinary instructions rather than a demand for an executable language.
