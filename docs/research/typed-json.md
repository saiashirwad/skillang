# Typed JSON and typed `gh` actions

Research date: **2026-10-01**. Scope: a small, statically typed, ML-like Skillang action language, not a replacement for GitHub's API. Repository context is [CONTEXT.md](../../CONTEXT.md) and [issue #1](https://github.com/saiashirwad/skillang/issues/1). Examples below are illustrative adaptations of the cited APIs, not an executed cross-language test suite. Proposed Skillang syntax is explicitly marked.

## TL;DR

- Separate **untrusted JSON**, **boundary decoding**, and **ordinary typed records**. Elm, Gleam and OCaml demonstrate this without making JSON the whole language.[E1][G1][O1]
- Distinguish *structurally typed*, *accepts unknown input keys*, and *preserves unknown keys*: these are three different properties.[N1][Z1][PS]
- CUE is strongest as a constraint/unification schema model; Nickel combines contracts with optional static typing; Dhall makes configuration an ordinary typed expression.[C1][N1][N2][D1]
- KCL and Pkl offer named schema/class models; Jsonnet offers convenient object composition but not a static schema guarantee.[K1][P1][J1]
- Use field access, immutable record updates and list combinators first. jq is terse but dynamically checked; JSONPath is selection, not typed decoding or standardized updating.[Q1][JP]
- `gh --json` discovers **field names**, not types. For 2.101.0, issue JSON is a versioned, hand-transformed view of Go/API data, not GitHub GraphQL's wire schema.[H1][H4][H5]
- GitHub publishes an introspectable/downloadable GraphQL schema. Generate wrappers from **schema + operation selections**, but do not assume they describe `gh issue list --json` output.[H5][GHG]
- Recommended v0: type-derived decoders, explicit projection/strictness, closed typed results, a small pinned `gh` wrapper catalog, and path-rich `Result` errors. Row polymorphism can wait.

## 1. Vocabulary and comparison criteria

**Structural** means record compatibility follows field shapes; **nominal** means a declared identity participates in compatibility. **Closed/open record types** describe whether a type fixes all fields or abstracts over extra fields. **Decoder openness** instead describes whether unknown JSON keys are rejected, ignored, or retained. A closed result type can be produced by a decoder that ignores extra input keys: Elm's field decoders, Zod's default object schema, and OCaml's non-strict deriver illustrate this distinction.[E1][Z1][O1]

The error notes report documented structure or published diagnostic examples, **not** a comparative usability benchmark. “Not confirmed” means this research did not establish the property from the examined primary sources.

## 2. Configuration/data languages

### CUE: values and constraints in one structural model

```cue
#Issue: {
    number: int & >0
    title: string
    closedAt?: string | null
}
// Validate external input: cue vet -c schema.cue issue.json
```

CUE structs are structural constraints: an ordinary struct is open by default; `close(...)` closes it, and definitions such as `#Issue` normally close recursively. Optional fields constrain a field if present; a constraint is not necessarily a concrete serializable value. Validation combines constraints and data rather than trusting a JSON cast.[C1][C2][C3]

**Errors:** the official JSON validation walkthrough shows a field path, conflicting values/type, and both schema/data source locations (`people.Rob.age: conflicting values 42.2 and int ...`). Good diagnostic precedent for Skillang. **Trade-off:** adopting unification and the value lattice is substantially more than adding an ML decoder; that complexity assessment is a design judgment.[C3]

### Nickel: structural contracts plus statically typed islands

```nickel
let Issue = {
  number | Number,
  title | String,
  ...
} in
{ number = 1, title = "Investigate", state = "OPEN" } | Issue
```

This is an **open record contract**, not a static type annotation. Nickel contracts use `|`; static type annotations use `:`. Record contracts reject extra fields by default, while `...` permits them. The static type system has structural record types and row polymorphism, e.g. `forall r. { total : Number; r } -> Number`; static record typing and runtime contract checking should not be conflated.[N1][N2]

**Errors:** published examples show “contract broken by a value”, an offending field, source spans and blame at the contract application; function contracts distinguish caller blame. Nickel also documents how unannotated dynamic code can report errors inside library functions rather than at the call site. Contracts can defer checks, so do not assume an application has eagerly validated an entire nested document.[N1][N2]

### Dhall: closed structural types, with a separate JSON converter

```dhall
let Issue = { number : Natural, title : Text }
in { number = 1, title = "Investigate" } : Issue
```

