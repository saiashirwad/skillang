## TL;DR

- `.agents/skills/` is **not a universal discovery path**: Claude Code 2.1.287 did not list the project probes; Pi 0.99.2 and Codex 0.159.3 did. [T1–T3](#local-verification)
- Claude's documented native paths are `.claude/skills/` and `~/.claude/skills/`; a symlinked skill folder works. [C1](#sources), [T1](#local-verification)
- Pi and Codex discover both project and home `.agents/skills/`, including symlinked skill folders. Pi project discovery requires project trust. [P1–P3, X1](#sources), [T2–T3](#local-verification)
- OpenCode's published docs and v1 compatibility implementation support both `.agents/skills/` locations and symlinks; installed **v2.0.19 verification was inconclusive**, even with a native positive control. Do not silently promote v1 evidence into a v2 guarantee. [O1–O3](#sources), [T4](#local-verification)
- Claude's `allowed-tools` is **turn-scoped pre-approval, not an allowlist or sandbox**. Other tools remain callable under baseline permissions. [C1](#sources)
- Pi's loader does not implement `allowed-tools`; Codex's frontmatter parser does not consume it; OpenCode ignores it as skill metadata. [P2, X2, O1–O3](#sources)
- Manual-only: Claude/Pi use `disable-model-invocation: true`; Codex uses `agents/openai.yaml` → `policy.allow_implicit_invocation: false`. These are not interchangeable. [C1, P1–P2, X1–X2](#sources)
- No equivalent manual-only OpenCode skill field was confirmed. `permission.skill: ask` requests approval for model loading, not manual-only invocation; `deny` blocks access. [O1–O3](#sources)

| Harness | Discovery paths (project / home) | Symlinks | `allowed-tools` behavior | Invocation-policy field | Source |
|---|---|---|---|---|---|
| **Claude Code** (installed 2.1.287) | **No automatic `.agents/skills/` discovery confirmed**; project probe absent. Native `.claude/skills/<name>/SKILL.md` at CWD and ancestors to repository/worktree root; personal `~/.claude/skills/`. Also managed, plugin and explicitly added directories. | Yes: skill-folder symlinks in project/personal/managed paths; same target deduplicated. Project folder tested. Plugin symlinks have separate rules. | Pre-approves matching tools during the invoking turn; clears on the next user message. **Does not remove unlisted tools**. Normal permission rules still apply. | `disable-model-invocation: true` hides description from model and keeps `/name` available. `user-invocable: false` is the **opposite** (model-only), not manual-only. Settings also offer `skillOverrides: {name: "user-invocable-only"}`. | [C1](#sources); [T1](#local-verification) |
| **Pi** (installed 0.99.2) | Project `.agents/skills/` at CWD and ancestors through repo root (filesystem root without a repo); home `~/.agents/skills/`. Native `.pi/skills/` at CWD and `~/.pi/agent/skills/`; settings, packages and `--skill` add locations. **Project resources require trust**. | Yes: folder and `SKILL.md` file symlinks followed; canonical file paths deduplicated. Folder discovery tested. Package glob traversal differs: explicitly list symlinked resource roots. | Documented as an experimental specification field, but **not consumed by Pi's skill loader**; no per-skill pre-approval or tool restriction implemented there. Pi itself does not ask approval for each ordinary tool call. | `disable-model-invocation: true` excludes skill from model advertisement but retains `/skill:name`. Codex YAML is not read by this loader. | [P1–P3](#sources); [T2](#local-verification) |
| **Codex** (installed 0.159.3) | Project `.agents/skills/` from CWD through repo root; home `$HOME/.agents/skills/`; admin `/etc/codex/skills`; bundled system and plugin skills. Source also retains deprecated `$CODEX_HOME/skills` and config-layer project skill roots. | Yes: documented skill-folder symlinks, locally verified. Source follows directory symlinks for user/repo/admin, not bundled system scope. | **Not a recognized skill frontmatter control** in inspected parser. No pre-approval/restriction follows from this field. `agents/openai.yaml` tool dependencies declare integrations, not a tool allowlist. | `<skill>/agents/openai.yaml`: `policy.allow_implicit_invocation: false` (default true); explicit `$skill` still works. `disable-model-invocation` in `SKILL.md` is not parsed as invocation policy. | [X1–X2](#sources); [T3](#local-verification) |
| **OpenCode** (installed v2.0.19; docs/v1 compatibility evidence) | Published docs/v1: project `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` from CWD through git worktree root; home `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`. v1 source also accepts `skill/` singular and configured paths/URLs. **Installed v2 discovery not confirmed**. | Yes in inspected v1 and v2 scanners (`symlink: true`); not established by installed CLI probe. | Published docs say unknown frontmatter ignored; neither inspected implementation consumes `allowed-tools`. Skill-access permission is separate from permissions governing actions after loading. | **No confirmed manual-only field**. `disable-model-invocation` ignored by inspected loaders. Published `permission.skill` allow/ask/deny controls loading, not manual-only. v2 recognizes `slash`, but its availability filter does not use it to suppress model selection. | [O1–O3](#sources); [T4](#local-verification) |

## Scope and method

Verified on **2026-10-01**. Read official documentation, first-party source, installed Pi documentation/source, and ran isolated startup/discovery probes. Versions are observations, not minimum supported versions. References to mutable vendor docs describe the fetched snapshot; code links below are pinned. No subagents, GitHub issue edits, user configuration edits or writes to real home skill folders were used. Scratch home/config directories were created under `/tmp`. [T1–T4](#local-verification)

Prior notes were consulted (`origin/research/project-facts:docs/research/project-facts.md` and `docs/reviews/v0-design-author.md`). One correction to the earlier project-facts table: OpenCode's published skill frontmatter reference **does not list `allowed-tools`**; it explicitly ignores unknown fields. Pi's docs list the specification field, but this is not evidence that Pi enforces or grants it. [O1, P1–P2](#sources)

### Permissions versus invocation

Claude's documentation explicitly separates persistent skill instructions from a transient permission grant: instructions remain in conversation, while `allowed-tools` clears on the next user message. It also says workspace trust does not gate project skill grants, including `-p` in an untrusted folder. Its example uses `Bash(git add *) Bash(git commit *) Bash(git status *)`; this grants approval for those commands, rather than forbidding other commands. The docs say deny/ask permission rules override the grant in the dynamic command permission flow. No runtime approval-boundary test was performed here. [C1](#sources)

Pi's loaded skill object contains name, description, paths, source information and `disableModelInvocation`, but no `allowed-tools` state. Its safety docs say tools run with the process user's permissions and do not request per-call approval. Session tool selection (`--tools`, `defaultTools`) and external isolation are separate controls; compiling an effect set to skill frontmatter cannot constrain direct `bash` calls. [P2–P3](#sources)

Codex's parser consumes name, description and `metadata.short-description`; its sidecar loader consumes interface, dependencies and policy. Neither supplies a skill-level `allowed-tools` mechanism. `dependencies.tools` in the documented sidecar describes MCP integrations (name, transport, URL), not permission to execute arbitrary tools. This is a bounded source finding, not a claim that Codex lacks sandbox/approval controls elsewhere. [X1–X2](#sources)

OpenCode's published `permission.skill` example controls **access to the skill tool**: allow loads immediately, ask prompts before loading, deny hides/rejects. It is not a permission envelope around instructions after loading. Both inspected loaders omit `allowed-tools` and `disable-model-invocation`; the v2 loader additionally recognizes `slash`, but `available()` filters on skill-access deny rules alone. Therefore do not map manual-only to `slash: true` or `ask` without a separate verified contract. [O1–O3](#sources)

### Exact manual-only output

For Claude Code and Pi, in `SKILL.md` frontmatter: [C1, P1–P2](#sources)

```yaml
name: deploy
description: Deploy the application on explicit request.
disable-model-invocation: true
```

For Codex, retain ordinary skill frontmatter and add `<skill>/agents/openai.yaml`: [X1–X2](#sources)

```yaml
policy:
  allow_implicit_invocation: false
```

These prevent automatic skill routing in the documented mechanisms; they are not file-access sandboxes. Pi's implementation hides the advertisement, not the underlying file. Claude also prevents model Skill-tool invocation, while preserving explicit user invocation. No equivalent OpenCode skill-level policy was confirmed. [C1, P2, O1–O3](#sources)

## Local verification

**Fixture:** `/tmp/skillang-harness-research/probe/repo` was initialized as a git repo. `HOME`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `PI_CODING_AGENT_DIR` and XDG config/data/state/cache directories were redirected into `/tmp/skillang-harness-research/probe/home`. Every skill had a unique name, description and harmless body (`Return PROBE only.`). Fixture layout:

```text
repo/.agents/skills/probe-agents/SKILL.md
repo/.agents/skills/probe-manual/SKILL.md  # disable-model-invocation + fake allowed-tools
repo/.agents/skills/probe-yaml/{SKILL.md,agents/openai.yaml}  # implicit policy false
repo/.agents/skills/probe-link -> <scratch>/targets/probe-link
repo/.claude/skills/probe-claude/SKILL.md
repo/.claude/skills/probe-link -> <scratch>/targets/probe-link
home/.agents/skills/probe-home/SKILL.md
```

The symlinks actually used absolute scratch paths; the diagram conveys the target relationship. Raw responses remain in the scratch directory, **not committed**. The summarized observations below are the durable evidence. Startup/listing is not evidence of successful skill execution or permission enforcement.

### T1 — Claude Code 2.1.287

Ran from the fixture repo:

```sh
claude -p /skills --verbose --output-format stream-json \
  --no-session-persistence --setting-sources project \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}'
```

Stopped the process after its `system/init` event, without asking a model to execute the fixture. Both `skills` and `slash_commands` included `probe-claude` and `probe-link`; neither included `probe-agents`, `probe-manual` nor `probe-yaml`. Thus project `.agents/skills/` alone was not discovered, while a `.claude/skills/<name>` symlink to an external skill was. Repeated with `--setting-sources user,project` and a scratch-home `~/.claude/skills/probe-personal/SKILL.md` positive control: `probe-personal` appeared, while `probe-home` under `~/.agents/skills/` did not. This also verifies the home-path difference. Raw events: `probe/claude-response.jsonl`, `probe/claude-personal-response.jsonl`. [C1](#sources)

### T2 — Pi 0.99.2

Ran RPC without a model request:

```sh
pi --mode rpc --no-session --offline --no-extensions --no-tools --approve
# stdin: {"id":"probe","type":"get_commands"}
```

Response `success: true` listed `skill:probe-agents`, `skill:probe-link`, `skill:probe-manual`, `skill:probe-yaml`, `skill:probe-home`, with project/home source paths. `--approve` grants **one-run project trust**, not saved user configuration. Raw response: `probe/pi-response.jsonl`.

Also imported the installed `dist/core/skills.js` directly and called `loadSkills` with the scratch project/home `.agents` directories, then `formatSkillsForPrompt`. Result: `probe-manual.disableModelInvocation === true`, `probe-manual` absent from the advertisement, `probe-yaml` present, and diagnostics empty despite `allowed-tools: nonexistent-probe-tool`. This corroborates both the frontmatter mapping and lack of sidecar-policy/allowed-tools consumption; it does not test explicit command expansion end-to-end. Raw object: `probe/pi-loader.json`. [P1–P3](#sources)

### T3 — Codex 0.159.3

Ran `codex app-server --stdio` in the scratch repo; sent JSON-RPC `initialize`, `initialized`, then:

```json
{"id":2,"method":"skills/list","params":{"cwds":["<scratch>/repo"],"forceReload":true}}
```

Response listed `probe-agents`, `probe-link`, `probe-manual`, `probe-yaml` as enabled repo skills and `probe-home` as an enabled user skill, with no errors. The linked skill's returned path was its canonical target. The `.claude`-only probe was absent. Raw response: `probe/codex-response.jsonl`.

**Do not infer invocation policy from this list:** this installed response did not expose `allow_implicit_invocation`; a manual-only skill can still be enabled/discoverable. Sidecar routing behavior is verified by docs/source, not a model invocation experiment. Likewise, tolerance of a fake `allowed-tools` value is not enforcement evidence. [X1–X2](#sources)

### T4 — OpenCode v2.0.19

Ran a private server through the installed CLI:

```sh
opencode api --standalone GET /api/skill \
  --param 'location[directory]=<scratch>/repo'
```

Response: `{"location":{"directory":"<canonical scratch>/repo"},"data":[]}`. Added a native `.opencode/skills/probe-native/SKILL.md` positive control and repeated: still empty. `/api/location` returned the intended scratch directory. An earlier `/skill` request returned the web application HTML, **not a skill list**, and was discarded.

Because the native positive control also failed, this does **not** prove `.agents` or symlinks are unsupported. The v2 endpoint may need session/plugin initialization not performed by this probe. Installed v2 listing, invocation behavior and discovery compatibility remain unconfirmed. Raw outputs: `probe/opencode-response-correct`, `probe/opencode-native-control`. Published docs and v1 source/tests provide the positive discovery evidence; v2 source independently shows symlink scanning and no manual-only parser field. [O1–O3](#sources)

## Recommendation for Skillang

1. Keep `.agents/skills/` as a shared package location **with an explicit Claude installation adapter**, e.g. `.claude/skills/<name>` symlinks or copies. The tested folder symlink works; do not claim the shared directory is automatically read by Claude. [C1, T1](#sources)
2. Model invocation intent independently from path placement. Emit Claude/Pi frontmatter or Codex sidecar as appropriate; emit an **unsupported-policy diagnostic** for OpenCode until verified, rather than silently losing manual-only intent. [C1, P1–P2, X1–X2, O1–O3](#sources)
3. Make pre-approval a separate, opt-in installation policy. Do not present inferred effects → `allowed-tools` as portable enforcement. It grants approval in Claude and supplies no verified equivalent in the other three. [C1, P2–P3, X2, O1–O3](#sources)
4. Version adapters and require a native positive-control listing test; specifically hold OpenCode v2 support at **unverified** rather than extrapolating from v1 docs/source. [T4](#local-verification)

## Sources

- **C1 — Claude Code official skills docs:** [page](https://code.claude.com/docs/en/skills), [Markdown](https://code.claude.com/docs/en/skills.md). Fetched successfully with `https://code.claude.com/docs/en/skills.md?x=1` after the unqualified URLs returned 403. Sections: “Choose where skills load” (symlinks and ancestor discovery), “Frontmatter reference”, “Control who invokes a skill”, “Pre-approve tools for a skill”, “Override skill visibility from settings”.
- **P1 — Pi installed documentation, version 0.99.2:** read `docs/skills.md`, `settings.md`, `packages.md`, `configuration.md`, `security.md` under the installed `@earendil-works/pi-coding-agent` package. Public matching revision from npm's [`0.99.2` metadata](https://registry.npmjs.org/@earendil-works/pi-coding-agent/0.99.2), `gitHead: 005af57d88ee23b33778f343a9595b32e67ff788`: [skills](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/docs/skills.md), [packages](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/docs/packages.md).
- **P2 — Pi installed implementation:** `dist/core/skills.js`, functions `loadSkillsFromDirInternal`, `loadSkillFromFile`, `formatSkillsForPrompt`, `loadSkills`; `dist/core/package-manager.js`, `collectSkillEntries`, `collectAncestorAgentsSkillDirs`, `collectLocalResources`. Matching [skills source](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/src/core/skills.ts), [package manager](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/src/core/package-manager.ts).
- **P3 — Pi trust/tools:** installed settings/security docs; matching [security](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/docs/security.md), [settings](https://github.com/earendil-works/pi/blob/005af57d88ee23b33778f343a9595b32e67ff788/packages/coding-agent/docs/settings.md). Read locally, not inferred from a specification badge.
- **X1 — OpenAI official skills docs:** [original](https://developers.openai.com/codex/skills/) redirected during fetch to [Build skills](https://learn.chatgpt.com/docs/build-skills). Sections: “Where Codex loads local skills”, “Optional metadata”; explicitly documents folder symlinks, home/project/admin/system scopes and `allow_implicit_invocation`.
- **X2 — Codex first-party source**, revision `ae7aad586ea0769f329e214e9827c541823fd191`: [frontmatter parser](https://github.com/openai/codex/blob/ae7aad586ea0769f329e214e9827c541823fd191/codex-rs/skills/src/parser.rs), [sidecar metadata](https://github.com/openai/codex/blob/ae7aad586ea0769f329e214e9827c541823fd191/codex-rs/ext/skills/src/loader/metadata.rs), [policy model](https://github.com/openai/codex/blob/ae7aad586ea0769f329e214e9827c541823fd191/codex-rs/skills/src/model.rs), [host loader/symlink scope](https://github.com/openai/codex/blob/ae7aad586ea0769f329e214e9827c541823fd191/codex-rs/ext/skills/src/loader/host.rs), [root resolution](https://github.com/openai/codex/blob/ae7aad586ea0769f329e214e9827c541823fd191/codex-rs/ext/skills/src/host_roots.rs). Current upstream source is not asserted to be the installed binary's exact revision.
- **O1 — OpenCode official published skill documentation:** [page](https://opencode.ai/docs/skills/) returned 403; read [first-party documentation source](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/web/src/content/docs/skills.mdx). Explicit recognized-field list and allow/ask/deny meanings.
- **O2 — OpenCode v1 compatibility implementation**, same revision: [skill loader](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/opencode/src/skill/index.ts), [first-party discovery tests](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/opencode/test/skill/skill.test.ts). `discoverSkills` searches both external directory families, unless disabled; `scan` sets `symlink: true`; `add` preserves only name/description/location/content.
- **O3 — OpenCode v2 implementation**, same revision: [skill loader/filter](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/core/src/skill.ts), [skill tool](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/core/src/tool/skill.ts), [config skill sources](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/core/src/config/plugin/skill.ts), [API endpoint](https://github.com/anomalyco/opencode/blob/aa481b8f5652f5576c55f914a64ed270e7daa7e0/packages/protocol/src/groups/skill.ts). V2 source was inspected separately to avoid confusing compatibility behavior with the installed CLI.

## Not confirmed

- OpenCode v2.0.19 automatic discovery, including home/project `.agents` and symlinks, because the isolated API probe failed its native positive control. No verified manual-only equivalent was found. [T4](#local-verification)
- Actual approval prompts, denied commands or multi-turn permission expiry by execution; those Claude conclusions are documentation-based. No generated action was executed. [C1](#sources)
- Codex sidecar routing by a live model decision; listing is insufficient to prove invocation eligibility. [X1–X2, T3](#sources)
- Arbitrary symlink cycles, dangling targets, OS portability, symlinked discovery-root directories or plugin symlink rules. Tests covered an ordinary skill-folder link; Pi file-link handling and other symlink claims beyond that are source/documentation findings. [C1, P2, X2, O2–O3](#sources)
