# Plain-text agent skills: failure modes and compiler opportunities

## TL;DR
- Skills are generally directories whose `SKILL.md` frontmatter/description is indexed, while their body and references are loaded later; exact behavior varies by host. [1–4]
- This progressive-disclosure design saves context, but means discovery depends on concise, accurate metadata and model/harness selection. [1,2]
- Markdown can be validated and compiled: metadata/schema, links/paths, commands, duplication, packaging, host adapters, and automated checks are plausible wins.
- A compiler cannot guarantee correct activation, model compliance, useful advice, or up-to-date external facts; those need evaluations, runtime context, and maintenance.
- Vendor guidance already recommends concise, specific descriptions, workflows, examples, and testing—suggesting authoring discipline, not necessarily a new language. [5]
- Community issues provide signals of broken paths, overlapping skills, and absent evaluations, but do not establish prevalence or causation. [6–8]

## Scope and method
This note compares first-party documentation and public community reports. “Skill” means an agent-invoked package of instructions/resources, not every product’s rules or prompt feature. Sources were checked 2026-10-01; links can change. Facts below are attributed; recommendations are explicitly analysis.

## How hosts load skills

**Claude Code.** A skill is a directory with `SKILL.md`; YAML frontmatter supplies `name` and `description`, and optional fields control invocation/visibility. Claude discovers skill descriptions and can load the full instructions when relevant; skills may also be explicitly invoked by `/skill-name`. Supporting files can be linked from the entry document, allowing progressive disclosure. Claude documents personal, project, and plugin skill locations and precedence. [1] The official authoring guide stresses that descriptions are used to decide when a skill applies and should state what it does and when to use it. [5]

**Codex.** OpenAI describes skills as folders centered on `SKILL.md`, with optional scripts, references, and assets. Discovery reads skill metadata (including description); the full instructions are loaded when the skill is selected. Skills can be invoked explicitly or selected implicitly, and can be scoped to repositories or user configuration. [2]

**Cursor.** Cursor documents Agent Skills as `SKILL.md` packages with YAML metadata, supporting files, and automatic or explicit invocation. Its docs distinguish skills from always-on project rules and describe loading relevant skill content as needed. [3]

**Cross-vendor format.** The Agent Skills specification standardizes a directory and `SKILL.md` with YAML frontmatter, required name/description, and optional references/scripts/assets. It describes metadata discovery followed by loading instructions when activated. The standard does not make every runtime’s trigger policy identical. [4]

**Implication (analysis).** Progressive disclosure limits context/token expenditure compared with injecting every full instruction on every turn, but metadata itself must be considered for discovery; activated skill text and referenced content still consume context. Token accounting and exact ranking/selection algorithms are host-specific and not fully specified publicly. There is no universal guarantee of activation merely because metadata matches semantically.

## Documented and reported failure modes

### What can go wrong

- **Missed activation.** Automatic selection is a relevance judgment, not a deterministic dispatch contract. Authors are explicitly told to make descriptions clear about both capability and use case. [1,5] Community reports/issues proposing trigger improvements indicate users encounter this class of problem, but issue titles alone do not prove frequency or root cause. [6]
- **Drift and duplication.** Multiple copies or overlapping instruction sets can diverge. A public audit/change request explicitly calls out merging overlaps and sharpening triggering in a skills collection. [7] Markdown has no built-in import/version/dependency semantics, although repository tooling can provide them.
- **Hard-coded project details; stale paths/commands.** Instructions that name a particular repository layout, tool version, or command become incorrect when those change. The format permits arbitrary prose and paths; neither Markdown nor frontmatter asserts that referenced files/commands exist. The reviewed vendor docs explain packaging and authoring, but do not promise automated freshness checks. [1–5]
- **No behavioral tests by default.** A valid Markdown file may still fail to trigger or produce desired outcomes. A community request asks for behavioral evaluation suites for prompt-only skills, illustrating the gap as a requested capability, not proving that every host lacks all evaluation support. [8]
- **Overlong or misplaced context.** Progressive disclosure is intended to keep entry instructions focused and delegate details to references. Poorly structured instructions can squander context or bury the relevant action; vendor guidance recommends concise, task-focused skills. [1,5]

### Concrete community evidence (limited)

1. GitHub issue `oh-my-pi#13297` proposes that skill activation must override explicit “do not read skills” instructions. This is a report/proposal about interaction between instruction priorities and skill activation; it is not independent evidence of a general platform defect. [6]
2. GitHub PR `MGriot/.gemini#1` describes auditing skills to merge overlaps, fix broken skills, and sharpen triggering. This is concrete evidence that one collection required those maintenance tasks. [7]
3. GitHub issue `cboone/agent-harness-plugins#479` requests behavioral eval suites for prompt-only skills. It supports the observation that evaluability is a community concern; it does not establish the state of every vendor’s tooling. [8]

I could not confirm reliable aggregate statistics for missed activation, duplication, stale paths, or failure rates. I also could not verify from first-party evidence that plain text itself causes these problems; many are process, retrieval, or maintenance failures that would also affect compiled artifacts.

## Vendor authoring guidance and compiler implications

Anthropic advises keeping a skill focused, writing clear descriptions that identify both the task and when to use it, structuring instructions in actionable steps, using supporting files for detail, and testing with representative tasks. [5] Claude Code’s skill documentation likewise specifies frontmatter and directory conventions and explains invocation/discovery. [1] Codex and the Agent Skills specification define analogous package boundaries and metadata fields. [2,4]

**Analysis: reasonable compiler scope**

A compiler/linter could provide value without replacing Markdown:

- Parse and validate frontmatter, required fields, naming constraints, and host-specific schemas.
- Check relative links, referenced files, script existence/executable status, and optionally verify commands in a declared environment.
- Detect likely duplicate skills and overlapping descriptions; flag excessively broad or vague trigger descriptions for review.
- Support shared includes, pinned dependencies, host-targeted builds, and generated manifests/adapters while preserving portable source.
- Produce a dependency graph, token/size estimates, diagnostics with source locations, and reproducible packages.
- Offer eval harness integration: explicit prompts, expected activation, task assertions, regression tracking. Report results, not certify correctness.

These are proposed capabilities, not features promised by existing formats or a guarantee that static analysis can judge semantic quality.

**Not solved by compilation alone**

A compiler cannot know the user’s unstated intent, force a host’s model to select a skill, ensure generated instructions are followed, prove semantic correctness of prose, or keep advice current when remote APIs/project architecture change. Nor does a successful build show usefulness. Those require maintained ownership, integration with live contexts, representative behavioral evals, and runtime safeguards. Some compiler support can expose these risks, but not eliminate them.

## Sources

1. Anthropic, *Extend Claude with skills (Claude Code)*: https://docs.anthropic.com/en/docs/claude-code/skills
2. OpenAI, *Codex skills*: https://developers.openai.com/codex/skills
3. Cursor, *Agent Skills*: https://docs.cursor.com/context/skills
4. Agent Skills, *Specification*: https://agentskills.io/specification
5. Anthropic, *Skill authoring best practices*: https://docs.anthropic.com/en/docs/claude-code/skills (authoring recommendations in Claude Code skills documentation)
6. GitHub issue, *oh-my-pi#13297*: https://github.com/can1357/oh-my-pi/issues/13297
7. GitHub PR, *MGriot/.gemini#1*: https://github.com/MGriot/.gemini/pull/1
8. GitHub issue, *cboone/agent-harness-plugins#479*: https://github.com/cboone/agent-harness-plugins/issues/479