Dhall record types are structural and fix their field set; naming a record with `let` does not create nominal identity. Its type-inference specification checks record annotations by type equivalence. The tutorial treats types as schemas for generated JSON. JSON ingestion is a separate tool:

```sh
printf '%s' '{"number":1,"title":"Investigate"}' |
  json-to-dhall '{ number : Natural, title : Text }'
```

Importantly, `json-to-dhall` defaults to **non-strict input records** (`strictRecs = False`), with `--records-strict` for rejecting extra keys. This is compatible with producing closed Dhall records: input openness is not row polymorphism.[D1][D2][D3]

**Errors:** the tutorial shows expected versus actual record types and an expression span; `--explain` expands otherwise terse errors. The JSON converter carries JSON paths in `Mismatch`, `MissingKey` and `UnhandledKeys` errors. This makes Dhall relevant both for statically validated configuration and explicit external-data conversion.[D1][D3]

### KCL: named schemas, optional fields, checks and index signatures

```kcl
schema Issue:
    number: int
    title: str
    closedAt?: str
    check:
        number > 0

issue = Issue { number = 1, title = "Investigate" }
```

KCL has named schemas, schema inheritance and instance construction, plus dictionaries; it is not merely a structural record calculus. Fixed schemas reject undefined attributes, while index signatures allow additional keys of a specified type. `?` marks an optional attribute; required attributes must receive non-`None`/non-`Undefined` values. The example's optional string is **not** intended as a faithful GitHub nullable-time codec.[K1][K2]

**Nominality qualification:** the sources establish named schema identity, inheritance and schema-type operations. I did not establish every same-shape assignability rule; “named schema model” is safer than claiming all KCL data is strictly nominal. **Errors:** the tour documents type/undefined-attribute compilation errors and custom assertion messages. I did not confirm a comprehensive, stable path-rich error format for external JSON validation.[K1][K2]

### Jsonnet: dynamic objects and assertions, not a static schema system

```jsonnet
local issue = { number: 1, title: 'Investigate', extra: true };
assert std.type(issue.title) == 'string' : 'issue.title must be a string';
issue + { title: 'Updated' }
```

Jsonnet is dynamically typed; objects are extensible/composable and have no nominal record identity or closed static record types. Assertions can enforce ad-hoc constraints; `+` composes objects using inheritance/overrides. Hidden fields and object assertions mean it is not simply “JSON with comments”. This example validates only one field, not a complete schema.[J1]

**Errors:** `error "message"` and assertions provide author-defined runtime messages; assertions are checked when the object is manifested. The language reference does not establish a uniform external-data mismatch path format. Borrow its object ergonomics, not its boundary safety story.[J1]

### Pkl: typed classes alongside dynamic objects

```pkl
class Issue {
  number: Int(isPositive)
  title: String
}
issue = new Issue {
  number = 1
  title = "Investigate"
}
updated = (issue) { title = "Updated" }
```

Pkl distinguishes `Typed` objects with a fixed class-defined shape from `Dynamic` objects with no predefined structure. Classes support inheritance; typed instances are class-based rather than anonymous structural row records. Type aliases and constraints add vocabulary and predicates without introducing a new class. Amendment preserves the object's class and overrides members. `Dynamic.toTyped(Issue)` provides a checked conversion when the required properties and constraints fit.[P1]

**Errors:** the official tutorial and reference show source locations, expected/actual type and an evaluation trace on invalid configuration; the reference explains constrained types and conversions. Checks happen during evaluation of lazy configuration, not via a guarantee that every source expression was eagerly checked. I did not independently test JSON parser-to-class error rendering.[P1][P2]

**Synthesis (design judgment):** CUE/Nickel are useful if schema constraints and composition become central. Dhall suggests keeping schema equal to type. KCL/Pkl suggest recognizable domain classes with defaults. None requires Skillang to adopt an entire configuration language, particularly when most skill source is prose.

## 3. Typed decoding at the boundary

### Elm `Json.Decode`

```elm
type alias Issue = { number : Int, title : String }

issueDecoder : Decode.Decoder Issue
issueDecoder =
    Decode.map2 (\n t -> { number = n, title = t })
        (Decode.field "number" Decode.int)
        (Decode.field "title" Decode.string)
-- Decode.decodeString issueDecoder input : Result Decode.Error Issue
```

