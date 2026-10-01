## TL;DR
- Keep typed boundaries, annotated exports, opaque JSON, explicit outline items and deterministic Markdown builds.
- **1. Define staging before syntax:** unavailable facts must leave structured outline nodes, not turn arbitrary computation into prose.
- **2. Narrow the effect guarantee:** the interpreter guards Skillang operations, not the agent or arbitrary child processes; `allowed-tools` is adapter metadata, not a proof.
- **3. Separate a skill's signature from its Outline value:** typed inputs/results need an invocation protocol, and action references must be data rather than calls.
- Record/effect rows can coexist, but require distinct row kinds, explicit quantification and a deliberately small handler model.
- Specify layout, raw examples, interpolation rendering and source provenance now; these determine whether excellent diagnostics are feasible.
- No repository files or GitHub issues were changed; only this requested report was written.

## Scope and notation

Reviewed the supplied design summary, `CONTEXT.md`, [map issue #1](https://github.com/saiashirwad/skillang/issues/1), all five research notes on their `origin/research/*` branches, and the real `wayfinder`, `delegate`, `grilling` and `domain-modeling` skills. There is no `docs/spec.md` in the current checkout. Examples below are **proposed syntax**, not assertions about an implemented grammar. Rankings concern semantic risk, not implementation difficulty.

## 1. Binding times are useful labels, but not yet a sound staging discipline

> “The compiler knows only `fact`, three binding times and `says`.”
> “A fact with no value in a build is emitted as prose using its `says` phrases.”

The three labels describe availability. They do not specify what operations may consume an unavailable value. A phrase is a display convention, not a substitute for a typed value. For example, a global build cannot evaluate `packageManager.command ++ " test"`, even if packageManager has phrases for every constructor. Similarly, `when inHerdr && hasCredentials` cannot safely be rendered from two unrelated labels without preserving the predicate's structure and meaning.

**Better alternative: restrict residual computation—the computation left for later—to explicit Outline constructors.** Outline construction is pure. A known condition selects a branch; an unknown fact condition creates a conditional node containing both branches. Interpolation must either be known or have its own explicit residual representation. Do not silently convert arbitrary unknown expressions into text.

```skl
fact inHerdr : Bool session
  says true = "In Herdr"
  says false = "Outside Herdr"

--| Delegate independent work.
delegate : Skill Unit Unit =
  when inHerdr
    - Run ${actionRef delegate.spawn}.
  else
    - Leave independent jobs open for a Herdr session.
```

Here `actionRef` produces a reference; it does not execute `spawn`. This is a finite, straightforward residual conditional. In contrast:

```skl
  when inHerdr
    - Started job ${delegate.spawn "review"}.
```

must fail: an action is being called while constructing instructions, regardless of whether the compiler knows the fact. Do not execute an action in one build and leave a command in another. Pure computations should also have bounded evaluation or a resource limit, so a nonterminating helper cannot hang a build.

**Project facts inside actions need a separate policy.** An action is runtime code, so it can consume a runtime project value. It cannot accidentally capture a value from the repository in which a global artifact happened to be built. Prefer explicit inputs for v0:

```skl
runTests : Project -> {| Shell} Result Unit ProcessError
runTests project = sh project.testCommand
```

If direct fact access is allowed instead, state which values are embedded in project artifacts and which are obtained at invocation. Revalidate project identity and relevant inputs before executing embedded commands; `skl check` alone does not stop an agent from running stale artifacts in a different repository.

**Availability and failed detection are different.** “Project fact unavailable in a global build” can intentionally stay conditional. “Project detector found two conflicting lockfiles” should be an explicit `Unknown`/`Conflict` result or an error, not `false`. Fact initializer dependencies must not become known earlier than their inputs: a `global` fact cannot depend on `session`. Facts marked `global` also need declared build inputs/provenance; they are not necessarily universal constants across machines.

**Decision to lock:** a staging table for conditions, interpolations, splices, skill inputs and actions, including rejection examples. Require finite exhaustive phrases for v0 residual branching, or explicit authored conditional wording; do not promise automatic phrases for arbitrary strings, functions or predicates.

Sources: `CONTEXT.md`, “Binding time”, “Phrase”, “Flattening”; `origin/research/project-facts:docs/research/project-facts.md`, “Recommendation for the compiler”; corpus `~/.agents/skills/wayfinder/SKILL.md`, “Outside Herdr” rule.

## 2. Effects are coherent only with an explicitly bounded enforcement claim

> “Effects are … checked at compile time … turned into generated harness permissions (`allowed-tools`) … guarded at runtime by the interpreter.”

These are three different mechanisms, with different guarantees. Static checking establishes that a **Skillang action** declares all operations it can perform. The interpreter can reject disallowed operations before dispatch. A harness field may configure access or approval behavior, depending on that harness; it is not a portable sandbox. An agent can ignore prose and call another tool, and an arbitrary external executable can do more than its declared type claims.

**Better alternative: define a trusted-operation boundary and treat harness metadata as a lossy adapter projection.** The guard belongs at every operation dispatch, including nested action calls, not just the initial `skl run`. The available runtime effects are the intersection of the artifact declaration and the invocation policy. The caller cannot add privileges through an argument or a forged declaration.

```skl
extern issueTitle : Int -> {| GitHubRead} Result Line GhError =
  cmd "gh" ["issue", "view", arg 0, "--json", "title"]

rename : Int -> Line -> {| GitHubWrite} Result Unit GhError
```

Use an executable plus an argument vector, not shell interpolation. User title text must never become executable shell syntax. A curated adapter is trusted to implement `GitHubRead`; a user-written extern should default to `Shell` unless independently reviewed/registered or actually sandboxed. Merely annotating a command `GitHubRead` cannot make it read-only. `Shell` should be documented as broad authority, not as a small privilege inferred from the command's spelling.

For residual session branches, include the union of both branches' action-reference requirements. A known project branch may reduce the exported reachable action set, but do not quietly erase effects from an action's declared signature. Also decide whether a skill permits only referenced actions or exports every module action.

**Tests do not require user-defined algebraic effect handlers.** For v0, an effect can be a named family of runtime operations; a fake handler implements those operations without launching processes. Higher-order propagation through `map` remains possible without exposing continuations, resumptions or effect declarations in user syntax.

```skl
test "reads the issue title" =
  with fake GitHubRead { issueTitle = fn n -> Ok "A title" }
    assertEqual (issueTitle 42) (Ok "A title")
```

Specify unmatched-operation failure, arguments checked by the fake, recorded calls, and no fallback to real operations. Replacing a read handler must not remove a write effect. Tests verify action logic; separate adapter fixture tests verify actual process output decoding. Transport/process errors must also have explicit `Result` values or a specified failure effect.

Sources: `origin/research/plain-text-problems:docs/research/plain-text-problems.md`, “Not solved by compilation alone”; `origin/research/prior-art:docs/research/prior-art.md`, “Declare target capability and loss”; `origin/research/typed-json:docs/research/typed-json.md`, §5 “Effect-system judgment”.

## 3. A typed skill interface and an Outline are not the same type

> “A skill is a typed top-level binding whose body is an Outline.”
> “The agent returns typed values via `skl return <skill> '<json>'`.”

A function `Input -> Output` ordinarily means the interpreter computes Output. Here the binding computes instructions and a model later supplies Output. Conflating them would allow ordinary application to appear to produce a value that does not exist yet. It also leaves an important hole: how do typed skill inputs become available to a skill compiled once into static Markdown?

**Better alternative: distinguish `Outline` from `Skill Input Output`.** The skill value packages its protocol and instructions; it is not an ordinary `Input -> Output` function.

```skl
type Plan = { destination: Line, tickets: List Line }

shared : Outline =
  - Refer to an issue by its linked title.

--| Chart a map for work too large for one session.
wayfinder : Skill { idea: Text } Plan =
  ..shared
  - Read the invocation's typed idea input.
  - Use ${actionRef wayfinder.createMap} when the destination is agreed.
```

For v0, keeping inputs out of build-time interpolation is the smallest solution: the invocation exposes typed inputs separately, and the model reads them. Supporting `${input.idea}` instead requires a session-rendering step; compiling static Markdown alone cannot supply it. Outline references to actions should produce generated call instructions with signature/help information, never evaluate the action.

`skl return <skill>` is insufficient to identify the recipient when two invocations of one skill coexist. Bind returns to an invocation identifier and source/schema version:

```text
skl begin wayfinder --input-file idea.json
# returns invocation id and instructions/input contract
skl return <invocation-id> --json-file plan.json
```

Define whether invalid returns can be retried, whether acceptance closes the invocation, and what happens to duplicate or obsolete returns. Decode boundary validation proves shape, not truth or compliance. Strict decoding is especially useful for model returns because misspelled fields should not be silently discarded; projecting extra fields remains sensible for external APIs.

These protocol semantics should be settled even if their implementation is later. Otherwise the hand-written examples cannot honestly type-check the central “skills first” claim.

Sources: `CONTEXT.md`, “Signature”, “Outline”, “Action”; `origin/research/prior-art:docs/research/prior-art.md`, DSPy/BAML comparison; corpus `~/.agents/skills/grilling/SKILL.md`, “Never answer the user's side” workflow distinction.

## 4. Record and effect rows can coexist; sharing syntax must not erase their differences

> “Row-polymorphic … sharing machinery with records.”
> “Annotate top-level definitions; infer locals.”

This combination is viable. Top-level polymorphic signatures should be checked with rigid abstract variables, so their bodies must work for every declared row, not just one conveniently inferred example. Make quantification explicit or rigorously specify implicit quantification:

```skl
titleOf : forall (r: RecordRow). { title: Line | r } -> Line

map : forall a b (e: EffectRow).
  (a -> {| e} b) -> List a -> {| e} List b
```

Record rows map labels to field types and need absence constraints to avoid duplicate fields. Effect rows describe operation requirements and need a policy for union/duplicates. A single substitution engine can help, but use distinct row kinds and do not accidentally accept a record tail where an effect tail belongs. Koka-like effects also require deliberate decisions about handler subtraction and effect multiplicity; copying the arrow notation does not import those decisions.

Prefer rank-1 polymorphism and fixed built-in effect families for v0. If mutable cells enter the language, unrestricted local generalization needs revisiting; immutable values do not require a restriction merely because some calls have external effects.

For `{ r with a.b = v }`, require existing fields and type-preserving updates initially. Specify simultaneous updates; reject overlapping paths such as `a = x, a.b = y`. Updating through `Option` or `List` should require ordinary mapping, not implicit traversal. Decode only monomorphic, closed wire types: an unconstrained row has no codec telling the interpreter what its hidden fields are.

If action references are allowed inside Outline values, they must carry or yield their required-effect metadata through splicing. A plain `Outline -> List Warning` linter can inspect that metadata without executing anything.

Source: `origin/research/typed-json:docs/research/typed-json.md`, §4 “Row polymorphism” and §6 designs A/B. That note recommends deferring rows; the newer decision can stand, but its extra specification burden should be acknowledged.

## 5. Layout is workable, but the lexer rule is incomplete

> “A line starting with `- ` is prose until end of line; code keywords count only at line start.”

This can be deterministic, but “line start” must mean after a precisely defined indentation prefix, and `${...}` is an explicit exception to “prose until end of line”. Code expressions also need unary minus without accidental bullet lexing. Use lexer modes: top-level/code, Outline, interpolation, and literal/raw continuation.

```skl
example : Outline =
  - Explain the condition.
    | when inHerdr
    | else
    - A nested item.
  when inHerdr
    - An actual conditional item.
  else
    - Its alternative.
```

Recommended rules: spaces-only structural indentation; a fixed indentation unit; blank lines do not change nesting; `else` aligns with its owning `when`; `|` continues the nearest eligible item and preserves newlines rather than silently joining them. Define whether branches contain sibling items or children and how a spliced Outline is rebased. Reserve `- ` only inside Outline mode, not globally.

The corpus includes fenced Markdown bodies and shell examples. Those should not need every literal `${...}` escaped. Add a raw continuation form, or rigorously specify that a fenced block in continuation mode suppresses interpolation:

```skl
  - Example:
    | ```sh
    | echo ${HOME}
    | ```
```

Under the latter proposal `${HOME}` is literal inside this fence, while ordinary prose still uses `$${` for literal `${`. State this exception rather than relying on Markdown detection by accident. An unterminated interpolation should report at its opening delimiter and not absorb subsequent outline items. Balanced braces and quoted strings inside interpolation need the code lexer, not a scan for the next `}`.

Source: `origin/research/prose-syntax:docs/research/prose-syntax.md`, “Indentation: incompatible precedents”; corpus `~/.agents/skills/wayfinder/SKILL.md`, fenced “Map body”; `~/.agents/skills/grilling/SKILL.md`, fenced question template.

## 6. Excellent errors require preserving author intent through flattening

> “There is no editor tooling, but error messages must be excellent.”

The hard cases will be row mismatch explanations, indentation recovery, errors in shared splices, rejected late values, and runtime failures in generated commands. Preserve source spans on every Outline node and interpolation, definition/call sites on references, and an expansion stack through splices. Type constraints need reasons, not only unified types. Keep annotation aliases visible in explanations.

```skl
  - Run ${packageManager.command}.
```

A useful error says: “`packageManager.command` is unavailable in a global build. This interpolation needs build-known text. Declared project-time at facts.skl:8; use an explicit fact branch or pass the command to an action.” It should not say “cannot unify unknown with Text”. Report an effect mismatch at the offending operation and the signature that disallows it.

Define interpolation rendering now. `Line` should reject newlines; `Text` needs explicit treatment for multiline insertion, and numbers/paths need deterministic formatting. Do not stringify every typed value, or a user-controlled newline can introduce Markdown structure and invalid generated command examples. Use a small explicit rendering function:

```skl
  - Read ${inlineCode sourcePath} before editing.
```

Boundary errors should include action/adapter, JSON path, expected type and actual category, with bounded/redacted value snippets. Specify missing versus null, unknown enum variants, numeric limits, and `Line` validation. For positional CLI arguments, distinguish shell strings from JSON-encoded aggregates explicitly; do not let `42` versus `"42"` depend on undocumented quoting heuristics.

Source: `origin/research/typed-json:docs/research/typed-json.md`, §6 “Shared acceptance criteria”; map #1 requirement for excellent compiler errors.

## What is good and should stay

- **Opaque `Json` and typed boundary decoding:** establishes a real trust boundary without turning the language into a schema framework.
- **Top-level annotations with inferred locals:** provides readable interfaces and anchors diagnostics.
- **Explicit prose items and shared splices:** fits the actual corpus better than ordinary string literals; retain this surface after specifying layout.
- **Deterministic flattening, committed project output, `skl check`, snapshots:** concrete compiler benefits that do not claim model obedience.
- **User/stdlib facts rather than a compiler catalog of project trivia:** good extensibility, provided detector execution and provenance are explicit.
- **Curated externs first:** the research already explains why GraphQL generation cannot automatically type `gh` CLI exporter output.

Before calling the spec locked, hand-check both example skills against the three highest-ranked rules and include negative examples: effectful interpolation, conflicting fact detection, global build with unavailable project interpolation, stale action artifact, and duplicate model return. Those expose semantic gaps faster than adding more syntax.
