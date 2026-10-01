// THROWAWAY: outline layout experiment, not a Skillang compiler.
import {
  char, choice, commit, literal, many, parser, recursive, regex,
  type Parser,
} from "parserator";

// Decisions are deliberately collected here rather than buried in the grammar.
export const RULES = {
  indent: 2,
  continuations: "nearest preceding item at same or lower depth, in active scope",
  fenceExtraIndent: 2,
  rawTabs: true,
} as const;

type Part = { kind: "text" | "interpolation"; value: string; column: number };
export type Node = {
  kind: "item" | "continuation" | "when" | "else" | "splice" | "literal";
  line: number;
  indent: number;
  value?: string;
  parts?: Part[];
  children: Node[];
  otherwise?: Node;
  language?: string;
};
export type Definition = { name: string; signature: string; docs: string[]; line: number; children: Node[] };
export class Diagnostic extends Error {
  constructor(public line: number, public column: number, message: string) { super(message); }
}

// Balance *lexically*, without pretending to type-check or parse ML expressions.
// Quotes and escaped quotes hide braces. No newline can enter this parser.
const quoted = choice(
  regex(/"(?:\\[^\r\n]|[^"\\\r\n])*"/),
  regex(/'(?:\\[^\r\n]|[^'\\\r\n])*'/),
);
const balanced: Parser<string> = recursive(self => choice(
  quoted,
  parser(function* () {
    yield* char("{");
    const inside = yield* many(self);
    yield* char("}");
    return `{${inside.join("")}}`;
  }),
  regex(/[^{}"'\r\n]+/),
));
const interpolation = parser(function* () {
  yield* literal("${");
  yield* commit();
  const content = (yield* many(balanced)).join("");
  yield* char("}").expected("closing '}' on this line");
  return content;
});
// The ordinary text arm must not eat the leading '$' of the escape.
const prosePart = choice(
  literal("$${").map(() => ({ kind: "text" as const, value: "${" })).withSpan((value, span) => ({ value, span })),
  interpolation.map(value => ({ kind: "interpolation" as const, value })).withSpan((value, span) => ({ value, span })),
  regex(/(?:[^$\r\n]|\$(?!\{|\$\{))+/)
    .map(value => ({ kind: "text" as const, value })).withSpan((value, span) => ({ value, span })),
);
const identifier = regex(/[A-Za-z_][A-Za-z0-9_.]*/);
type LineToken = { kind: Node["kind"]; value?: string; offset?: number };
const lineGrammar: Parser<LineToken> = choice(
  literal("- ").zipRight(regex(/[^\r\n]*/)).map(value => ({ kind: "item" as const, value, offset: 2 })),
  regex(/\| ?/).zipRight(regex(/[^\r\n]*/)).map(value => ({ kind: "continuation" as const, value, offset: 0 })),
  regex(/when +/).zipRight(regex(/[^\r\n]+/)).map(value => ({ kind: "when" as const, value })),
  literal("else").map(() => ({ kind: "else" as const })),
  literal("..").zipRight(identifier).map(value => ({ kind: "splice" as const, value })),
  literal("literal").map(() => ({ kind: "literal" as const })),
);
const signatureGrammar = parser(function* () {
  const name = yield* identifier;
  yield* regex(/ *: */);
  const signature = yield* choice(literal("Outline"), regex(/Skill +\S+ +\S+/));
  return { name, signature };
});
const bindingGrammar = identifier.zipLeft(regex(/ *= */));
const fenceGrammar = regex(/`{3,}(?:[A-Za-z0-9_+.-]+)?/);

export function parseOutline(source: string): Definition[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let cursor = 0;
  const definitions: Definition[] = [];
  const signatures = new Map<string, string>();
  let docs: string[] = [];
  function error(line: number, column: number, message: string): never {
    throw new Diagnostic(line + 1, column, message);
  }
  function info(index: number) {
    const raw = lines[index]!;
    const indent = raw.match(/^ */)![0].length;
    if (raw.includes("\t")) error(index, raw.indexOf("\t"), "Use spaces, not tabs, outside a literal block.");
    if (raw.trim() !== "" && indent % RULES.indent) error(index, indent, `Indentation must be a multiple of ${RULES.indent} spaces.`);
    return { raw, indent, text: raw.slice(indent) };
  }
  function ignored(index: number) {
    const { text } = info(index);
    return text.trim() === "" || (text.startsWith("--") && !text.startsWith("--|"));
  }
  function nextMeaningful() {
    while (cursor < lines.length && ignored(cursor)) cursor++;
  }
  function parts(value: string, line: number, base: number): Part[] {
    const result: Part[] = [];
    let offset = 0;
    while (offset < value.length) {
      // Prefix parsing retains the opening of the failing part, even if a
      // quoted string inside the expression itself contains another '${'.
      const parsed = prosePart.parsePrefix(value.slice(offset));
      if (!parsed.success) error(line, base + offset, "This interpolation needs balanced braces and closed strings, ending with '}' on this line; later lines are not consumed.");
      const p = parsed.value.value;
      result.push({ ...p.value, column: base + offset + p.span.start });
      offset += parsed.value.offset;
    }
    return result;
  }
  function literalBlock(node: Node, owner: Node | undefined) {
    if (!owner || node.indent !== owner.indent + RULES.indent) {
      error(node.line - 1, node.indent, "Put 'literal' one indentation unit under its item.");
    }
    nextMeaningful();
    const openIndex = cursor;
    if (cursor >= lines.length) error(node.line - 1, node.indent, "A literal block needs an opening fence.");
    const opening = info(cursor);
    const expectedIndent = node.indent + RULES.fenceExtraIndent;
    if (opening.indent !== expectedIndent || !fenceGrammar.parse(opening.text).success) {
      error(cursor, opening.indent, `Expected a backtick fence indented ${expectedIndent} spaces under 'literal'.`);
    }
    const ticks = opening.text.match(/^`+/)![0];
    node.language = opening.text.slice(ticks.length);
    cursor++;
    const raw: string[] = [];
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor]!;
      if (line === " ".repeat(expectedIndent) + ticks) {
        cursor++;
        node.value = raw.join("\n") + (raw.length ? "\n" : "");
        return;
      }
      if (line.trim() !== "" && !line.startsWith(" ".repeat(expectedIndent))) {
        error(cursor, 0, `Literal content needs the fence's ${expectedIndent}-space prefix (or a matching closing fence).`);
      }
      if (!RULES.rawTabs && line.includes("\t")) error(cursor, line.indexOf("\t"), "Tabs are disabled even inside literal blocks.");
      // Only remove the fence's structural prefix; preserve relative spacing and tabs.
      raw.push(line.startsWith(" ".repeat(expectedIndent)) ? line.slice(expectedIndent) : line);
    }
    error(openIndex, expectedIndent, `This literal fence needs a matching ${ticks} closing fence at the same indentation.`);
  }
  function block(depth: number, ancestors: Node[]): Node[] {
    const nodes: Node[] = [];
    let latest: Node | undefined;
    while (cursor < lines.length) {
      nextMeaningful();
      if (cursor >= lines.length) break;
      const { indent, text } = info(cursor);
      if (indent < depth) break;
      if (indent > depth) error(cursor, indent, `Unexpected indentation; this outline level uses ${depth} spaces. Only items and 'when' introduce children.`);
      const parsed = lineGrammar.parse(text);
      if (!parsed.success) error(cursor, indent, "Start an outline line with '- ', '|', 'when <expr>', 'else', '..name', or 'literal'.");
      const token = parsed.value;
      if (token.kind === "else") break;
      const node: Node = { kind: token.kind, line: cursor + 1, indent, children: [], value: token.value };
      cursor++;
      const owners = latest ? [...ancestors, latest] : ancestors;
      if (node.kind === "continuation") {
        const owner = owners.at(-1);
        if (!owner) error(node.line - 1, indent, "This continuation has no preceding item at the same or lower depth to attach to.");
        const prefix = text.startsWith("| ") ? 2 : 1;
        node.parts = parts(node.value!, node.line - 1, indent + prefix);
        owner.children.push(node);
        continue;
      }
      if (node.kind === "literal") literalBlock(node, ancestors.at(-1));
      if (node.kind === "item") {
        node.parts = parts(node.value!, node.line - 1, indent + 2);
        latest = node;
        node.children.push(...block(depth + RULES.indent, [...ancestors, node]));
      }
      if (node.kind === "when") {
        node.children = block(depth + RULES.indent, owners);
        if (!node.children.length) error(node.line - 1, indent, "A 'when' needs at least one child item, conditional, or splice (a continuation alone is not a branch).");
        nextMeaningful();
        if (cursor < lines.length) {
          const next = info(cursor);
          if (next.text === "else" && next.indent === depth) {
            const otherwise: Node = { kind: "else", line: ++cursor, indent: depth, children: [] };
            otherwise.children = block(depth + RULES.indent, owners);
            if (!otherwise.children.length) error(otherwise.line - 1, depth, "An 'else' needs child items, conditionals, or splices.");
            node.otherwise = otherwise;
          }
        }
      }
      nodes.push(node);
    }
    // A deeper else cannot belong to this block's caller's when.
    if (cursor < lines.length) {
      const next = info(cursor);
      if (next.text === "else" && next.indent >= depth) error(cursor, next.indent, "Align 'else' with its owning 'when'; it cannot be a child of that branch or follow an item.");
    }
    return nodes;
  }
  while (cursor < lines.length) {
    nextMeaningful();
    if (cursor >= lines.length) break;
    const { indent, text } = info(cursor);
    if (indent) error(cursor, indent, "Top-level declarations start in column 1; align 'else' with its 'when' inside the outline.");
    if (text.startsWith("--|")) { docs.push(text.slice(3).trimStart()); cursor++; continue; }
    if (/^fact\b/.test(text)) { cursor++; continue; }
    const signature = signatureGrammar.parse(text);
    if (signature.success) { signatures.set(signature.value.name, signature.value.signature); cursor++; continue; }
    const binding = bindingGrammar.parse(text);
    if (!binding.success) error(cursor, 0, "Expected a doc comment, fact line, 'name : Skill A B'/'name : Outline', or 'name ='.");
    const name = binding.value;
    if (!signatures.has(name)) error(cursor, 0, `Add a signature for '${name}' before its outline binding.`);
    const line = ++cursor;
    const children = block(RULES.indent, []);
    if (!children.length) error(line - 1, 0, "An outline binding needs a body indented two spaces.");
    definitions.push({ name, signature: signatures.get(name)!, docs, line, children });
    docs = [];
  }
  return definitions;
}