Elm records are structural; this alias is closed, while `{ r | title : String }` describes an extensible record parameter. Field decoders require their named field but do not reject unrelated keys; they construct a new typed result rather than preserve the original JSON. `nullable` handles JSON null, while `maybe` can absorb decoding failures and should not be casually substituted for a precisely optional field.[E1][E2]

**Errors:** `Field`, `Index`, `OneOf`, and `Failure String Value` form a structured error tree. `errorToString` renders locations and failed alternatives. Explicit `fail`/`andThen` supports domain messages. This is a strong reference implementation for Skillang's error algebra.[E1]

### Gleam `dynamic.decode`

```gleam
pub type Issue {
  Issue(number: Int, title: String)
}

fn issue_decoder() {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  decode.success(Issue(number:, title:))
}
// decode.run(input_dynamic, issue_decoder())
```

Gleam's custom type supplies nominal identity; this constructor has a fixed field set, not an open row. `Dynamic` represents unknown external data, and `Decoder(a)` safely produces an `a`. The combinators select fields, permitting unselected input content; this does not add open records to the language. `optional_field` specifies an absent-field default. The language server can generate a dynamic decoder from a custom type, reducing handwritten boilerplate.[G1][G2]

**Errors:** `run` returns `Result(a, List(DecodeError))`; each `DecodeError` records `expected`, `found`, and `path`. The docs explicitly warn that underlying Erlang/JavaScript representation differences can affect decoding. Skillang should choose one JSON semantic model rather than expose such target differences.[G1]

### Roc: inferred/derived JSON parsers; pin the generation

```roc
# Adapted from the current compiler's checked test fixture:
result : Try({ name : Str, count ?: U8 }, [InvalidJson(Str), MissingRequiredField(Str)])
result = Json.parse("{\"name\":\"a\"}")
```

Roc is actively changing and its current mini-tutorial says it is not yet at 0.1. The current compiler tests show `Json.parse` deriving the parser from a record's expected type, structural anonymous records, and nominal definitions (`Counted := ...`) with derived `parser_for`/`encoder_for`. Optional `?:` fields preserve a missing state; `??` defaults fill omitted fields. Tests explicitly distinguish missing from `null`: null is an error for a non-nullable numeric field even with a default.[R1][R2][R3]

**Open/closed qualification:** the illustrated type enumerates its result fields, with one optional slot; the checked JSON tests do not alone establish a universal policy for unknown input keys or all open-row inference rules. **Errors:** tested variants include `MissingRequiredField(Str)` and `InvalidJson(Str)`, plus composition with custom parser errors. I did not confirm complete nested JSON-path diagnostics. Do not base a v0 design on an older `Decode`/`Decoding` example without pinning the Roc compiler generation.[R2][R3][R4]

### TypeScript + Zod

```typescript
const Issue = z.object({ number: z.number().int(), title: z.string() });
type Issue = z.infer<typeof Issue>;
const result = Issue.safeParse(JSON.parse(input));
```

TypeScript object types use structural compatibility, not exact closed-record semantics; object-literal excess-property checks do not amount to runtime validation. Zod adds the missing boundary check and infers the result type from the schema. Default `z.object` **strips** unknown keys; `z.strictObject` rejects them; `z.looseObject` passes them through. Thus these are not simply “open versus closed types”. Optional/nullable are separate schema constructors.[TS][Z1]

**Errors:** Zod returns structured issues with codes, paths and messages. `z.treeifyError`, `z.prettifyError` and `z.flattenError` offer nested, human-readable, and shallow forms respectively. `JSON.parse` itself can still throw a syntax error before `safeParse`; a robust wrapper must handle both layers.[Z1][Z2][JS]

### OCaml `ppx_deriving_yojson`

```ocaml
type issue = { number : int; title : string }
[@@deriving yojson { strict = false }]
(* issue_of_yojson : Yojson.Safe.t -> (issue, string) Result.result *)
```

Ordinary OCaml record types are named/nominal with a fixed field set. The PPX derives serializers/deserializers from that type. It defaults to strict object decoding; `{ strict = false }` ignores unknown input fields. `[@key "wire_name"]` maps names; `[@default ...]` permits omission; OCaml `option` encodes as null or a value, which is distinct from accepting an absent key by default. Custom `[@of_yojson]` supports special boundary rules.[O1][O2]

**Errors:** the README specifies `Error loc`, locating failure in the JSON hierarchy; the API returns a string, not a rich expected/actual error tree. The optional exception API raises `Failure err`. The terse type-derived approach fits an ML language, but Skillang should improve the error payload.[O1]

