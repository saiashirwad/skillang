# Prior art: languages and tools for agent skills, rules, and prompts

## TL;DR

- Most agent “skill” formats are portable Markdown conventions, not programming languages: metadata plus instructions and optional supporting files.
- Agent-specific rule systems differ in discovery, scoping, activation and metadata; a shared source is useful, but generated targets need explicit capability mappings and loss warnings.
- Multi-target generators demonstrate the practical value of canonical source plus adapters. They generally translate configuration, not arbitrary prompt semantics.
- Prompt DSLs span text templating (Jinja), typed prompt construction (POML, Prompty, Priompt), and model/program interfaces (BAML, DSPy, Guidance, LMQL). These are not interchangeable.
- Skillang should start with a small, deterministic, statically validated source model and Markdown outputs; keep target-specific features explicit rather than pretending all agents support the same semantics.
- Avoid general-purpose execution, implicit template magic, and claims of behavioral equivalence across targets. Separate reusable content from agent-specific activation and frontmatter.
- Adoption is hard to compare: projects publish different metrics and no neutral usage census was found. Treat repository stars/downloads as snapshots, not proof of production use.

## Scope and method

This is a survey of first-party specifications, documentation, and repositories, accessed 2026-10-01. “Adoption” below means only what the primary source itself makes verifiable (for example, distribution mechanism or published repository activity); no comparable independent adoption dataset was found. The report distinguishes a skill (a packaged, discoverable capability) from a rule (ambient or path-scoped instructions) and a prompt program (structured construction/execution of model input). A link to a project's source is supplied for each description; claims about limits are explicitly framed as observations or design implications rather than project promises.

## Agent skill and rule formats

### Anthropic Agent Skills / `SKILL.md`

