#!/usr/bin/env node
// Minimal HTTP server exposing the email-info tool as a web UI + JSON API.

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const { inspect } = require('./email-info.js');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

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

function serveUi(res) {
  fs.readFile(UI_PATH, (err, data) => {
    if (err) {
      sendJson(res, 500, { error: 'UI missing' });
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

  if (req.method === 'GET' && (parsed.pathname === '/' || parsed.pathname === '/index.html')) {
    return serveUi(res);
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
      return sendJson(res, 500, { error: e.message || String(e) });
    }
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`email-info UI running at http://${HOST}:${PORT}`);
});