## 4. Querying and immutable updating

### jq

```sh
jq '[.[] | select(.state == "OPEN") | {number, title}]'
jq 'map(.title |= ascii_upcase)'
```

jq's dynamic value model has objects with arbitrary keys, no nominal types, and no static open/closed record distinction. Filters produce streams of values; `map` collects traversal results. `|=` updates selected locations; plain `=` has different right-hand-side context. `.foo` returns null for a missing object key, so it can conflate absent and explicit-null data unless `has("foo")` is used. `?` suppresses certain errors; it is not a proof of validity.[Q1]

**Errors:** type-inappropriate operations fail at runtime; the manual documents `error(message)`/`try ... catch` and diagnostic examples. There is no schema-driven field-type mismatch guarantee. jq is an excellent brevity target, but a poor place to hide Skillang's typed boundary.[Q1]

### JSONPath (RFC 9535)

```text
$[?@.state == "OPEN"].title
```

RFC JSONPath selects nodes from a JSON value and returns a nodelist. Objects remain untyped JSON, with no nominal or closed/open record types. Filters and registered function extensions have defined semantics and limited function-expression typing, but that is not a typed schema for object fields. The RFC does **not** standardize mutation/update. Its `Nothing` and empty-selection rules also differ from a single optional typed field.[JP]

**Errors:** the RFC specifies validity and evaluation semantics, not a required friendly diagnostic format. Engines can reject malformed queries; a missing member often gives no selected node rather than a schema mismatch. A Skillang path DSL would need additional static schema checks and an explicit cardinality model.[JP]

### Haskell lenses/traversals, including `lens-aeson`

```haskell
-- Assuming a generated typed field lens:
updated = issue & title .~ "Updated"
-- Raw JSON: key is a traversal, and _String is a prism.
titles = value ^.. values . key "title" . _String
updatedJson = value & values . key "title" . _String %~ Text.toUpper
```

Haskell algebraic data types give nominal closed domain types, and a `Lens' Issue Text` focuses exactly one typed field. `Traversal'` can focus zero or many; prisms select a matching alternative. Raw Aeson `Value` is still dynamic JSON: `key` and `_String` compose safe typed operations, but missing/non-string content can simply produce no focus. This is **not** validation of an `Issue` schema. Lens signatures guarantee the focused type, not that every document had the requested field.[L1][L2]

**Errors:** `preview` returns an optional focus; traversals can skip mismatches without reporting them. Ordinary lens operations do not inherently produce decode errors. Use them after decoding, or explicitly decide whether a skipped path is acceptable.[L1][L2]

### OCaml/ML records and small optics

```ocaml
let updated = { issue with title = "Updated" }
let updated_author =
  { issue with author = { issue.author with login = "new-login" } }
```

OCaml's named record types statically check fields and immutable record updates preserve the other fields; they are not row-polymorphic records. The nested example assumes an extended `issue` type with an `author` record. Elm's analogous form is `{ issue | title = "Updated" }`; Roc's current tutorial uses `{ ..record, name: "New Name" }`. Ordinary updates are terse at one level; deep updates require rebuilding ancestors.[O2][E2][R1]

An **illustrative library design**, not a built-in OCaml syntax, is a record containing `get : 's -> 'a` and `set : 'a -> 's -> 's`. It can compose typed record focuses without dynamically interpreting string paths. Partial focuses require an option/result or traversal, just as in Haskell. This is a design inference from the typed lens APIs, not a claim about a particular OCaml optics package.[L1]

**Errors:** incorrect ordinary field names/types are compiler errors; updates themselves do not validate external JSON. I did not benchmark OCaml compiler diagnostics or verify a maintained OCaml JSON-optics library, so no package adoption is recommended here.[O2]

### Row polymorphism: PureScript and Elm

```purescript
titleOf :: forall r. { title :: String | r } -> String
titleOf issue = issue.title
```

```elm
titleOf : { r | title : String } -> String
titleOf issue = issue.title
```

Both express structural functions accepting a record with a known field and additional fields abstracted by a row. PureScript also supports closed record types such as `{ title :: String }`; its docs show inference of open rows and rejection when required fields are missing. Elm's docs distinguish ordinary and extensible records. These features support reuse across projections; they do **not** inspect untrusted JSON or define how unknown input keys are retained.[PS][E2]

