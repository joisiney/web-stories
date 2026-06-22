#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import amphtmlValidator from 'amphtml-validator';

async function main(args: string[]): Promise<void> {
  const target = args[0] ?? 'public/stories';
  const files = await findHtmlFiles(target);
  if (files.length === 0) {
    throw new Error(`No HTML files found under ${target}`);
  }

  const validator = await amphtmlValidator.getInstance();
  let errors = 0;

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const result = validator.validateString(html);
    if (result.status === 'PASS') {
      console.log(`${file}: PASS`);
      continue;
    }

    errors += 1;
    console.error(`${file}: ${result.status}`);
    for (const error of result.errors) {
      const spec = error.specUrl ? ` (${error.specUrl})` : '';
      console.error(`  line ${error.line}, col ${error.col}: ${error.message}${spec}`);
    }
  }

  if (errors > 0) {
    process.exitCode = 1;
  }
}

async function findHtmlFiles(path: string): Promise<string[]> {
  const stats = await stat(path);
  if (stats.isFile()) {
    return path.endsWith('.html') ? [path] : [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? findHtmlFiles(child) : Promise.resolve(child.endsWith('.html') ? [child] : []);
  }));
  return nested.flat().sort();
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
