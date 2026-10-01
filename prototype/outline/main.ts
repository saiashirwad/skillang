// THROWAWAY CLI. Run from repo root: bun prototype/outline/main.ts --all
import { watch } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { Diagnostic, dump, formatDiagnostic, parseOutline } from "./parser.ts";

async function show(path: string): Promise<boolean> {
  console.log(`\n=== ${path} ===`);
  let source: string;
  try { source = await Bun.file(path).text(); }
  catch (error) { console.error(`Cannot read ${path}: ${error}`); return false; }
  try { console.log(dump(parseOutline(source))); return true; }
  catch (error) {
    if (!(error instanceof Diagnostic)) throw error;
    console.log(formatDiagnostic(source, path, error));
    return false;
  }
}
const args = Bun.argv.slice(2);
if (args.length === 1 && args[0] === "--all") {
  const fixtures = new Bun.Glob("*.skl");
  const paths = Array.from(fixtures.scanSync(`${import.meta.dir}/fixtures`)).sort();
  let trees = 0;
  for (const path of paths) if (await show(`${import.meta.dir}/fixtures/${path}`)) trees++;
  console.log(`\n${trees} trees, ${paths.length - trees} diagnostics (some edge fixtures intentionally fail).`);
} else if (args.length === 2 && args[0] === "--watch") {
  const path = resolve(args[1]!);
  await show(path);
  console.log(`\nWatching ${path}; Ctrl-C to stop.`);
  let timer: ReturnType<typeof setTimeout>;
  // Watch the directory so editors' atomic rename-on-save keeps working.
  watch(dirname(path), (_, file) => {
    if (file && file.toString() !== basename(path)) return;
    clearTimeout(timer);
    timer = setTimeout(() => void show(path), 80);
  });
} else if (args.length === 1 && !args[0]!.startsWith("--")) {
  if (!await show(args[0]!)) process.exitCode = 1;
} else {
  console.error("Usage: bun prototype/outline/main.ts [--watch] <file.skl> | --all");
  process.exitCode = 2;
}
