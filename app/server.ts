/**
 * Zero-dependency demo server (Node's built-in http module).
 *   GET  /health        -> "ok"
 *   POST /api/login     -> sets a session cookie (demo / demo123)
 *   GET  /api/catalog   -> the source-of-truth catalog (prices, hours, hotels)
 *   POST /api/chat      -> { reply, intent, mode }   (requires login)
 *   GET  /              -> chat UI (redirects to /login.html if not logged in)
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { catalog } from './catalog';
import { mockAgent } from './agent/mockAgent';
import { llmAgent } from './agent/llmAgent';

const PORT = Number(process.env.PORT ?? 3000);
const MODE = process.env.AGENT_MODE === 'llm' ? 'llm' : 'mock';
const sessions = new Set<string>();
const PUBLIC_DIR = join(__dirname, '..', 'public');
const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = async (req: IncomingMessage): Promise<any> => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};

const isLoggedIn = (req: IncomingMessage) => {
  const sid = req.headers.cookie?.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  return !!sid && sessions.has(sid);
};

async function serveStatic(res: ServerResponse, file: string) {
  try {
    const body = await readFile(join(PUBLIC_DIR, file));
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/health') return void res.end('ok');

    if (url.pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      if (username !== 'demo' || password !== 'demo123') return json(res, 401, { error: 'Invalid credentials' });
      const sid = randomUUID();
      sessions.add(sid);
      res.setHeader('set-cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/catalog') return json(res, 200, catalog);

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      if (!isLoggedIn(req)) return json(res, 401, { error: 'Please log in' });
      const { message } = await readBody(req);
      if (typeof message !== 'string' || !message.trim()) return json(res, 400, { error: 'message is required' });
      const result = MODE === 'llm' ? await llmAgent(message) : mockAgent(message);
      return json(res, 200, { ...result, mode: MODE });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (!isLoggedIn(req)) {
        res.writeHead(302, { location: '/login.html' });
        return void res.end();
      }
      return serveStatic(res, 'index.html');
    }
    return serveStatic(res, url.pathname.slice(1));
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Internal error' });
  }
}).listen(PORT, () => console.log(`Trip assistant running on http://localhost:${PORT} (mode: ${MODE})`));
