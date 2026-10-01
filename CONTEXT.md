# Skillang

A small, statically typed language for writing agent skills, and a compiler that turns one skill source into skills flattened for a given project and harness.

## Language

**Skill**:
A unit of guidance an agent loads on demand: instructions in prose, plus the actions it may run.
_Avoid_: Prompt, rule

**Harness**:
An agent program that loads skills, such as Claude Code, Codex or Pi.
_Avoid_: Agent, host, client

**Target**:
What one build produces skills for: the whole machine (global build) or one repo (project build).

**Fact**:
A typed value about the target, such as the harness, the package manager, or whether the session runs in Herdr.

**Binding time**:
When a fact's value becomes known: `global` (in every build), `project` (in a build inside a repo) or `session` (only while the agent runs).
_Avoid_: Static, dynamic

**Phrase**:
The prose a fact declares for each of its values, used when a branch on it stays in the output.

**Instruction**:
The prose part of a skill, which the agent reads.

**Outline**:
A tree of prose items, each a line starting with `- `; the value that a skill's instructions evaluate to.
_Avoid_: Template, body, text block

**Action**:
The code part of a skill: a typed function that the interpreter runs when the agent calls it.
_Avoid_: Script, command

**Built-in**:
A typed operation the interpreter provides to actions, such as creating a GitHub issue or reading a file.

**Effect**:
A power that an action uses and a target handles, such as running shell commands or writing to GitHub.
_Avoid_: Capability, permission, tool

**Signature**:
The typed inputs and output of a skill; the agent running the skill fills in the output and returns it to the interpreter, which checks it.

**Extern**:
A typed declaration of an external command, such as a `gh` subcommand, including how its output is decoded.
_Avoid_: Wrapper, binding

**Flattening**:
Removing every branch of a skill that the known facts rule out, so the agent reads only what applies to its target.

**Global build**:
A build of the source library into the user's home skill folder; project and session facts stay as prose.

**Project build**:
A build inside one repo into its skill folder; project facts are flattened, and the output is committed.
_Avoid_: Rendering, specializing

**Corpus**:
The user's own skill collection, which v0 must compile.
