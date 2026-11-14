#!/usr/bin/env node
// Nexi Drive — transfere arquivos entre celular e computador usando um código.
// Sem dependências: precisa apenas do Node.js 18+.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const STORAGE = path.resolve(process.env.DRIVE_DIR || path.join(__dirname, 'arquivos'));
const PUBLIC = path.join(__dirname, 'public');
const MAX_FILE = Number(process.env.MAX_FILE_MB || 4096) * 1024 * 1024;

fs.mkdirSync(STORAGE, { recursive: true });

// ---------- utilidades ----------

/** Código: 4 a 64 letras/números/-/_ (sem diferenciar maiúsculas). */
function cleanCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  return /^[A-Z0-9_-]{4,64}$/.test(code) ? code : null;
}

/** Nome de arquivo seguro: sem pastas, sem caracteres proibidos no Windows. */
function cleanName(raw) {
  let name = path.basename(String(raw || '').replace(/\\/g, '/'));
  name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+/, '').trim();
  if (!name || name.startsWith('.upload-')) return null;
  return name.slice(0, 200);
}

function codeDir(code) {
  return path.join(STORAGE, code);
}

/** Evita sobrescrever: foto.jpg -> foto (1).jpg */
function uniqueName(dir, name) {
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  let candidate = name;
  for (let i = 1; fs.existsSync(path.join(dir, candidate)); i++) {
    candidate = `${base} (${i})${ext}`;
  }
  return candidate;
}

function listFiles(code) {
  const dir = codeDir(code);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith('.upload-'))
    .map((d) => {
      const st = fs.statSync(path.join(dir, d.name));
      return { name: d.name, size: st.size, time: st.mtimeMs };
    })
    .sort((a, b) => b.time - a.time);
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

// Limite simples contra quem tenta adivinhar códigos (por IP).
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const a = attempts.get(ip) || { n: 0, t: now };
  if (now - a.t > 60_000) { a.n = 0; a.t = now; }
  a.n++;
  attempts.set(ip, a);
  return a.n > 600; // 600 requisições/minuto por IP
}

// ---------- tempo real (Server-Sent Events) ----------

const listeners = new Map(); // code -> Set<res>
function notify(code) {
  const set = listeners.get(code);
  if (!set) return;
  const payload = `data: ${JSON.stringify(listFiles(code))}\n\n`;
  for (const res of set) res.write(payload);
}

// ---------- rotas ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const full = path.join(PUBLIC, path.normalize(file));
  if (!full.startsWith(PUBLIC) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    res.writeHead(404); return res.end('Não encontrado');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
}

function handleUpload(req, res, code, rawName) {
  const name = cleanName(rawName);
  if (!name) return json(res, 400, { error: 'Nome de arquivo inválido' });
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_FILE) return json(res, 413, { error: 'Arquivo grande demais' });

  const dir = codeDir(code);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.upload-${crypto.randomBytes(6).toString('hex')}`);
  const out = fs.createWriteStream(tmp);
  let received = 0;
  let failed = false;

  const fail = (status, msg) => {
    if (failed) return;
    failed = true;
    out.destroy();
    fs.rm(tmp, { force: true }, () => {});
    if (!res.headersSent) json(res, status, { error: msg });
  };

  req.on('data', (chunk) => {
    received += chunk.length;
    if (received > MAX_FILE) { fail(413, 'Arquivo grande demais'); req.destroy(); }
  });
  req.on('aborted', () => fail(400, 'Envio cancelado'));
  out.on('error', () => fail(500, 'Erro ao salvar o arquivo'));
  out.on('finish', () => {
    if (failed) return;
    const finalName = uniqueName(dir, name);
    fs.rename(tmp, path.join(dir, finalName), (err) => {
      if (err) return fail(500, 'Erro ao salvar o arquivo');
      json(res, 200, { ok: true, name: finalName });
      notify(code);
    });
  });
  req.pipe(out);
}

function handleDownload(req, res, code, rawName, inline) {
  const name = cleanName(rawName);
  const file = name && path.join(codeDir(code), name);
  if (!file || !fs.existsSync(file)) return json(res, 404, { error: 'Arquivo não encontrado' });
  const st = fs.statSync(file);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': st.size,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const { pathname, searchParams } = url;

  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

  if (rateLimited(req.socket.remoteAddress)) return json(res, 429, { error: 'Muitas tentativas, aguarde um minuto' });

  const code = cleanCode(searchParams.get('code'));
  if (!code) return json(res, 400, { error: 'Código inválido (use de 4 a 64 letras ou números)' });
  const name = searchParams.get('name');

  if (pathname === '/api/files' && req.method === 'GET') return json(res, 200, listFiles(code));
  if (pathname === '/api/upload' && req.method === 'POST') return handleUpload(req, res, code, name);
  if (pathname === '/api/download' && req.method === 'GET') return handleDownload(req, res, code, name, searchParams.has('inline'));

  if (pathname === '/api/file' && req.method === 'DELETE') {
    const clean = cleanName(name);
    const file = clean && path.join(codeDir(code), clean);
    if (!file || !fs.existsSync(file)) return json(res, 404, { error: 'Arquivo não encontrado' });
    fs.rmSync(file);
    json(res, 200, { ok: true });
    return notify(code);
  }

  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(listFiles(code))}\n\n`);
    if (!listeners.has(code)) listeners.set(code, new Set());
    listeners.get(code).add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(ping);
      const set = listeners.get(code);
      set.delete(res);
      if (!set.size) listeners.delete(code);
    });
    return;
  }

  json(res, 404, { error: 'Rota desconhecida' });
});

server.requestTimeout = 0; // permite envios grandes e demorados

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Nexi Drive está rodando!\n');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  No celular:        http://${ip}:${PORT}`);
  console.log(`\n  Os arquivos ficam em: ${STORAGE}`);
  console.log('  (celular e computador precisam estar no mesmo Wi-Fi)\n');
  console.log('  Para parar: Ctrl+C\n');
});