**Errors:** statically missing required fields fail type checking. The PureScript documentation demonstrates the failing case but this research did not establish comparative diagnostic quality across compilers. **Cost judgment:** row inference and row-aware diagnostics are additional compiler work; useful, but not necessary for an initial catalog of concrete action result types.

## 5. Can we get a schema for `gh`?

### Names are discoverable; types are not described by `--json`

Official command manuals list allowed JSON field names. `--json number,title` selects output fields; `--jq` and `--template` format/filter those results. The formatting manual recommends passing `--json` with no value to discover fields. Local read-only observations on **gh 2.101.0 (2026-09-15)** confirm:

```text
$ gh issue list --json
Specify one or more comma-separated fields for `--json`:
  assignees
  author
  ...
  title
  updatedAt
  url

$ gh issue list --json definitelyNotAField
Unknown JSON field: "definitelyNotAField"
Available fields:
  ...
```

These calls exited nonzero without fetching issue contents. The message is good for name discovery, but contains no field types, nullability or nested shapes. The manuals examined likewise list names, not a machine-readable command-output schema. I did **not** confirm an official complete JSON Schema distribution for `gh`; this is a limitation of the investigated interfaces, not proof that no such artifact exists anywhere.[H1][H2][H4]

### Source code is the authoritative recipe for command output

At tag `v2.101.0`, `api/query_builder.go` lists `IssueFields` and maps requested fields to GraphQL fragments; `api/queries_issue.go` defines the Go model; `api/export_pr.go` implements **both** issue and PR output transformations. The exporter flattens `Labels.Nodes`, `Comments.Nodes` and `Assignees.Nodes` to arrays, turns project items into `{status,title}` objects, and creates selected relationship objects manually. Default fields use reflection on the Go value.[H5][H6][H7]

Consequences supported by those implementations:

- A GraphQL `labels { nodes ... totalCount }` connection is **not** the same shape as CLI JSON `labels: [...]`.[H5][H7]
- `ClosedAt *time.Time`, `Milestone *Milestone`, and pointer issue relations need nullable output modeling; a sample alone cannot infer all nullability rules.[H6][H7]
- Go struct fields alone do not describe the public output: custom export logic and nested marshal methods must also be examined. `ProjectItems` is a particularly clear counterexample.[H7]
- Requested nested relationships may be bounded: query fragments contain `labels(first:100)`, `comments(first:100)`, `blockedBy(first:50)` and others. Some exports discard connection counts/page information; do not promise completeness solely because a list decoded successfully.[H5][H7]

Observed live output (read-only, `gh issue list --repo saiashirwad/skillang --limit 1 --json number,title,state,closedAt,labels,milestone,author`) had this shape, with content shortened here:

```json
[{
  "number": 6,
  "title": "How do small typed languages model JSON, schemas and typed wrappers for CLI output?",
  "state": "OPEN",
  "closedAt": null,
  "milestone": null,
  "labels": [{"id":"...","name":"wayfinder:research","description":"","color":"c5def5"}],
  "author": {"id":"...","is_bot":false,"login":"saiashirwad","name":"texoport"}
}]
```

This is evidence for that invocation/version, **not** a full schema. Field order, array emptiness and edge cases must not be inferred from one response. A practical CLI schema pipeline is therefore a **curated, versioned manifest**, informed by source, exercised with fixtures, and checked by runtime decoders. Automatic generation from Go is possible in principle but requires modeling exporter transformations; no ready-made generator was verified.

### GraphQL can generate typed wrappers—of GraphQL operations

GitHub explicitly provides public schema download and API introspection. The schema describes object fields, scalar/enum types, nullability, interfaces, unions and arguments. Generate a result codec from **an operation's selection set plus the schema**, accounting for aliases, fragments, `__typename`, nullable parents and selected connection/page fields. This follows GraphQL's response/selection rules; a full `Issue` schema type is not an operation response type.[GHG][GHS]

A direct read-only call was observed to return:

```sh
gh api graphql -f query='query {
  repository(owner:"saiashirwad", name:"skillang") {
    issue(number:1) { number title state closedAt labels(first:1) { nodes { name } } }
  }
}'
```

```json
{"data":{"repository":{"issue":{"number":1,"title":"Skillang: a language and compiler for agent skills","state":"OPEN","closedAt":null,"labels":{"nodes":[{"name":"wayfinder:map"}]}}}}}
```

The important observed property is the `data.repository.issue.labels.nodes` envelope, rather than the CLI's flattened labels array.

