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
The harness and project that one compilation produces skills for.

**Fact**:
A typed value about the target, such as the harness, the package manager, or whether the session runs in Herdr.

**Capability**:
A power a skill needs and a target provides, such as running shell commands or writing to GitHub.
_Avoid_: Permission, tool

**Flattening**:
Removing every branch of a skill that the known facts rule out, so the agent reads only what applies to its target.
_Avoid_: Rendering, specializing

**Corpus**:
The user's own skill collection, which v0 must compile.