export function formatDiagnostic(source: string, path: string, error: Diagnostic): string {
  const line = source.replace(/\r\n/g, "\n").split("\n")[error.line - 1] ?? "";
  return `${path}:${error.line}:${error.column + 1}: ${error.message}\n${line.replaceAll("\t", " ")}\n${" ".repeat(error.column)}^`;
}

export function dump(definitions: Definition[]): string {
  const out: string[] = [];
  function render(node: Node, depth: number) {
    const pad = "  ".repeat(depth);
    const location = ` [L${node.line}, depth ${node.indent / RULES.indent}]`;
    out.push(`${pad}${node.kind}${node.kind === "when" || node.kind === "splice" ? ` ${node.value}` : ""}${location}`);
    if (node.parts) for (const p of node.parts) out.push(`${pad}  ${p.kind}: ${JSON.stringify(p.value)}${p.kind === "interpolation" ? ` [column ${p.column + 1}]` : ""}`);
    if (node.kind === "continuation") out.push(`${pad}  newline: preserved before this continuation`);
    if (node.kind === "literal") {
      out.push(`${pad}  fence language: ${JSON.stringify(node.language)}`);
      for (const line of node.value!.split("\n").slice(0, -1)) out.push(`${pad}  raw |${line}`);
      out.push(`${pad}  trailing newline: ${node.value ? "preserved" : "empty block"}`);
    }
    for (const child of [...node.children].sort((a, b) => a.line - b.line)) render(child, depth + 1);
    if (node.otherwise) render(node.otherwise, depth);
  }
  for (const definition of definitions) {
    out.push(`${definition.name} : ${definition.signature} [L${definition.line}]`);
    for (const doc of definition.docs) out.push(`  doc: ${doc}`);
    for (const node of definition.children) render(node, 1);
  }
  return out.join("\n");
}
