import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './api-handler.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, 'dist');
const port = Number(process.env.PORT || 5173);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bin': 'application/octet-stream',
};

async function serveStatic(urlPath, response) {
  let relative;
  try { relative = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, ''); } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const target = path.resolve(distDir, relative || 'index.html');
  if (!target.startsWith(distDir + path.sep) && target !== path.join(distDir, 'index.html')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const resolved = (await stat(target)).isDirectory() ? path.join(target, 'index.html') : target;
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(resolved)] || 'application/octet-stream' });
    response.end(await readFile(resolved));
  } catch {
    if (path.extname(relative)) {
      response.writeHead(404).end('Not found');
      return;
    }
    try {
      response.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
      response.end(await readFile(path.join(distDir, 'index.html')));
    } catch { response.writeHead(503).end('Build the app with npm run build first.'); }
  }
}

createServer(async (request, response) => {
  if (new URL(request.url || '/', 'http://localhost').pathname.startsWith('/api/')) {
    try { await handleApiRequest(request, response); } catch {
      if (!response.headersSent) {
        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'The API request could not be completed.' }));
      }
    }
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }
  await serveStatic(request.url || '/', response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Agro Rakshak server listening on port ${port}`);
});
