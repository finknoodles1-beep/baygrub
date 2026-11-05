import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker.js';

// Local-only D1-compatible storage: production uses Cloudflare D1.
await mkdir('.wrangler', { recursive: true });
const sqlite = new DatabaseSync('.wrangler/baygrub-local.sqlite');
function statement(sql) {
  let values = [];
  const args = () => values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value);
  return {
    bind(...items) { values = items; return this; },
    async run() { const result = sqlite.prepare(sql).run(...args()); return { meta: { changes: Number(result.changes) } }; },
    async first() { return sqlite.prepare(sql).get(...args()) || null; },
    async all() { return { results: sqlite.prepare(sql).all(...args()) }; }
  };
}
const db = { prepare: statement, async batch(statements) {
  sqlite.exec('BEGIN');
  try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec('COMMIT'); return results; }
  catch (e) { sqlite.exec('ROLLBACK'); throw e; }
} };
const root = resolve(process.argv[2] || '.');
const port = Number(process.env.BAYGRUB_PORT || 5174);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:5174');
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const request = new Request(url, { method: req.method, headers: req.headers, ...(body.length ? { body, duplex: 'half' } : {}) });
      const response = await worker.fetch(request, { DB: db });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const asset = pathname === '/baygrub.jpg' && root === resolve('.') ? '/public/baygrub.jpg' : pathname;
    const file = resolve(root, `.${asset === '/' ? '/index.html' : asset}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch (e) { console.error(e); res.writeHead(500).end('Local server error'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port} (local data only)`));
