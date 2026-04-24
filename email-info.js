#!/usr/bin/env node
// email-info — OSINT/recon CLI for a single email address.
// For authorized penetration testing and security assessments only.

'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const EMAIL_RE =
  /^(?<local>[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+)@(?<domain>(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63})$/;

const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com',
  'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.de',
  'zoho.com', 'yandex.com', 'yandex.ru', 'mail.ru', 'tutanota.com',
  'fastmail.com', 'hey.com',
]);

const DISPOSABLE_PROVIDERS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'throwaway.email', 'yopmail.com', 'dispostable.com',
  'trashmail.com', 'sharklasers.com', 'getnada.com', 'maildrop.cc',
  'mohmal.com', 'mailnesia.com', 'fakeinbox.com', 'mintemail.com',
  'mailtm.com', 'mail.tm', '1secmail.com', '1secmail.net', '1secmail.org',
  'emailondeck.com', 'burnermail.io', 'tempr.email', 'inboxbear.com',
]);

async function safeResolve(name, type) {
  try {
    if (type === 'MX') return await dns.resolveMx(name);
    if (type === 'TXT') return (await dns.resolveTxt(name)).map((c) => c.join(''));
    if (type === 'A') return await dns.resolve4(name);
  } catch (e) {
    if (['ENOTFOUND', 'ENODATA', 'SERVFAIL', 'NXDOMAIN'].includes(e.code)) return [];
    throw e;
  }
  return [];
}

function gravatarUrl(email) {
  const digest = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${digest}?d=404`;
}

function smtpProbe(email, mxHost, sender, timeout = 10000) {
  return new Promise((resolve) => {
    const result = { mx: mxHost, deliverable: null, code: null, message: null };
    const sock = net.createConnection({ host: mxHost, port: 25 });
    sock.setEncoding('utf8');
    sock.setTimeout(timeout);

    let buf = '';
    let step = 0;
    const steps = [
      `EHLO example.com\r\n`,
      `MAIL FROM:<${sender}>\r\n`,
      `RCPT TO:<${email}>\r\n`,
      `QUIT\r\n`,
    ];

    const finish = (msg) => {
      try { sock.destroy(); } catch (_) { /* ignore */ }
      if (msg) result.message = msg;
      resolve(result);
    };

    sock.on('timeout', () => finish('timeout'));
    sock.on('error', (e) => finish(`${e.code || e.name}: ${e.message}`));
    sock.on('data', (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (line.length < 4 || line[3] === '-') continue; // multiline continuation
        const code = parseInt(line.slice(0, 3), 10);
        const text = line.slice(4);
        if (step === 0 && code !== 220) return finish(`banner: ${line}`);
        if (step === 3) {
          // after RCPT response
          result.code = code;
          result.message = text;
          if (code === 250 || code === 251) result.deliverable = true;
          else if (code === 550 || code === 551 || code === 553) result.deliverable = false;
          sock.write(steps[3]);
          return finish();
        }
        sock.write(steps[step]);
        step++;
      }
    });
  });
}

async function inspect(email, { doSmtp = false, sender = 'probe@example.com' } = {}) {
  const report = {
    email,
    valid_syntax: false,
    local: null,
    domain: null,
    is_free_provider: null,
    is_disposable: null,
    gravatar_url: null,
    mx_records: [],
    a_records: [],
    spf: null,
    dmarc: null,
    mta_sts: null,
    smtp_check: null,
    errors: [],
  };

  const m = EMAIL_RE.exec(email);
  if (!m) {
    report.errors.push('invalid RFC-5322-ish syntax');
    return report;
  }

  report.valid_syntax = true;
  report.local = m.groups.local;
  report.domain = m.groups.domain.toLowerCase();
  report.is_free_provider = FREE_PROVIDERS.has(report.domain);
  report.is_disposable = DISPOSABLE_PROVIDERS.has(report.domain);
  report.gravatar_url = gravatarUrl(email);

  const mx = await safeResolve(report.domain, 'MX');
  mx.sort((a, b) => a.priority - b.priority);
  report.mx_records = mx.map((r) => `${r.priority} ${r.exchange}`);
  report.a_records = await safeResolve(report.domain, 'A');

  const txt = await safeResolve(report.domain, 'TXT');
  report.spf = txt.find((t) => t.toLowerCase().startsWith('v=spf1')) || null;

  const dmarcTxt = await safeResolve(`_dmarc.${report.domain}`, 'TXT');
  report.dmarc = dmarcTxt.find((t) => t.toLowerCase().startsWith('v=dmarc1')) || null;

  const mtaSts = await safeResolve(`_mta-sts.${report.domain}`, 'TXT');
  report.mta_sts = mtaSts.length > 0;

  if (doSmtp) {
    if (report.mx_records.length === 0) {
      report.smtp_check = { error: 'no MX records' };
    } else {
      const topMx = mx[0].exchange;
      report.smtp_check = await smtpProbe(email, topMx, sender);
    }
  }

  return report;
}

function renderText(r) {
  const lines = [];
  lines.push(`email          : ${r.email}`);
  lines.push(`valid syntax   : ${r.valid_syntax}`);
  if (!r.valid_syntax) {
    for (const e of r.errors) lines.push(`  ! ${e}`);
    return lines.join('\n');
  }
  lines.push(`local / domain : ${r.local} / ${r.domain}`);
  lines.push(`free provider  : ${r.is_free_provider}`);
  lines.push(`disposable     : ${r.is_disposable}`);
  lines.push(`gravatar probe : ${r.gravatar_url}`);
  lines.push(`MX records     : ${r.mx_records.join(', ') || '(none)'}`);
  lines.push(`A records      : ${r.a_records.join(', ') || '(none)'}`);
  lines.push(`SPF            : ${r.spf || '(none)'}`);
  lines.push(`DMARC          : ${r.dmarc || '(none)'}`);
  lines.push(`MTA-STS TXT    : ${r.mta_sts}`);
  if (r.smtp_check) {
    lines.push('SMTP probe     :');
    for (const [k, v] of Object.entries(r.smtp_check)) {
      lines.push(`  ${k.padEnd(12)}: ${v}`);
    }
  }
  for (const e of r.errors) lines.push(`  ! ${e}`);
  return lines.join('\n');
}

function parseArgs(argv) {
  const opts = { email: null, json: false, smtp: false, sender: 'probe@example.com', help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--smtp') opts.smtp = true;
    else if (a === '--sender') opts.sender = argv[++i];
    else if (a.startsWith('--sender=')) opts.sender = a.slice('--sender='.length);
    else if (!a.startsWith('-') && !opts.email) opts.email = a;
    else {
      console.error(`unknown argument: ${a}`);
      return null;
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: email-info [options] <email>

Gather recon info about an email address (authorized testing only).

Options:
  --smtp            probe top MX with RCPT TO (intrusive)
  --sender <addr>   MAIL FROM for the SMTP probe (default: probe@example.com)
  --json            emit JSON instead of text
  -h, --help        show this help`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts || opts.help || !opts.email) {
    printHelp();
    process.exit(opts && opts.help ? 0 : 2);
  }
  const rep = await inspect(opts.email, { doSmtp: opts.smtp, sender: opts.sender });
  console.log(opts.json ? JSON.stringify(rep, null, 2) : renderText(rep));
  process.exit(rep.valid_syntax ? 0 : 1);
}

module.exports = { inspect, renderText, FREE_PROVIDERS, DISPOSABLE_PROVIDERS };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(2);
  });
}
