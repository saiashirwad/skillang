## TL;DR
- Skillang can improve packaging, checked action references and conditional guidance; it does not yet improve the prose-only skills.
- Make typed skill returns optional: wayfinder and grilling are conversations, not single model-function calls.
- `allowed-tools` is pre-approval, not a sandbox—even in Claude Code. Interpreter effects cover only interpreter actions.
- Keep the outline syntax, but add literal Markdown blocks and first-class invocation metadata before locking v0.
- Keep deterministic builds, committed project output, typed JSON boundaries and fake-handler tests.
- Narrow v0 to portable packages plus typed actions; defer row-polymorphic effects until the corpus needs them.
- Rulesync and Ruler already distribute skills: borrow their adapter/ownership work rather than competing on file placement.

## Review basis

I read `CONTEXT.md`, [map issue #1](https://github.com/saiashirwad/skillang/issues/1), all five supplied research notes, and the live `wayfinder`, `delegate` and `grilling` skills. I also inspected wayfinder's `scripts/claim` and delegate's `scripts/spawn` and `scripts/await`. No skills, repository files or GitHub issues were changed. Examples below are design sketches, not claims that an unspecified grammar already accepts them. New library helpers or syntax are identified.

## Top three, in priority order

### 1. A typed return is a useful boundary, not a universal skill lifecycle

**Decision challenged:** “The agent running a skill is the ‘model’ … returns typed values via `skl return <skill> '<json>'`.”

Wayfinder has at least two workflows: chart a map and work an existing map. Charting stops after delegation; working resolves one human-in-the-loop ticket. Grilling explicitly waits between rounds and requires user confirmation before action. Delegate can end done, blocked, stalled, timed out or possibly hung. None has a natural unconditional `Input -> Output` completion point. Turning each into a function risks making the agent invent a final decision to satisfy the output schema—exactly what grilling prohibits. [Corpus: wayfinder, “Chart a map” / “Work a map”; grilling, final paragraph; delegate/scripts/await, status cases.]

**Better alternative:** instruction-only skills remain valid, with `Unit` if a signature is compulsory; typed results are opt-in for genuinely bounded jobs. Do not make a successful JSON submission synonymous with the conversation or job being finished.

```skl
--| Grill a decision with the user until its design tree is settled.
grilling : Unit -> Unit =
  - Ask the current frontier, then wait for the user's answers.
  - Do not act until the user confirms the shared understanding.
```

For an opt-in bounded review:

```skl
type ReviewResult = { summary: Line, findings: List Finding }
--| Review a named change and return evidence-backed findings.
review : ReviewInput -> ReviewResult =
  - Inspect the named change and its dependencies.
  - Submit the result using the invocation's generated return command.
```

**Practical today?** Yes as a cooperative CLI convention if `skl` is installed and shell execution is available. No as an automatic portable return mechanism: the standard `SKILL.md` body does not itself create a waiting caller, retry loop or structured-output tool. Pi appends skill arguments as a user request; Codex and Claude describe skill loading/invocation, not a common typed-result callback. [S1–S4]

Specify the protocol before the language signature: invocation ID, expected output type and schema version, pending/succeeded/blocked/cancelled states, duplicate submission behavior, and who reads the result. Use a generated command such as `skl return <invocation-id> < result.json`; keying only by skill name cannot distinguish two concurrent reviews. Stdin avoids the shell quoting and command-length hazards of inline JSON. A failed decode should leave the invocation pending and give a repairable JSON-path error. Invalid submissions must not replay earlier side effects.

The existing delegation protocol is a valuable precedent: a unique job directory contains `result.md`, `DONE` or `BLOCKED`; `await` observes it. Typed JSON can supplement that protocol rather than replace its lifecycle. `DONE` is still a cooperative signal, not proof of truth. [Corpus: delegate/scripts/spawn and scripts/await.]

### 2. The permission claim is too strong, and its direction is surprising

**Decision challenged:** effects are “turned into generated harness permissions (`allowed-tools`)” and “guarded at runtime by the interpreter.”

The Agent Skills specification calls `allowed-tools` an **experimental list of pre-approved tools**, with implementation-dependent support. Current Claude Code documentation explicitly says it **does not restrict which tools are available**. Its grant lasts for the invoking turn, not the whole multi-turn workflow. Consequently, a compiler-generated permission list can remove approval prompts rather than make a skill safer. [S1, S2, “Pre-approve tools for a skill”.]

A `{GitHubRead}` action cannot stop the agent from calling `gh issue edit` directly through another shell tool. `{Shell}` gives an interpreter access to commands whose real effects may vastly exceed a declared wrapper label. A CLI extern is a trusted implementation boundary, not a proof inferred from its name.

**Better alternative:** keep effects as checked requirements of actions. Have an independently configured interpreter policy decide what is permitted. Make harness pre-approval an explicit installation choice, not automatic output from effect inference. State the scope plainly: **interpreter-mediated actions are guarded; arbitrary harness actions are not**. A whole-session restriction requires separate, verified harness policy or a sandbox.

```skl
extern show : Int -> {| GitHubRead} MapView = cmd "..."
extern claim : Int -> {| GitHubWrite} IssueLink = cmd "..."

wayfinder : Unit -> Unit =
  - Inspect the map before choosing a ticket.
  - Claim the chosen ticket before working on it.
```

These signatures inform the interpreter and an install-time effect summary. They should not silently emit broad `Bash(skl *)` pre-approval: that pattern could approve unrelated actions reachable through the same executable. If offered, pre-approval must be narrowly scoped and reviewable. For Pi/Codex, absent verified support, report that this metadata offers no enforcement guarantee; do not infer enforcement from a field being tolerated.

Also avoid saying `claim` is race-safe merely because it type-checks: the existing script checks assignees and then writes in a separate request. Wayfinder explicitly allows concurrent sessions. Mock-handler tests should expose that race or document the limitation. [Corpus: wayfinder/scripts/claim; wayfinder, final item.]

### 3. The syntax reads well for outlines but makes the actual corpus's rich Markdown worse

**Decision challenged:** “a skill … body is an Outline”, with `-` items and `|` continuation lines; a “`--|` doc comment becomes the frontmatter description.”

Wayfinder is already a compact outline. The extra syntax buys little readability on unconditional items, but useful names can remove hard-coded installation paths and connect prose to checked actions. Here is a partial translation using the proposed `when` and continuation syntax:

```skl
--| Plan work too big for one session as decision tickets on GitHub.
wayfinder : Unit -> Unit =
  - Wayfinder plans; it does not build.
    - When you feel the pull to do the work, hand off.
    - A map's Notes can override these rules.
  - Delegate AFK tickets with the delegate skill.
    when inHerdr
      - Research uses `--rift research/<slug>`.
      | Inspect the actual work before resolving the ticket.
    else
      - Leave AFK tickets open; tell the user they await a Herdr session.
  - Resolve one HITL ticket per session.
```

**Verdict:** roughly as readable as the original, slightly noisier as source; worthwhile only if references are validated or branches genuinely disappear. Because `inHerdr` is a session fact, both branches remain in both global and project output. This corpus does not demonstrate large project-fact flattening wins yet.

Wayfinder also includes an exact fenced Markdown map-body template. Grilling is paragraphs plus a fenced example containing headings, emoji and separators. Converting every line into continuation syntax makes those skills worse to author and copy. The lexer must not interpret `when`, `..name`, `${...}` or `- ` inside examples as active syntax.

**Better alternative:** retain outlines, add one explicit literal Markdown block with no interpolation or directives. Proposed new `literal` form:

````skl
mapBody : Outline =
  - Map body:
    literal ```markdown
    ## Destination
    <what done looks like>

    ## Notes
    <standing preferences>
    ```
````

Define exactly how nesting, blank lines and fence indentation survive. Use this for grilling's round-format example too; do not redesign its clear prose as executable branching.

Description alone is insufficient metadata: wayfinder currently has `disable-model-invocation: true`. Losing it changes a deliberately user-triggered workflow into one the model can select. Keep the concise `--|` description, but add typed skill metadata for invocation policy. Sketch of a proposed metadata attachment:

```skl
wayfinder : Unit -> Unit =
  - Wayfinder plans; it does not build.

metadata wayfinder = { invocation: Manual }
```

Adapters map that intent to Claude/Pi frontmatter and Codex's `agents/openai.yaml` policy, or report unsupported behavior. Do not treat it as a session fact: installation/discovery happens before the body is selected. [S2–S4]

## Remaining points, ranked

### 4. Resolve typed action references before polishing the type calculus

**Decision challenged:** “How a prose line references an action” is still open, while row-polymorphic records and effects are decided.

The strongest everyday win is catching a renamed action, missing script or stale path—not abstracting a polymorphic `map`. Define a small typed prose-reference helper first. Proposed stdlib helper `command` produces a checked usage fragment without executing the action:

```skl
wayfinder : Unit -> Unit =
  - Inspect the map with ${command show}.
  - Claim the chosen ticket with ${command claim}.
```

It can render `` `skl run wayfinder.show <map>` `` and validate that `show` exists and has a callable argument schema. Interpolation must distinguish usage generation from action execution; effectful calls during a deterministic build should be rejected. Add separately checked skill references for wayfinder's `delegate`, `grilling` and `domain-modeling` dependencies.

Start externs with an argv-vector API and explicit stdin/stdout/exit contracts, not shell interpolation. Delegate's `await` exits 2/3/4/5 to distinguish meaningful outcomes; turning all nonzero exits into an undifferentiated exception loses its best operational feature. Curate the small set of CLI adapters the corpus uses; GraphQL generation is a later, different wire interface. The supplied typed-JSON research already makes that distinction well.

### 5. A common package is good; a single discovery path is not portable

**Decision challenged:** “Output is one shared `.agents/skills` format; `harness` is a session fact.”

Keep one portable **package shape**, but distinguish that from where each harness discovers it and how it controls invocation. Pi and Codex document `.agents/skills`; Claude's documented native locations include `.claude/skills`. Do not claim automatic Claude discovery of the chosen shared path without a tested install/configuration step. [S2–S4]

Delegate legitimately needs session-sensitive prose: Claude can background `await`, whereas other harnesses poll. Keep that conditional. But package placement, metadata mapping and support diagnostics are installation concerns. They cannot be fixed by prose that a harness never discovered.

Borrow Rulesync's explicit feature/target matrix and import path, and Ruler's source traceability, dry-run and generated-output ownership. Both now distribute skills, not just ambient rules. Neither inspected README establishes Skillang-style typed actions or project-fact specialization. Skillang's differentiator must be those guarantees, not “write once for several agents.” [S5, S6]

### 6. Commit builds, but make their provenance reproducible

**Decision challenged:** project output is “flattened, committed, and checked for staleness by `skl check`.”

Good default: fresh clones and Rifts get working guidance without first bootstrapping a compiler. However, a globally installed source library can change behind a repo's back; the same checkout could then produce different output. Pin source dependencies and compiler/stdlib versions. Record the inputs that affected the build, not arbitrary machine identity or volatile timestamps. `skl check` should compare reproducible output, missing/extra managed files and dependency versions, without overwriting hand-authored skills.

“Global: known in every build” must not mean every observed machine fact is safe to commit. Building inside a repo on macOS does not make every future repo session macOS. Likewise, an unavailable detector is not `false`. Preserve unknown/conflicted values and provenance; specialize only facts explicitly in the build target contract. The project-facts research's distinction between observations and inference should survive into the spec.

### 7. The build step earns its cost only where it removes maintenance work

**Decision challenged:** “Every top-level declaration” has a signature; records and effects are row-polymorphic.

For delegate and wayfinder, useful types include issue numbers/links, job handles, result statuses and extern results. For grilling, most of that is irrelevant. Closed records and explicit effect sets are enough to test the initial wrappers; row polymorphism adds author concepts and difficult error cases without an evident prose-authoring payoff. Defer it until two concrete corpus helpers require it. If retained, document it as an advanced library feature, never a requirement for writing simple skills.

Costs are real: a second language, no editor support, rebuilds after prose edits, generated-file conflicts, interpreter deployment, and debugging source-to-output transformations. Adoption should be incremental: a prose-only skill must compile without rewriting its examples or implementing its scripts in Skillang.

Fake handlers and snapshots are necessary but insufficient. Add behavioral corpus cases: wayfinder must not build; grilling must wait and not answer for the user; delegate must not finish blocked jobs, and must inspect actual work. Compare original and generated skills in fresh Claude/Codex/Pi sessions, including compaction/resume and a failed action. Types and snapshots cannot prove these behaviors. Claude's current guidance explicitly separates activation from successful task behavior. [S2, “Evaluate and iterate on a skill”.]

## What is good and should stay

- Skills remain instructions plus actions, rather than becoming a general workflow engine.
- Concise outlines, explicit splices and deterministic flattening are understandable features.
- Opaque `Json`, checked boundary decoding, ignored extras by default and path-rich errors are sound choices; keep missing versus null explicit.
- Explicit extern signatures and fake effect handlers can move brittle shell plumbing into testable contracts.
- Project builds committed with `skl check` are a sensible deployment model.
- Facts being ordinary stdlib/user declarations avoids hard-coding one author's environment into the language.

**Acceptance recommendation:** finish both handwritten translations and their generated Markdown side by side before locking v0. Require preservation of wayfinder's manual invocation, exact templates, delegate's status/blocked protocol and harness-specific waiting behavior, and relocation of bundled resources. Let that comparison justify each extra language feature.

## Sources and limits

- **Corpus:** `/Users/texoport/.agents/skills/wayfinder/SKILL.md`, `delegate/SKILL.md`, `grilling/SKILL.md`; scripts named above. These are the inspected live author sources, not hypothetical requirements.
- **Project:** `/Users/texoport/code/skillang/CONTEXT.md`; [map #1](https://github.com/saiashirwad/skillang/issues/1); `docs/research/{prior-art,plain-text-problems,project-facts,prose-syntax,typed-json}.md` on their corresponding `origin/research/*` branches.
- **S1:** [Agent Skills specification](https://agentskills.io/specification), verified through [first-party specification source](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx): unrestricted Markdown body, directory resources, progressive disclosure, experimental pre-approval field.
- **S2:** [Claude Code skills](https://code.claude.com/docs/en/skills), fetched as `https://code.claude.com/docs/en/skills.md`: invocation policy, discovery paths, tool pre-approval semantics, multi-turn lifecycle and evaluation guidance.
- **S3:** Installed Pi docs: `/Users/texoport/.local/share/mise/installs/node/24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md` (read completely, along with linked `settings.md` and `packages.md`). Documents `.agents/skills`, explicit-only invocation, argument appending and warning-oriented format validation. It does not establish a skill-level enforcement contract for `allowed-tools`.
- **S4:** [Codex skills](https://developers.openai.com/codex/skills/): progressive loading, `.agents/skills` discovery and `agents/openai.yaml` invocation policy. No universal typed-return callback is specified on this page.
- **S5:** [Rulesync README](https://github.com/dyoshikawa/rulesync/blob/main/README.md), inspected directly: import/convert/generate workflows, skills support and per-tool feature matrix.
- **S6:** [Ruler README](https://github.com/intellectronica/ruler/blob/main/README.md), inspected directly: native skill copying, source comments, dry-run, backups and committed-output drift checking. Its defaults differ from the proposed commit policy; borrow the operational lessons, not every default.

This is a source-based design review, not a harness conformance test. Vendor behavior changes; pin adapter versions and execute discovery/metadata tests before claiming portable enforcement or identical behavior.
