# Project and harness facts for skill compilation

## TL;DR
- A compiler should separate **portable project facts** from **harness-specific packaging**; the latter determines paths, metadata, discovery and limits.
- Harness adapters are necessary: Claude Code, Codex, Cursor, Pi, OpenCode and Copilot do not share one skill/rule convention.
- Prefer observed, explicit facts (lockfiles, scripts, CI config, existing instruction files) to inferred facts; attach provenance and confidence.
- Repository files reveal likely languages, package managers, commands and monorepo boundaries, but do not prove what runs successfully.
- Existing `AGENTS.md`/`CLAUDE.md` and equivalent instructions should be read and composed, not overwritten.
- No universal authoritative project-facts detector was confirmed; reuse package-manager, editor, environment and CI conventions.
- Emit facts with source path, scope, detection method and confidence; require human input when evidence conflicts or commands are absent.

## Scope and method
This is a documentation/source survey for a compiler that specializes skills to one project. “Reliability” below means confidence that a file or setting exists and says what it says—not that its claim is correct, current, or executable. A lockfile is strong evidence of a selected package manager; a successful test run is stronger evidence of a working test command. Repository scans are snapshots and can be incomplete (ignored files, generated files, nested roots, conditional workflows).

## Harness output differences

| Harness | Discovery/location and format | Fields, scripts, limits / implications |
|---|---|---|
| Claude Code | Skills are directories containing `SKILL.md`, discovered under `.claude/skills/` (project) or personal skills; legacy/custom slash-command files are also supported. | Skill metadata includes `name`, `description`, and optional fields such as `allowed-tools`, `model`, `context`, `agent`, `user-invocable`, and `argument-hint`. Supporting files/scripts can live alongside the skill. Claude documents skill loading and frontmatter options; do not assume these fields transfer to another harness. [Claude skills](https://docs.anthropic.com/en/docs/claude-code/skills), [Claude settings](https://docs.anthropic.com/en/docs/claude-code/settings). Anthropic's docs were inaccessible to automated fetch (403) during this research; details should be rechecked against current documentation before shipping an adapter. |
| OpenAI Codex | Repository skills are `.agents/skills/<name>/SKILL.md`; Codex also searches parent/home skill locations. | Required `name` and `description`; optional metadata in `agents/openai.yaml` supports UI/display and invocation settings. Skills may include scripts/resources; Codex does not promise a universal script sandbox. [Codex skills](https://developers.openai.com/codex/skills/), [AGENTS.md](https://developers.openai.com/codex/guides/agents-md/). |
| Cursor | Project rules live in `.cursor/rules/*.mdc`; legacy `.cursorrules` remains supported. Skills are also supported in `.cursor/skills/<name>/SKILL.md` and `.agents/skills/`. | MDC frontmatter supports `description`, `globs`, and `alwaysApply`; rules can be scoped by file patterns. Cursor's rules, skills and commands are distinct concepts. Do not translate arbitrary skill frontmatter to MDC. [Rules](https://docs.cursor.com/context/rules), [Skills](https://docs.cursor.com/context/skills). |
| Pi | Skills are directories containing `SKILL.md`; discovery includes project `.pi/skills/` and agent-wide skill locations. | Uses YAML frontmatter with skill `name` and `description`; additional files are available to the skill. No universal fixed token/byte ceiling was confirmed in the public docs. [Pi skills](https://pi.dev/skills). Pi docs returned 403 to this fetch; verify supported metadata and discovery paths with the version's docs/source before implementation. |
| OpenCode | Project skills use `.opencode/skills/<name>/SKILL.md`; `.agents/skills/` is also recognized. | Frontmatter requires `name` and `description`; optional `license`, `compatibility`, `metadata`, and `allowed-tools` are documented. Skills are loaded on demand; documentation mentions skill configuration, but a numeric size cap was **not confirmed**. [OpenCode skills](https://opencode.ai/docs/skills/). Site returned 403 during automated fetch; check current docs. |
| GitHub Copilot | Repository-wide instructions use `.github/copilot-instructions.md`; path-specific instructions can be `.github/instructions/<name>.instructions.md`. Agent skills are available under `.github/skills/` and `.agents/skills/` in supported Copilot surfaces. | Instruction files are Markdown, not a shared frontmatter schema. Path-specific files use `applyTo` glob frontmatter. Copilot supports prompt files/agent instructions separately; avoid flattening all into a single assumed format. GitHub has documented context/window limits that vary by model and product, but no stable per-instruction-file ceiling was confirmed. [Repository instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot), [custom instructions overview](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot). |

**Caveat:** Harness conventions evolve. The public source pages above are the primary references; automated access to Anthropic, Pi and OpenCode pages was blocked in this run, and exact limits for these products could not be independently verified. The compiler should version adapters and validate against current docs, not hard-code an assumed cross-harness schema. No reliable, common maximum skill-file size across all six harnesses was established. Avoid claiming a fixed limit; truncate only under an explicit adapter policy and report it.

## Project facts: evidence and reliability

| Fact | Where it comes from / detection | Reliability |
|---|---|---|
| Repository root and nested package roots | VCS root; manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.); workspace declarations; directory scan | High for detected files, medium for semantic boundaries; nested repositories/submodules and generated/ignored roots need care. |
| Language(s) | Source extensions plus language manifests/configs; optionally language-server/editor project discovery | Medium from extensions; high when an authoritative manifest/toolchain config agrees. Polyglot repos make a single-language answer misleading. |
| Package manager | Lockfiles and package-manager metadata: e.g. `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, Python lockfiles, `Cargo.lock`; `package.json` `packageManager` field | High for the selected manager when metadata is consistent; conflicting lockfiles reduce confidence. A manifest alone may not identify the manager. npm documents `packageManager` in package metadata and Corepack behavior. [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json), [Corepack](https://nodejs.org/api/corepack.html). |
| Test/build/lint commands | `scripts` in package manifest; `Makefile`, task runner config, `pyproject.toml`, CI workflow commands, docs | High that a declared command exists; medium that it is canonical; low that it currently passes. Prefer existing scripts and CI invocation over guessed commands. [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts). |
| Toolchain/runtime versions | `.nvmrc`, `.node-version`, `mise.toml`/`.tool-versions`, `rust-toolchain.toml`, `go.mod`, `pyproject.toml`, devcontainer, Nix | High for explicit pins, medium where ranges or multiple declarations conflict. `mise` supports project config; Nix flake/devShell can encode reproducible environment. [mise config](https://mise.jdx.dev/configuration.html), [Nix flakes](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake.html). |
| Monorepo/workspaces | `pnpm-workspace.yaml`, package manifest workspace fields, Nx/Turborepo/Lerna/Bazel config, nested manifests | High for explicit workspace declarations; medium for inferred directory topology. Commands may be package-scoped or require a repository task runner. [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces). |
| CI and verified commands | `.github/workflows/*.yml`, other CI config (GitLab, Buildkite, CircleCI, etc.) | High that pipeline config declares those steps; medium that they represent local developer workflow; low that they pass on the current checkout without execution. Workflows have conditions, matrices and secrets. [GitHub Actions workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions). |
| Existing agent instructions | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules`, `.claude/`, `.opencode/`, `.pi/` and parent directories | High that text exists; content is authoritative only within its stated scope and may be stale. Codex specifically applies `AGENTS.md` hierarchy; other harnesses have their own precedence. Preserve provenance and do not silently replace. [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/), [Copilot instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot). |
| Container/environment setup | `.devcontainer/devcontainer.json`, Dockerfiles/Compose, Nix files, mise/asdf config, `.env.example` | High for declared setup, medium for actual environment. Secrets, host assumptions, lifecycle scripts and conditional features prevent a declaration from proving the environment works. [Dev Container spec](https://containers.dev/implementors/json_reference/). |
| Language server / editor project settings | `lsp` settings, editor config, IDE project files, language-server manifests | Medium: useful corroboration for language and tooling, but editor config can be personal, stale, or incomplete. Do not treat an installed LSP as proof of canonical build/test commands. |

### Reuse conventions, not guesses

1. **Parse native configuration first.** Package manifests and workspace/task-runner configs are better command sources than language heuristics. Preserve exact command, working directory and source file.
2. **Use environment descriptors as strong toolchain signals.** Dev Containers describe a reproducible development environment; mise/asdf pin tools; Nix can declare packages and dev shells. These are complementary rather than interchangeable.
3. **Treat CI as corroboration.** Extract job commands and conditions, but mark them as CI commands and retain matrix/conditional context; do not label every step a local test command.
4. **Use language-server/editor data only for corroboration.** LSP configuration can identify language and root conventions but does not establish build behavior.
5. **Read instruction hierarchy, do not flatten blindly.** A nested `AGENTS.md` can be scoped to a subdirectory; Claude/Cursor/Copilot rules have their own discovery and glob semantics. Output should preserve scope and provenance.

### Prior project-specializing instruction tools

The clearest close precedent is **GitHub Copilot repository and path-specific custom instructions**: repository-wide instruction Markdown plus `applyTo`-scoped files. It specializes guidance to repository and file path, but does not generally inspect arbitrary project configuration and synthesize commands. [GitHub docs](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot).

**Cursor Project Rules** likewise scope instructions by glob and always-on behavior, and its agent supports rules/skills. This is instruction selection based on repository context, not a general-purpose, trustworthy project-facts detector. [Cursor rules](https://docs.cursor.com/context/rules).

**OpenAI Codex** reads hierarchical `AGENTS.md` instructions and skills; **Claude Code** supports project skills and memory/instructions. These are adjacent mechanisms, rather than verified automatic project profilers. [Codex](https://developers.openai.com/codex/guides/agents-md/), [Claude](https://docs.anthropic.com/en/docs/claude-code/memory).

No prior tool that reliably derives a complete project model and emits harness-neutral specialized instructions was confirmed. This is a bounded finding, not proof none exists.

## Recommendation for the compiler

Represent each fact as a value plus `source`, `scope`, `detector`, `confidence`, and optionally `observed_at`; retain conflicts rather than silently choosing. Separate detected facts from inference and user overrides. Suggested confidence tiers: **explicit** (declared config), **corroborated** (multiple independent sources), **inferred** (heuristic), **unknown/conflicted**. Harness adapters should separately encode discovery path, required metadata, optional metadata, supported resources/scripts, precedence, and any verified size constraints. Generate no fictitious test/build command: if none is declared, say so or ask.

## Not confirmed

- A common or stable file-size/token limit across all six harnesses.
- That script support means scripts execute automatically, or with the same permissions, on each harness.
- Exact current metadata/discovery details for the three vendor sites that rejected automated access (Claude Code, Pi and OpenCode); cited docs are listed but should be manually checked before adapter implementation.
- A universal standard for detecting canonical test/build commands or the existence of a complete prior project-profiler tool.