GraphQL errors may coexist with partial `data`; do not treat successful transport or a decoded envelope as complete semantic success. Custom scalars need codecs beyond a primitive type name, and connection pagination must be explicit. Pin a schema snapshot and validate operations against it; optionally regenerate as part of adapter maintenance.[GHS][GHG][H3]

### What `gh api` returns

`gh api <endpoint>` makes an authenticated HTTP request and prints its response. REST endpoint names and `graphql` choose different API surfaces; `--json` command-field selection is not the `gh api` mechanism. Default method is GET, switching to POST when parameters are added unless `--method` overrides it. The default output is the endpoint body, **not** a universal issue record.[H3]

Observed `gh api repos/saiashirwad/skillang/issues/1` data used REST `closed_at` and `state: "open"`; GraphQL/command output used `closedAt` and `"OPEN"`. This is another reason not to reuse the same wire schema for all three adapters. GitHub's official REST OpenAPI descriptions provide a separate generation source for REST wrappers.[H3][REST]

`--include` mixes status/headers into output; `--jq`/`--template` change the shape; `--paginate` prints successive page arrays/objects; `--slurp` wraps those pages in an outer array. Content negotiation can request non-default formats. A typed wrapper must control these flags, API version/media type, pagination and endpoint, rather than decode arbitrary user-formatted stdout as one JSON object.[H3]

**Effect-system judgment:** a process invocation being named `gh api` is not sufficient to infer read-only effects. Model the selected operation/method and its allowed capability; even GraphQL queries use HTTP POST, whereas GraphQL mutations write. Keep authentication/authorization, transport failure, API error and decode failure separate.

## 6. Candidate Skillang designs

The following are **proposals**, not existing syntax or implementation commitments.

### A. Closed ML records + automatically derived boundary codecs (recommended v0)

```text
type Issue = { number: Int, title: String, closedAt: Option<Instant> }
let issues = gh.issues.list(repo, fields = Issue)?
let titles = issues |> map(.title)
let edited = { issue with title = "Updated" }
```

- `Json` is an opaque dynamic sum type. `decode<T>(json)` returns `Result<T, DecodeError>`, never an unchecked cast. Type declarations derive codecs; explicit hand-written combinators cover irregular cases, following Elm/Gleam/OCaml precedent.[E1][G1][O1]
- The `fields = Issue` shorthand must map through an adapter manifest, not arbitrarily assume every local record field is a supported `gh` field. Domain transforms require separate wire types. Initially, named wrapper projections such as `IssueSummary` may be simpler than implicit derivation.
- Decoding explicitly chooses `strict` (reject extras) or `project` (ignore extras). Result records are closed in either mode. Lossless round-trip editing needs a distinct remainder map or `Json` escape hatch, not an undocumented promise to retain extras.
- Define absent-field and null separately: e.g. required `Option<T>` accepts null but not omission; an explicit `optional` codec accepts omission. Defaults must not swallow wrong-type data. Roc tests provide a useful warning here.[R3]
- A pinned CLI adapter controls `--json`, disables formatting overrides, validates stdout, and returns domain values with decode/version errors. Start with a handful of corpus-needed read-only operations, not every `gh` command.

**Strength:** smallest type checker, familiar ML operations, no runtime schema DSL required. **Weakness:** multiple projections need multiple concrete record types; nested updates are verbose. **Decision:** choose this unless actual skills demonstrate a need for B/C.

### B. Structural row-polymorphic records + typed paths

```text
let titleOf : { title: String | r } -> String = .title
let issues = gh.issues.list(repo, select = { number, title, labels.name })?
let names = issues |> map(.labels |> map(.name))
let edited = update(issue, .author.login, uppercase)
```

Each selection builds a closed result record; row-polymorphic helpers abstract over those results. A path has a statically known source/focus type and cardinality (`one`, `optional`, `many`); nested field updates lower to immutable reconstruction. For a CLI wrapper, `.labels.name` could decode/project after requesting the entire `labels` field; it must not pretend `--json` supports arbitrary nested selections. For GraphQL, operation generation can perform actual nested selection.[PS][E2][L1][H5]

**Strength:** close to jq brevity with checked field names and typed reusable helpers. **Weakness:** row inference, selection elaboration and cardinality diagnostics enlarge the language. Raw JSON paths still require validation. **Decision:** a plausible second stage, with ordinary list combinators before a new query grammar.

### C. Schema/contract declarations + generated API modules

