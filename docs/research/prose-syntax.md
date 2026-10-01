# Prose-first syntax prior art

## TL;DR
- Text-first languages either make prose the default (Ink, Scribble, Pug) or put text in explicit delimited strings; the former best fits Markdown-heavy skills.
- Ink and Yarn use line-oriented dialogue with explicit control-flow commands; Harlowe and Ren'Py embed branching among passages or script statements.
- Scribble/Pollen and Elm-markup make markup structure explicit; Typst and Djot instead give text a native markup grammar.
- `{{…}}`, `${…}`, `#{…}`, and `\(…)` are not interchangeable: they belong to different parsers and have different literal-escape rules.
- Indentation stripping is language-specific; never infer a universal “remove common indent” rule.
- Candidate: Markdown-default with typed `when`/`else` blocks; retain explicit action blocks and make interpolation typed and escaped.

## Scope and caveat
This is a syntax survey, not a claim that all of these systems share a model. Their control flow may be runtime narrative, template evaluation, or compile-time selection. The examples below are schematic when marked so; consult the linked language specification for version-specific details.

## Interactive fiction and dialogue

### Ink (inkle)

```ink
=== opening ===
The door is locked.
{ has_key:
    You unlock it.
- else:
    -> locked
}
-> END
```

Ink is a narrative scripting language: ordinary lines are story text, knots/stitches label sections, and `->` diverts flow. Braced `{condition: ... - else: ...}` choices conditionally include text; interpolation uses square-bracket variable references such as `Hello, {name}!` (Ink's expression syntax also uses braces, so consult its syntax reference for contexts). `//` begins a comment; literal markup/control characters have dedicated escaping rules. This is runtime story flow, not Markdown templating. [Ink documentation: syntax](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md), [Ink reference](https://github.com/inkle/ink/blob/master/Documentation/InkLanguageGuide.md).

### Yarn Spinner

```yarn
title: Greeting
---
Hello, {$name}!
<<if $hasKey>>You open the door.<<else>>It is locked.<<endif>>
===
```

Yarn nodes have metadata, `---` body delimiter, and `===` terminator. Dialogue is plain lines; commands use `<<…>>`, variables use `$name`, and `<<if>>`/`<<else>>`/`<<endif>>` can branch within a node. Escaping command delimiters and markup is defined by the Yarn version/runtime; do not assume HTML escaping. [Yarn Spinner language documentation](https://docs.yarnspinner.dev/), [Yarn Spinner syntax](https://docs.yarnspinner.dev/using-yarnspinner/syntax-basics).

### Twine / Harlowe

```twee
:: Start
The door is locked. [[Try the key->Key]]
(if: $hasKey)[You open it.](else:)[You wait.]
```

Twine is a story format/container; passage links use `[[…]]`. Harlowe is one format, with macros such as `(if: condition)[text]` and `(else:)[text]`; expressions interpolate via macros, not a general `${}` string form. Passage text is content, macros introduce code-like behavior. Nested hooks use bracket structure and must be balanced; literal macro syntax needs Harlowe's escaping/markup conventions. Other Twine story formats differ. [Twine cookbook: Harlowe](https://twinery.org/cookbook/), [Harlowe manual](https://twine2.neocities.org/).

### Ren'Py

```renpy
label start:
    "The door is locked."
    if has_key:
        "You open it, [name]."
    else:
        "You wait."
```

Ren'Py is Python-like script: indented statements and labels control execution; quoted dialogue is a string, and `[name]` substitutes a value in dialogue. Literal interpolation brackets are escaped according to Ren'Py text-tag/string rules (not Python f-string rules). Control flow nests as statements, rather than being embedded in a text line. [Ren'Py documentation: language basics](https://www.renpy.org/doc/html/language_basics.html), [text](https://www.renpy.org/doc/html/text.html).

## Document languages with code

### Racket Scribble / at-expressions

```racket
#lang scribble/manual
@title{Door guide}
@para{The door is @italic{locked}.}
@(if has-key? "Open it." "Wait.")
```

Scribble uses Racket's `@` reader to combine text and expressions; `@name{…}` invokes a form, and `@(…)` escapes into ordinary Racket. Braces delimit content and nested forms. Literal `@` is escaped by doubling it (`@@`). Conditionals are Racket expressions/forms, commonly producing document elements. [Racket Scribble manual](https://docs.racket-lang.org/scribble/), [at-expression syntax](https://docs.racket-lang.org/scribble/reader.html).

### Pollen

```racket
#lang pollen
◊if[has-key?]{You open it.}{You wait.}
```

Pollen's default markup language uses a reader-character (commonly `◊`) to begin commands; text is the default, and tags/forms use bracket/brace delimiters. `◊(…)` enters Racket; Pollen supports Racket conditionals and custom markup. Escape the reader character by doubling it (`◊◊`). Exact behavior depends on Pollen mode and reader settings. [Pollen documentation](https://docs.racket-lang.org/pollen/), [Pollen markup](https://docs.racket-lang.org/pollen/markup.html).

### Typst

```typst
The door is #if has-key [open.] else [locked.]
#let name = "Ada"
Hello, #name!
```

Typst markup is the default; `#` switches to code. `#if` branches into content blocks, and code values can be interpolated into markup by `#expr`. Escaping `#` uses `\#`; bracket-delimited content can contain nested markup. [Typst syntax](https://typst.app/docs/reference/syntax/), [scripting](https://typst.app/docs/reference/scripting/).

### Djot

```djot
The door is *locked*.

::: if has-key
You open it.
:::
```

Djot is a lightweight markup syntax: prose is the document, with punctuation delimiters for inline markup and fenced/container blocks for structure. It is not inherently a general-purpose interpolation or execution language; conditional containers require an extension/host processor rather than core Djot semantics. Escape markup punctuation with backslash. [Djot syntax](https://djot.net/), [Djot spec](https://github.com/jgm/djot/blob/master/doc/syntax.md).

### Elm-markup

```elm
[markdown|
The door is *locked*.
|]
```

Elm-markup is an Elm library/DSL for typed markup, not a general prose scripting language. Its quasiquoted Markdown block is parsed into a typed representation; Elm expressions and constructors provide dynamic content. Conditionals are ordinary Elm expressions/values, rather than an ad hoc text-level branch syntax. Delimiter and interpolation details belong to the library's quasiquote grammar. [Elm-markup repository and documentation](https://github.com/mdgriffith/elm-markup).

### Unison docs

```unison
doc doorGuide = {{
  The door is locked.

  @source{openDoor}
}}
```

Unison docs are values built with documentation syntax and can include code references/links; they are not a general executable template language. Ordinary prose is inside documentation blocks, with structured doc combinators available. Dynamic branching is expressed in Unison code that constructs docs, not arbitrary control flow inside prose. The exact current documentation syntax is evolving; verify against the version in use. [Unison language docs](https://www.unison-lang.org/docs/), [Unison codebase](https://github.com/unisonweb/unison).

## Line-prefix template languages

### Pug

```pug
if hasKey
  p You open it, #{name}.
else
  p The door is locked.
```

Pug uses indentation and tag names as structure; plain text follows a tag, and `|` marks a literal text line in contexts where it would otherwise be parsed as markup. Interpolation supports `#{…}` (escaped) and `!{…}` (unescaped); control flow uses JavaScript-like `if`/`else` blocks. [Pug language reference](https://pugjs.org/language/).

### Slim

```slim
- if has_key
  p You open it, #{name}.
- else
  p The door is locked.
```

Slim is indentation-based HTML templating; `-` introduces code, `=` evaluates/outputs an expression, and ordinary lines describe markup. `|` explicitly introduces text. Ruby interpolation uses `#{…}`; escaping follows Ruby/Slim rules. Nested control flow is indentation-nested code. [Slim documentation](https://github.com/slim-template/slim).

### Haml

```haml
- if has_key
  %p You open it, #{name}.
- else
  %p The door is locked.
```

Haml uses `%tag`, `-` for non-output Ruby, and `=` for evaluated output; `|` marks a line as literal text rather than a tag/code line. Ruby interpolation is `#{…}`. Indentation nests markup and conditionals. [Haml reference](https://haml.info/docs/yardoc/file.REFERENCE.html).

## String syntaxes

These are principally string literals, not languages where prose is the default. Their benefit is preserving multiline content; control flow usually remains outside the string.

| Syntax | Example and text/code boundary | Interpolation, escaping, indentation | Nested conditionals |
|---|---|---|---|
| Nix indented string | `''Hello ${name}''`; content is between `''` delimiters. | `${…}` interpolates; `''${` yields literal `${`, and `'''` represents `''`. Leading whitespace is removed according to Nix's indentation rule (common indentation among nonblank lines). | No statement syntax inside; interpolation can evaluate expressions, or construct strings conditionally. [Nix strings](https://nix.dev/manual/nix/2.24/language/values.html#strings). |
| Dhall text | `''Hello ${name}!''`; multiline text uses double-single-quote delimiters. | `${…}` embeds a Dhall expression; escaping/normalization follows Dhall text literal grammar. Indentation/common-prefix handling is specified by the language. | Conditional expressions can be interpolated, but no imperative nested blocks. [Dhall language](https://docs.dhall-lang.org/reference/Language-Reference.html#text). |
| Jsonnet block | `|||\n  Hello\n  ${name}\n|||`; block starts with `|||`. | `${…}` interpolation; `||` escapes an interpolation opener as `|||` per Jsonnet string rules. Block indentation is stripped relative to the closing delimiter. | Expressions may interpolate computed conditionals; no control statements embedded as prose. [Jsonnet spec](https://jsonnet.org/ref/spec.html), [language reference](https://jsonnet.org/ref/language.html). |
| Swift multiline | `"""\n  Hello, \(name)!\n  """` | `\(expr)` interpolation; escape backslash, quote delimiter, and interpolation opener as specified. Indentation before closing delimiter establishes the amount stripped from each line; blank lines are treated specially. | Use expressions within interpolation, but ordinary Swift control flow is outside the literal. [Swift strings](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/). |
| Kotlin multiline | `"""Hello $name"""` | `$name` / `${expr}` interpolation; raw strings do not process backslash escapes. `trimIndent()` is an explicit library operation, not an automatic delimiter rule. | Expressions interpolate; control statements are not string body syntax. [Kotlin strings](https://kotlinlang.org/docs/strings.html). |
| Java text block | `"""\n  Hello\n  """` | No interpolation in Java text blocks; escapes are processed (with text-block-specific incidental indentation stripping based on line indentation). Use formatting/concatenation for values. | None inside literal. [Java language spec, text blocks](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.6). |
| Python triple quote | `f'''Hello {name}'''` | Plain triple quotes do not interpolate; `f` enables `{expr}`; `{{` and `}}` represent literal braces in f-strings. Backslash processing depends on raw prefix. No automatic common-indent stripping (`textwrap.dedent` is explicit). | Expressions are allowed in f-string fields, but statement blocks are not. [Python lexical analysis](https://docs.python.org/3/reference/lexical_analysis.html#string-and-bytes-literals). |
| Zig multiline | `\\Hello` on a line by itself; subsequent lines begin `\\`. | Each `\\` introduces a line; indentation is stripped according to the first non-whitespace character across the string's lines (the common leading whitespace). It is a compile-time string literal; no interpolation syntax. | None inside; build with concatenation/formatting outside. [Zig language reference](https://ziglang.org/documentation/master/#String-Literals). |
| OCaml quoted string | `{|Hello|}`; custom delimiter `{id|…|id}`. | No interpolation by default. Choosing an identifier permits delimiter text inside the body; backslashes are literal in quoted strings. | None inside. [OCaml manual, lexical conventions](https://ocaml.org/manual/lex.html). |

## Interpolation forms and delimiter collisions

| Form | Typical use | Literal delimiter strategy |
|---|---|---|
| `{{…}}` | Mustache tags; Jinja expressions/statements (`{{ value }}`, `{% if … %}`). Mustache sections are `{{#…}}…{{/…}}`; Jinja control uses block tags. | Mustache supports configurable delimiters; Jinja supports `{% raw %}…{% endraw %}` and delimiter configuration. This makes collision handling explicit but can conflict with literal Markdown/templates. [Mustache spec](https://github.com/mustache/spec), [Jinja templates](https://jinja.palletsprojects.com/en/stable/templates/). |
| `${…}` | Nix, Dhall, Jsonnet and many shell/config languages. | Escape policy varies by host: Nix `''${`; Jsonnet's block-string rule differs; never assume the same escape. |
| `#{…}` | Ruby interpolation, used by Slim/Haml/Pug-like template conventions. | In Ruby double-quoted strings, backslash escaping suppresses interpolation; Pug distinguishes escaped `#{}` from raw `!{}` output. |
| `\(…)` | Swift interpolation. | Escape the backslash to render the opener literally; Swift string escaping applies. |
| `$name` / `${expr}` | Kotlin raw/ordinary strings and many template languages. | Kotlin raw strings cannot backslash-escape `$`; `${'$'}` emits dollar sign. [Kotlin strings](https://kotlinlang.org/docs/strings.html). |

Jinja's `{% if %}` is a template control block that spans surrounding text; it is not equivalent to expression interpolation. Mustache's section tags provide iteration/conditional behavior but have a deliberately constrained model. [Jinja](https://jinja.palletsprojects.com/en/stable/templates/), [Mustache spec](https://github.com/mustache/spec).

## Indentation: incompatible precedents

- **Nix:** indented strings strip the minimum indentation of non-empty lines; details include tabs and empty lines, so implement the documented algorithm rather than a visual approximation. [Nix manual](https://nix.dev/manual/nix/2.24/language/values.html#strings).
- **Swift:** the closing delimiter's indentation is the baseline; indentation on content lines is removed to that baseline. Content less-indented than the delimiter is an error; blank lines do not dictate the baseline. [Swift book](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/).
- **Zig:** multiline strings are line-oriented (`\\`); leading whitespace is determined/removed using the least-indented non-whitespace content. [Zig reference](https://ziglang.org/documentation/master/#String-Literals).
- **Java:** text blocks strip incidental indentation inferred from content and closing delimiter, followed by escape processing. [JLS §3.10.6](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.6).

These rules cannot be safely combined: closing-delimiter baseline (Swift), common minimum (Nix), line-prefix syntax (Zig), and Java's specified incidental indentation are different user expectations.

## Comparison and implications for Skillang

| Family | Default is prose? | Mark text | Interpolation | Nested conditions | Fit for Markdown outline |
|---|---:|---|---|---|---:|
| Ink / Yarn | Mostly | ordinary dialogue line | `{…}` / `$…` | explicit narrative commands | Medium; own story grammar |
| Twine / Harlowe | Yes, per passage | ordinary passage content | macros | hooks/macros | Medium; web-story concepts |
| Ren'Py | No (script) | quoted dialogue | `[name]` | indented statements | Low |
| Scribble / Pollen | Yes | plain text / at or reader forms | embedded Racket | Racket forms | High, but host-language weight |
| Typst / Djot | Yes | markup text | `#expr` / none core | Typst yes; Djot extension | High |
| Pug / Slim / Haml | Markup-oriented | `|` where needed | `#{…}` | indentation | Medium; Markdown hyphens collide with syntax expectations |
| Multiline strings | No | string delimiters | varies | generally expression-only | Low as primary authoring surface |
| Mustache / Jinja | Yes | ordinary template text | `{{…}}` | block tags | High, but untyped escape/HTML defaults are concerns |

### Candidate designs

1. **Markdown-default fenced directives (recommended to prototype).** Keep every ordinary line—including `- item`—as Markdown. Reserve explicit standalone directives such as `{{#when fact}}` / `{{/when}}` and typed interpolations like `{{fact.name}}`; define literal braces with a single, documented escape or raw fence. Conditions can surround arbitrary Markdown without turning each line into code. The parser must distinguish Skillang directives from literal Markdown/template examples.
2. **Indentation-sensitive prose blocks.** A small keyword syntax (`when fact:` / `else:`) introduces indented Markdown, while typed actions use explicit code blocks. Natural and readable, but Markdown nested lists and indentation stripping interact; specify tabs, blank lines, and continuation precisely.
3. **Explicit prose quotation blocks.** Use `text`/`prose` blocks with an unambiguous delimiter, allowing Markdown inside, and put `if`/typed actions outside. Easy to parse and safe for interpolation, but verbose and makes ordinary outlines less direct.

For v0, prefer a single default (Markdown), a small explicit branch form that compiles away against known facts, typed interpolation with one escape rule, and separate typed action syntax. Do not inherit runtime dialogue semantics from Ink/Yarn, HTML autoescaping assumptions from web templates, or indentation-stripping folklore from string literals.

## What I could not confirm

This pass could not execute vendor documentation pages or validate every version-specific escape detail. Pollen reader-character behavior, Elm-markup quasiquote interpolation, Unison's evolving docs syntax, and exact Harlowe literal escaping should be checked against pinned versions before adopting any of those syntaxes. The survey cites primary references, but URLs and syntax may change; in particular, Zig's `master` reference is moving. No claim is made that core Djot has executable conditionals.