The open Agent Skills specification describes a skill as a directory containing `SKILL.md` and optionally scripts, references, and assets. The Markdown file begins with YAML frontmatter; `name` and `description` are required, and the body contains instructions. The spec recommends progressive disclosure: keep the initial description concise and load fuller instructions/resources when relevant. It defines optional metadata and validation constraints, but the body is ordinary Markdown, not a typed control-flow language. [Specification](https://agentskills.io/specification) · [Format overview](https://agentskills.io/home) · [Anthropic announcement](https://www.anthropic.com/news/skills)

**Composition/output/adoption.** Composition is by directory packaging and references to bundled files; the specification does not define general-purpose `include`, variables, or conditionals. Output is a skill directory, not a compiled prompt. The published spec and public implementations establish an openly documented format; precise installed-user counts were not found. **Implication:** copy the useful package + metadata + progressive disclosure model, but do not confuse file references with language-level composition.

### `AGENTS.md`

The Agents MD project presents `AGENTS.md` as a Markdown instruction file for coding agents, with a convention for locating it in repositories and nested directories. Its guidance is plain text and hierarchy/context dependent, not a schema for executable prompt programs. [AGENTS.md](https://agents.md/) · [OpenAI Codex AGENTS.md guidance](https://developers.openai.com/codex/guides/agents-md/)

**Composition/output/adoption.** Nested files allow instructions to be scoped by repository subdirectory (Codex documents how it combines applicable instruction files); the format itself does not define variables, conditionals, or typed includes. Output is Markdown at conventional paths. The format is recognized by multiple coding agents, but there is no central conformance registry or usage count established by these sources. **Implication:** model inheritance and precedence precisely; the same filename does not guarantee identical semantics in each consumer.

### Cursor rules

Cursor documents project rules in `.cursor/rules` as `.mdc` files, with frontmatter such as description, globs, and `alwaysApply`; rules may be always-on, matched to files, or agent-selected. Cursor also documents legacy `.cursorrules`. [Cursor rules](https://docs.cursor.com/context/rules)

**Composition/output/adoption.** Scope/activation is the core composition mechanism; rule contents are Markdown. `@` references can bring files into context, but this is not a general typed include/conditional language. Output is Cursor-specific `.mdc` files. **Implication:** represent activation metadata in adapters, rather than silently flattening it into generic Markdown.

### GitHub Copilot instructions

GitHub supports repository-wide `.github/copilot-instructions.md`, path-specific `.github/instructions/*.instructions.md` (with `applyTo` frontmatter), and agent instruction files such as `AGENTS.md`; custom instructions are Markdown. [Repository custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot) · [Path-specific instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot#creating-instructions-for-specific-paths)

**Composition/output/adoption.** Repository-wide and glob-scoped files provide scope, not arbitrary conditional execution or typed interpolation. Output consists of GitHub-specific paths/frontmatter and Markdown. GitHub documents feature availability and supported instruction types, but not a comparable usage count. **Implication:** retain target-specific path mapping and account for differences in supported clients/features.

### OpenAI Codex

Codex documents `AGENTS.md` as its repository instruction mechanism and supports user-, repository-, and nested-directory guidance. It also documents skills: a folder with `SKILL.md` metadata/instructions and optional resources, selected by the agent; skills can be invoked explicitly or used based on task relevance. [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) · [Codex skills](https://developers.openai.com/codex/skills/)

**Composition/output/adoption.** Skills use Markdown plus YAML metadata and bundled resources; directory hierarchy and skill loading form composition. No general-purpose prompt variables/conditionals are specified in the skill format. Output is files consumed by Codex. Public docs establish supported features, not user counts. **Implication:** align with the lowest common portable package shape but permit Codex adapter details.

### Pi

Pi documents skills as `SKILL.md` files discoverable in configured locations, with YAML frontmatter and Markdown instructions. It also has `AGENTS.md` project guidance. The skill tool's documented loading/invocation behavior is distinct from the contents of a skill. [Pi skills](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md) · [Pi repository](https://github.com/badlogic/pi-mono)

**Composition/output/adoption.** Skills package instructions and optional referenced assets; no generic variable/conditional language is defined by the file format. Output is a discoverable directory. Adoption figures were not confirmed. **Implication:** treat the host's discovery/loading contract as adapter behavior, not assume identical semantics from shared Markdown.

### OpenCode

OpenCode documents agent instructions through `AGENTS.md`, plus rules/agents/commands and skills under its configuration conventions. Its skills use the Agent Skills-style `SKILL.md` convention; project configuration can identify instruction files. [OpenCode rules](https://opencode.ai/docs/rules/) · [OpenCode skills](https://opencode.ai/docs/skills/) · [OpenCode configuration](https://opencode.ai/docs/config/)

**Composition/output/adoption.** Markdown instructions and skill packages are combined with OpenCode discovery/configuration; file references and configuration are not a universal prompt compiler. Some configuration fields support globs or patterns, but the source format's complete semantics remain host-owned. Output is OpenCode-specific configuration and conventional Markdown paths. **Implication:** adapters must reflect actual versioned host behavior.

## Multi-target rule generators

### rulesync

`rulesync` is an open-source CLI for managing AI coding-agent rules and related configuration from a common source and generating files for supported agents. Its documentation lists supported tools, source conventions, commands, and generated output. [Repository and README](https://github.com/dyoshikawa/rulesync) · [Configuration/docs](https://github.com/dyoshikawa/rulesync/tree/main/docs)

Its model is canonical configuration plus adapters/templates and target-specific metadata; outputs include agent-specific rule/config files. It can translate shared instructions, but target-only features cannot be made equivalent by text conversion. The existence of a maintained multi-agent support matrix is evidence of practical scope, not a neutral adoption measure. **Lesson:** make targets and lossy mappings inspectable, and test generated output.

### `ruler`

`ruler` describes itself as a tool to write rules once and distribute/sync them to multiple AI coding assistants. It supports a common rules directory and targets including several coding agents; it offers CLI workflows for generating or installing target files. [Repository](https://github.com/intellectronica/ruler)

The composition model is shared Markdown/rules plus target-specific placement/format conversion; output is files in each agent's expected location. The approach does not supply general typed prompt semantics or guarantee each host interprets identical text identically. **Lesson:** generated-file ownership, idempotence, cleanup, and target support are product features, not incidental details.

### Similar: `ai-rules` / agent-specific generators

Several repositories provide overlapping “write once, distribute to agents” functionality; capability lists and maintenance vary. No stable exhaustive catalog or independent comparative adoption source was found. Representative primary sources: [rulesync](https://github.com/dyoshikawa/rulesync), [ruler](https://github.com/intellectronica/ruler), and [GitHub Copilot custom instructions documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot). Do not infer semantic portability from support for multiple output paths.

## Prompt languages and DSLs

| Tool | Model and composition | Output / use | Limits and relevance |
|---|---|---|---|
| **POML** | Microsoft presents Prompt Orchestration Markup Language: XML-like markup for structuring prompt components, data, and multimodal content, with reusable components and variables. [Official docs](https://microsoft.github.io/poml/) · [Repository](https://github.com/microsoft/poml) | A structured prompt representation rendered/used by SDK integrations. | Richer than a skill format; incurs a runtime/tooling model and does not itself define each agent's skill discovery contract. |
| **Prompty** | Microsoft-authored prompt-file format with YAML frontmatter and a templated body; metadata configures model and inputs. [Docs](https://prompty.ai/) · [Repository](https://github.com/microsoft/prompty) | `.prompty` prompt assets rendered and invoked through supported runtimes/integrations. | A prompt artifact/runtime format, not a cross-agent skill package. Template/runtime dependencies affect portability. |
| **BAML** | BoundaryML's language/schema and compiler generate typed clients for LLM functions; prompts support templating and outputs are validated against declared types. [BAML docs](https://docs.boundaryml.com/) · [Repository](https://github.com/BoundaryML/baml) | Compiled client code calling model providers, with structured results. | A programming/compiler stack aimed at application LLM calls, not ambient instructions or skill packaging. Types constrain interfaces, not model truth. |
| **Priompt** | TypeScript/React-like JSX composition of prompt components; supports conditional composition based on token budget and priority. [Repository/docs](https://github.com/anysphere/priompt) | Prompt text assembled for an application/model call. | Application code and runtime/tokenization concerns; not a static portable skill format. |
| **DSPy signatures** | Signatures declare input/output fields and types; modules/programs compose predictors and can be compiled/optimized against metrics and data. [Signatures](https://dspy.ai/learn/programming/signatures/) · [DSPy](https://dspy.ai/) | Executable Python programs and optimized parameters/prompts, not merely prompt text. | Depends on Python/runtime, datasets/metrics and model calls; orthogonal to rule-file distribution. |
| **Guidance** | Python-based constrained generation framework using templates/control structures and grammar constraints; program interleaves literals and model generation. [Docs](https://guidance.readthedocs.io/) · [Repository](https://github.com/guidance-ai/guidance) | Runtime execution controlling model generation, often with structured constraints. | Runtime/model integration rather than portable instructions; constrained decoding support depends on backend. |
| **LMQL** | Query language combining prompt syntax, variables, constraints and control flow; compiler/runtime executes queries, often with constrained decoding. [Docs](https://lmql.ai/docs/) · [Repository](https://github.com/eth-sri/lmql) | Executable query/prompt programs. | More powerful, but requires a language/runtime and backend-specific capabilities; unsuitable as a minimal file interchange format. |
| **Jinja-style templates** | General-purpose text templates with variables, loops, conditionals, includes/macros depending on implementation. [Jinja template docs](https://jinja.palletsprojects.com/en/stable/templates/) | Rendered text (including prompts/rules) at build/runtime. | Escaping, undefined values, nondeterminism, code execution/extensions and environment coupling can make prompt output opaque. Adopt only a deliberately restricted subset if needed. |

The categories matter: POML/Prompty structure prompt assets; BAML/DSPy expose typed application interfaces or programs; Priompt composes under token budgets; Guidance/LMQL orchestrate generation; Jinja renders strings. “Prompt language” does not imply the same output artifact, type guarantees, or execution model.

## Projects explicitly described as compilers

“Prompt compiler” is used loosely. The primary sources reviewed show at least three distinct meanings:

1. **Code generation and typed boundary:** BAML compiles definitions into client code; this is the strongest conventional compiler analogy among the surveyed projects. [BAML docs](https://docs.boundaryml.com/)
2. **Prompt optimization:** DSPy “compilation” optimizes program parameters/prompts using data and metric feedback, rather than translating one portable skill source into multiple rule files. [DSPy compilation](https://dspy.ai/learn/optimization/overview/)
3. **Template/query execution:** LMQL compiles/executes constrained language programs; Guidance executes structured generation programs. [LMQL docs](https://lmql.ai/docs/) · [Guidance docs](https://guidance.readthedocs.io/)

The term “skill compiler” also appears in small/new repositories and marketing, but no authoritative standardized category or widely established compiler target was confirmed in this survey. Avoid claiming novelty based only on the label. Skillang's differentiator should be stated narrowly: a source language plus validated compilation to specified agent skill/rule formats, if that is what it implements.

## Recommendations for Skillang

1. **Specify the semantic core first.** Define a skill as metadata, instruction body, and explicit resource references; separately define rule scope/activation. Keep those concepts distinct.
2. **Compile deterministically.** Given source, target, and declared options, produce reproducible files. Add a check/diff mode and diagnostics with source locations.
3. **Use explicit composition.** If imports/includes are needed, define resolution, cycles, ordering, and boundaries. Avoid implicit filesystem globbing and hidden inheritance.
4. **Keep templating restricted and opt-in.** Variables with declared inputs and strict missing-variable errors may be useful; defer general loops/conditionals or arbitrary code until demonstrated need. This prevents different targets from rendering materially different prompts.
5. **Declare target capability and loss.** Scope/glob, activation, metadata, and resource support vary. Emit warnings when a target cannot represent source semantics; never silently claim equivalence.
6. **Preserve authored Markdown.** Use Markdown as the body/output substrate for interoperability. Make generated headers/paths target adapters' responsibility.
7. **Test adapters against official examples/specs.** Snapshot fixtures and host-specific conformance tests should be versioned; formats evolve independently.
8. **Do not turn compilation into prompt execution by default.** Avoid arbitrary code, model calls, or optimization in the compiler core. That keeps builds inspectable and safe.

## What could not be confirmed

- No reliable, cross-project adoption figures for any format or generator; repository popularity is not a usage census.
- Whether every listed consumer currently implements every optional feature in its public format, or how rapidly compatibility changes across releases.
- A definitive exhaustive list of products calling themselves “skill compiler” or “prompt compiler.” Search terminology is inconsistent and projects change quickly.
- Behavioral equivalence of generated rules across agents. Each host controls discovery, prompt assembly, precedence, and model behavior; textual similarity is not evidence of equivalent results.
