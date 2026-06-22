#!/usr/bin/env node
import { parseGenerateCliArgs } from './generate-web-stories/cli-options.js';
import { generateStories } from './generate-web-stories/generate-web-stories.js';

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;

  if (command === 'generate') {
    const options = parseGenerateCliArgs(rest);
    const report = await generateStories(options);
    console.log(`Processed ${report.total} URL(s): ${report.succeeded} succeeded, ${report.failed} failed.`);
    console.log(`Output: ${report.outputDir}`);
    console.log(`Report: ${report.outputDir}/reports/report.json`);
    return;
  }

  printHelp();
  if (command) {
    process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(`Usage:
  web-stories generate --sitemap <url> [--out public] [--base-url http://localhost:8080]

Options:
  --sitemap <url>          WordPress XML sitemap URL
  --out <dir>              Output directory (default: public)
  --base-url <url>         Public base URL used in canonical/assets (default: http://localhost:8080)
  --limit <number>         Process only the first N sitemap entries
  --concurrency <number>   Concurrent item workers (default: 6)
  --publisher <name>       Override publisher name
  --publisher-logo <url>   Override publisher logo URL
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