```text
schema IssueWire {
  number: Int where > 0
  title: String
  closedAt: nullable Instant
  extras: ignore
}
let issues = gh.issues.summary(repo)?
```

A schema generates type, decoder and optionally JSON Schema/documentation, while refinements/custom scalar codecs check domain constraints. Separately generate `github.graphql` modules from a pinned schema and checked operation documents; generate REST modules from GitHub OpenAPI. Maintain a curated CLI manifest only where the human-oriented CLI's transformed output is useful. CUE/Nickel demonstrate expressive constraints; Pkl/KCL demonstrate named schema ergonomics.[C3][N1][P1][K1][GHG][REST]

**Strength:** one source of truth for boundary constraints and reusable wrappers. **Weakness:** schema/type duplication unless schema elaborates directly to the ordinary type; full contract/unification semantics would exceed a “quaint” v0. Generated GraphQL does not magically type CLI exporters. **Decision:** adopt adapter generation independently; defer a general schema language until type-derived decoding proves inadequate.

### Shared acceptance criteria (proposed)

1. A misspelled selected field is a compile-time error. Unknown/changed wire data is a controlled runtime error, not a trusted cast.
2. A diagnostic includes action, adapter version, JSON path (`$[3].labels[0].name`), expected type, actual category, and whether a key was absent. Limit captured values to avoid leaking private issue contents/tokens.
3. Missing, null, unknown enum variants and invalid timestamps have explicit policies; distinguish GitHub node IDs from issue numbers via nominal domain types where useful.
4. Transport/process/API/decode errors remain distinct. GraphQL partial-data policy and pagination/completeness are visible in wrapper contracts.
5. Fixture tests cover empty lists, null parents, bot/deleted authors, optional fields, extra keys, unknown enum values, malformed JSON, and truncated nested connections. Run schema/adapter compatibility tests against supported `gh` versions.
6. Reading/modifying a local decoded record never itself writes to GitHub. Remote actions carry explicit capabilities and are not hidden inside field updates.

## 7. Limits and what remains unconfirmed

- Executed only the read-only `gh` observations described above; did not install/run every language, compare diagnostic UX empirically, or mutate GitHub issues.
- No complete official `gh` command-output schema or generator was verified. Schema discovery through field lists only yields names; source-derived schemas need exporter-aware work and edge-case tests.
- Documentation reflects the sources reachable on the research date. CLI source is pinned to 2.101.0; Roc references below pin current compiler tests because older tutorials/API names are particularly risky. Other projects' `main`/`master` docs can move.
- Dhall/Zod/Roc hosted pages were inaccessible (HTTP 403) or old source paths absent; equivalent first-party repository docs/source were consulted. No claims rely on inaccessible text.
- KCL's complete structural-versus-nominal assignability behavior, Roc's general extra-key policy, maintained OCaml JSON optics, and exact production error formats for KCL/Pkl external JSON need further focused verification before implementation.
- Wrapper generation and the candidate syntax are design deductions, not a verified existing Skillang feature or an implementation estimate.

## Primary sources

