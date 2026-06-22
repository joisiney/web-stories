#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

interface ServerOptions {
  dir: string;
  port: number;
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.xsl', 'text/xsl; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml']
]);

function parseArgs(args: string[]): ServerOptions {
  const dir = readFlag(args, '--dir') ?? 'public';
  const port = Number(readFlag(args, '--port') ?? '8080');
  if (!Number.isInteger(port) || port < 1) {
    throw new Error('Invalid --port: expected a positive integer');
  }
  return { dir, port };
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function resolveRequestPath(root: string, requestUrl: string | undefined): Promise<string | undefined> {
  const url = new URL(requestUrl ?? '/', 'http://localhost');
  const decodedPath = decodeURIComponent(url.pathname);
  const candidate = resolve(join(root, decodedPath));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return undefined;
  }

  try {
    const stats = await stat(candidate);
    if (stats.isDirectory()) {
      return join(candidate, 'index.html');
    }
    return candidate;
  } catch {
    if (!extname(candidate)) {
      return join(candidate, 'index.html');
    }
    return candidate;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const root = resolve(options.dir);

  const server = createServer(async (request, response) => {
    const filePath = await resolveRequestPath(root, request.url);
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, {
        'content-type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
        'cache-control': 'public, max-age=60'
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  server.listen(options.port, () => {
    console.log(`Serving ${root} at http://localhost:${options.port}`);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
