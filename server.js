#!/usr/bin/env node
// Minimal HTTP server exposing the email-info tool as a web UI + JSON API.

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const { inspect } = require('./email-info.js');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NO_OPEN = process.env.NO_OPEN === '1' || process.argv.includes('--no-open');

function openBrowser(target) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'cmd'
    : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '""', target] : [target];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => { /* browser unavailable; ignore */ });
    child.unref();
  } catch (_) { /* ignore */ }
}

const UI_PATH = path.join(__dirname, 'email-info.html');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(payload);
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 500, { error: 'file missing' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': data.length,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  const staticFiles = {
    '/':              path.join(__dirname, 'email-info.html'),
    '/index.html':    path.join(__dirname, 'index.html'),
    '/setup.html':    path.join(__dirname, 'setup.html'),
    '/email-info':    path.join(__dirname, 'email-info.html'),
  };

  if (req.method === 'GET' && staticFiles[parsed.pathname]) {
    return serveStatic(res, staticFiles[parsed.pathname]);
  }

  if (req.method === 'GET' && parsed.pathname === '/api/inspect') {
    const email = (parsed.query.email || '').trim();
    if (!email || email.length > 254) {
      return sendJson(res, 400, { error: 'missing or oversized "email" query param' });
    }
    const smtp = parsed.query.smtp === '1' || parsed.query.smtp === 'true';
    const sender = typeof parsed.query.sender === 'string' ? parsed.query.sender : undefined;
    try {
      const report = await inspect(email, { doSmtp: smtp, sender });
      return sendJson(res, 200, report);
    } catch (e) {
      const code = e.code || '';
      const hint = ['ECONNREFUSED', 'ESERVFAIL', 'ETIMEOUT'].includes(code)
        ? ' (DNS unreachable; try DNS_SERVERS=1.1.1.1,8.8.8.8 npm start)'
        : '';
      return sendJson(res, 500, { error: (e.message || String(e)) + hint });
    }
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  const origin = `http://${HOST}:${PORT}`;
  console.log(`email-info UI running at ${origin}`);
  if (!NO_OPEN) openBrowser(origin);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`port ${PORT} already in use; set PORT=<n> to pick another.`);
  } else {
    console.error(e.message);
  }
  process.exit(1);
});