[C1]: https://cuelang.org/docs/tour/types/structs/ "CUE: structs"
[C2]: https://cuelang.org/docs/tour/types/closed/ "CUE: closed structs"
[C3]: https://cuelang.org/docs/howto/validate-json-using-cue/ "CUE: validating JSON and diagnostic examples"
[N1]: https://nickel-lang.org/user-manual/contracts/ "Nickel: contracts, record openness, blame and delayed checks"
[N2]: https://nickel-lang.org/user-manual/typing/ "Nickel: static typing and row polymorphism"
[D1]: https://github.com/dhall-lang/dhall-lang/blob/master/docs/tutorials/Getting-started_Generate-JSON-or-YAML.md "Dhall: generating JSON, types as schemas, --explain"
[D2]: https://github.com/dhall-lang/dhall-lang/blob/master/standard/type-inference.md "Dhall: record typing and type equivalence"
[D3]: https://github.com/dhall-lang/dhall-haskell/blob/main/dhall-json/src/Dhall/JSONToDhall.hs "Dhall: converter options, strictness and JSON-path errors"
[K1]: https://www.kcl-lang.io/docs/reference/lang/tour "KCL: schema, optional attributes, checks, index signatures"
[K2]: https://www.kcl-lang.io/docs/reference/lang/spec/schema "KCL: schema specification"
[J1]: https://jsonnet.org/ref/language.html "Jsonnet language reference: dynamic values, composition, assertions"
[P1]: https://pkl-lang.org/main/current/language-reference/index.html "Pkl: typed/dynamic objects, classes, constraints, amendment"
[P2]: https://pkl-lang.org/main/current/language-tutorial/01_basic_config.html "Pkl: configuration and diagnostics"
[E1]: https://github.com/elm/json/blob/master/src/Json/Decode.elm "Elm JSON: decoder signatures, semantics and error rendering"
[E2]: https://elm-lang.org/docs/records "Elm: records, updates and extensible records"
[G1]: https://hexdocs.pm/gleam_stdlib/gleam/dynamic/decode.html "Gleam: dynamic decoding, decoder generation, structured errors"
[G2]: https://tour.gleam.run/data-types/custom-types/ "Gleam: custom types"
[R1]: https://github.com/roc-lang/roc/blob/a932c6541e9894e821341f683ec642fd71cacf9c/docs/mini-tutorial-new-compiler.md "Roc current compiler tutorial: maturity, records and nominal types"
[R2]: https://github.com/roc-lang/roc/blob/a932c6541e9894e821341f683ec642fd71cacf9c/test/cli/JsonParseInferredRecord.roc "Roc: inferred JSON record parser test"
[R3]: https://github.com/roc-lang/roc/blob/a932c6541e9894e821341f683ec642fd71cacf9c/test/cli/JsonOptionalFieldKinds.roc "Roc: optional/default fields, nominal parsers, null-versus-absence tests"
[R4]: https://github.com/roc-lang/roc/blob/a932c6541e9894e821341f683ec642fd71cacf9c/test/cli/JsonParseErrorComposition.roc "Roc: parser error composition test"
[TS]: https://www.typescriptlang.org/docs/handbook/type-compatibility.html "TypeScript: structural compatibility and excess property caveat"
[Z1]: https://github.com/colinhacks/zod/blob/main/packages/docs/content/api.mdx "Zod API: inference, parsing, object strictness, optional/nullable"
[Z2]: https://github.com/colinhacks/zod/blob/main/packages/docs/content/error-formatting.mdx "Zod: paths and error formatting"
[JS]: https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse "ECMAScript JSON.parse and SyntaxError"
[O1]: https://github.com/ocaml-ppx/ppx_deriving_yojson/blob/master/README.md "OCaml PPX: generated functions, strictness, defaults and error contract"
[O2]: https://github.com/ocaml/ocaml/blob/5.3/manual/src/tutorials/coreexamples.etex "OCaml manual source: named records and functional update"
[Q1]: https://jqlang.org/manual/ "jq: types, field/index access, assignments, errors"
[JP]: https://www.rfc-editor.org/rfc/rfc9535.html "JSONPath RFC: nodelists, selection, filters and functions"
[L1]: https://hackage.haskell.org/package/lens/docs/Control-Lens.html "Haskell lens: typed lenses, traversals, prisms and operations"
[L2]: https://hackage.haskell.org/package/lens-aeson/docs/Data-Aeson-Lens.html "lens-aeson: key traversal and typed JSON prisms"
[PS]: https://github.com/purescript/documentation/blob/master/language/Types.md "PureScript: structural records, open/closed rows, nominal newtypes"
[H1]: https://cli.github.com/manual/gh_help_formatting "gh: JSON fields, jq and templates"
[H2]: https://cli.github.com/manual/gh_issue_list "gh issue list: supported JSON fields"
[H3]: https://cli.github.com/manual/gh_api "gh api: request methods, response formatting and pagination"
[H4]: https://github.com/cli/cli/blob/v2.101.0/pkg/cmdutil/json_flags.go "gh: JSON flag field validation"
[H5]: https://github.com/cli/cli/blob/v2.101.0/api/query_builder.go "gh: field catalog and GraphQL fragment construction"
[H6]: https://github.com/cli/cli/blob/v2.101.0/api/queries_issue.go "gh: Go issue model"
[H7]: https://github.com/cli/cli/blob/v2.101.0/api/export_pr.go "gh: issue and PR JSON transformations"
[GHG]: https://docs.github.com/en/graphql/overview/public-schema "GitHub: public GraphQL schema download and introspection"
[GHS]: https://spec.graphql.org/September2025/#sec-Response "GraphQL specification: response data, selections and errors"
[REST]: https://github.com/github/rest-api-description "GitHub: official REST OpenAPI descriptions"
