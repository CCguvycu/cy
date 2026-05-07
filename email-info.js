#!/usr/bin/env node
// email-info — OSINT/recon CLI for a single email address.
// For authorized penetration testing and security assessments only.

'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const https = require('https');
const net = require('net');
const path = require('path');

const DOH_URL = process.env.DOH_URL || 'https://dns.google/resolve';
const FORCE_DOH = process.env.DOH === '1';

const EMAIL_RE =
  /^(?<local>[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@(?<domain>(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63})$/;

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

const ROLE_ACCOUNTS = new Set([
  'admin', 'administrator', 'info', 'support', 'help', 'helpdesk', 'sales',
  'marketing', 'contact', 'webmaster', 'postmaster', 'abuse', 'noreply',
  'no-reply', 'donotreply', 'do-not-reply', 'root', 'security', 'privacy',
  'legal', 'billing', 'accounts', 'hr', 'office', 'team', 'hello', 'hi',
  'mail', 'email', 'service', 'feedback', 'ops', 'operations', 'careers',
  'jobs', 'recruiting', 'partners', 'press', 'media',
]);

const DKIM_SELECTORS = [
  'default', 'google', 'selector1', 'selector2', 'k1', 'k2', 'mail', 'dkim',
  's1', 's2', 'smtp', 'mandrill', 'mxvault', 'sig1', 'protonmail',
];

const PUBLIC_DNS = (process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',').map((s) => s.trim()).filter(Boolean);

let _udpFallbackApplied = false;
if (process.env.DNS_SERVERS) {
  dns.setServers(PUBLIC_DNS);
  _udpFallbackApplied = true;
}

const NOT_FOUND = new Set(['ENOTFOUND', 'ENODATA', 'SERVFAIL', 'NXDOMAIN']);
const UNREACHABLE = new Set(['ECONNREFUSED', 'ESERVFAIL', 'ETIMEOUT', 'ECANCELLED', 'EREFUSED']);

const DOH_TYPE = { A: 1, AAAA: 28, MX: 15, TXT: 16, NS: 2 };

function dohQuery(name, type) {
  return new Promise((resolve, reject) => {
    const u = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${DOH_TYPE[type]}`;
    const req = https.get(u, { headers: { Accept: 'application/dns-json' }, timeout: 8000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.Status === 3) return resolve([]);
          if (j.Status !== 0 || !Array.isArray(j.Answer)) return resolve([]);
          const answers = j.Answer.filter((a) => a.type === DOH_TYPE[type]);
          if (type === 'MX') {
            return resolve(answers.map((a) => {
              const [prio, exch] = a.data.split(/\s+/, 2);
              return { priority: parseInt(prio, 10), exchange: (exch || '').replace(/\.$/, '') };
            }));
          }
          if (type === 'A' || type === 'AAAA') return resolve(answers.map((a) => a.data));
          if (type === 'NS') return resolve(answers.map((a) => a.data.replace(/\.$/, '')));
          if (type === 'TXT') {
            return resolve(answers.map((a) => a.data.replace(/"\s+"/g, '').replace(/^"|"$/g, '')));
          }
          resolve([]);
        } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('DoH timeout')));
    req.on('error', reject);
  });
}

async function resolveOnce(name, type) {
  if (type === 'MX') return dns.resolveMx(name);
  if (type === 'TXT') return (await dns.resolveTxt(name)).map((c) => c.join(''));
  if (type === 'A') return dns.resolve4(name);
  if (type === 'AAAA') return dns.resolve6(name);
  if (type === 'NS') return dns.resolveNs(name);
  return [];
}

async function safeResolve(name, type) {
  if (FORCE_DOH) {
    try { return await dohQuery(name, type); }
    catch (_) { return []; }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await resolveOnce(name, type);
    } catch (e) {
      if (NOT_FOUND.has(e.code)) return [];
      if (!_udpFallbackApplied && UNREACHABLE.has(e.code)) {
        dns.setServers(PUBLIC_DNS);
        _udpFallbackApplied = true;
        continue;
      }
      if (UNREACHABLE.has(e.code)) {
        try { return await dohQuery(name, type); }
        catch (_) { return []; }
      }
      throw e;
    }
  }
  return [];
}

function gravatarUrl(email) {
  const digest = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${digest}?d=404`;
}

function checkGravatar(email) {
  return new Promise((resolve) => {
    const digest = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    const req = https.request({
      method: 'HEAD',
      host: 'www.gravatar.com',
      path: `/avatar/${digest}?d=404`,
      timeout: 5000,
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function parseSpf(record) {
  const tokens = record.split(/\s+/).slice(1);
  const summary = { qualifier: null, includes: [], ip4: [], ip6: [], mechanisms: tokens.length };
  for (const t of tokens) {
    if (/^[-~+?]all$/.test(t)) summary.qualifier = t;
    else if (t.startsWith('include:')) summary.includes.push(t.slice(8));
    else if (t.startsWith('ip4:')) summary.ip4.push(t.slice(4));
    else if (t.startsWith('ip6:')) summary.ip6.push(t.slice(4));
  }
  return summary;
}

function parseDmarc(record) {
  const out = {};
  for (const p of record.split(';').map((s) => s.trim()).filter(Boolean)) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    out[p.slice(0, idx).trim().toLowerCase()] = p.slice(idx + 1).trim();
  }
  return out;
}

async function probeDkim(domain) {
  const results = await Promise.all(DKIM_SELECTORS.map(async (sel) => {
    const recs = await safeResolve(`${sel}._domainkey.${domain}`, 'TXT');
    const rec = recs.find((r) => r.toLowerCase().includes('v=dkim1')) || recs[0];
    return rec ? { selector: sel, record: rec } : null;
  }));
  return results.filter(Boolean);
}

function smtpProbe(emails, mxHost, sender, timeout = 10000) {
  return new Promise((resolve) => {
    const result = { mx: mxHost, banner: null, starttls: null, results: {}, error: null };
    const sock = net.createConnection({ host: mxHost, port: 25 });
    sock.setEncoding('utf8');
    sock.setTimeout(timeout);

    let buf = '';
    let phase = 'banner';
    const queue = [...emails];
    let currentEmail = null;
    let ehloCollectingStarttls = false;

    const finish = (error) => {
      try { sock.destroy(); } catch (_) { /* ignore */ }
      if (error) result.error = error;
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
        if (line.length < 4) continue;
        const sep = line[3];
        const code = parseInt(line.slice(0, 3), 10);
        const text = line.slice(4);

        if (sep === '-') {
          if (phase === 'ehlo' && /STARTTLS/i.test(text)) result.starttls = true;
          continue;
        }

        if (phase === 'banner') {
          if (code !== 220) return finish(`banner: ${line}`);
          result.banner = text;
          phase = 'ehlo';
          ehloCollectingStarttls = true;
          sock.write(`EHLO example.com\r\n`);
          continue;
        }
        if (phase === 'ehlo') {
          if (code !== 250) return finish(`EHLO: ${line}`);
          if (/STARTTLS/i.test(text)) result.starttls = true;
          else if (result.starttls !== true) result.starttls = false;
          ehloCollectingStarttls = false;
          phase = 'mail';
          sock.write(`MAIL FROM:<${sender}>\r\n`);
          continue;
        }
        if (phase === 'mail') {
          if (code >= 400) return finish(`MAIL FROM: ${line}`);
          currentEmail = queue.shift();
          phase = 'rcpt';
          sock.write(`RCPT TO:<${currentEmail}>\r\n`);
          continue;
        }
        if (phase === 'rcpt') {
          let deliverable = null;
          if (code === 250 || code === 251) deliverable = true;
          else if (code === 550 || code === 551 || code === 553) deliverable = false;
          result.results[currentEmail] = { code, message: text, deliverable };
          if (queue.length > 0) {
            currentEmail = queue.shift();
            sock.write(`RCPT TO:<${currentEmail}>\r\n`);
          } else {
            sock.write(`QUIT\r\n`);
            return finish();
          }
          continue;
        }
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
    is_role_account: null,
    gravatar_url: null,
    gravatar_exists: null,
    mx_records: [],
    a_records: [],
    aaaa_records: [],
    ns_records: [],
    spf: null,
    spf_summary: null,
    dmarc: null,
    dmarc_summary: null,
    bimi: null,
    mta_sts: null,
    dkim_selectors: [],
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
  report.is_role_account = ROLE_ACCOUNTS.has(report.local.toLowerCase());
  report.gravatar_url = gravatarUrl(email);

  const [mx, a, aaaa, ns, txt, dmarcTxt, mtaStsTxt, bimiTxt, dkim, gravatarExists] =
    await Promise.all([
      safeResolve(report.domain, 'MX'),
      safeResolve(report.domain, 'A'),
      safeResolve(report.domain, 'AAAA'),
      safeResolve(report.domain, 'NS'),
      safeResolve(report.domain, 'TXT'),
      safeResolve(`_dmarc.${report.domain}`, 'TXT'),
      safeResolve(`_mta-sts.${report.domain}`, 'TXT'),
      safeResolve(`default._bimi.${report.domain}`, 'TXT'),
      probeDkim(report.domain),
      checkGravatar(email),
    ]);

  mx.sort((a, b) => a.priority - b.priority);
  report.mx_records = mx.map((r) => `${r.priority} ${r.exchange}`);
  report.a_records = a;
  report.aaaa_records = aaaa;
  report.ns_records = ns;
  report.spf = txt.find((t) => t.toLowerCase().startsWith('v=spf1')) || null;
  if (report.spf) report.spf_summary = parseSpf(report.spf);
  report.dmarc = dmarcTxt.find((t) => t.toLowerCase().startsWith('v=dmarc1')) || null;
  if (report.dmarc) report.dmarc_summary = parseDmarc(report.dmarc);
  report.bimi = bimiTxt.find((t) => t.toLowerCase().startsWith('v=bimi1')) || null;
  report.mta_sts = mtaStsTxt.length > 0;
  report.dkim_selectors = dkim;
  report.gravatar_exists = gravatarExists;

  if (doSmtp) {
    if (report.mx_records.length === 0) {
      report.smtp_check = { error: 'no MX records' };
    } else {
      const topMx = mx[0].exchange;
      const randomLocal = `probe-${crypto.randomBytes(6).toString('hex')}`;
      const randomEmail = `${randomLocal}@${report.domain}`;
      const probe = await smtpProbe([email, randomEmail], topMx, sender);
      const target = probe.results[email];
      const random = probe.results[randomEmail];
      let catchAll = null;
      if (target && random) {
        if (target.deliverable === true && random.deliverable === true) catchAll = true;
        else if (target.deliverable === false && random.deliverable === false) catchAll = false;
      }
      report.smtp_check = {
        mx: probe.mx,
        banner: probe.banner,
        starttls: probe.starttls,
        target: target || null,
        random_probe: random || null,
        catch_all: catchAll,
        error: probe.error,
      };
    }
  }

  return report;
}

function renderText(r) {
  const lines = [];
  const push = (k, v) => lines.push(`${k.padEnd(16)}: ${v}`);
  push('email', r.email);
  push('valid syntax', r.valid_syntax);
  if (!r.valid_syntax) {
    for (const e of r.errors) lines.push(`  ! ${e}`);
    return lines.join('\n');
  }
  push('local / domain', `${r.local} / ${r.domain}`);
  push('free provider', r.is_free_provider);
  push('disposable', r.is_disposable);
  push('role account', r.is_role_account);
  push('gravatar url', r.gravatar_url);
  push('gravatar exists', r.gravatar_exists === null ? '(unknown)' : r.gravatar_exists);
  push('MX', r.mx_records.join(', ') || '(none)');
  push('A', r.a_records.join(', ') || '(none)');
  push('AAAA', r.aaaa_records.join(', ') || '(none)');
  push('NS', r.ns_records.join(', ') || '(none)');
  push('SPF', r.spf || '(none)');
  if (r.spf_summary) {
    push('  policy', r.spf_summary.qualifier || '(none)');
    push('  includes', r.spf_summary.includes.join(', ') || '(none)');
  }
  push('DMARC', r.dmarc || '(none)');
  if (r.dmarc_summary) {
    push('  p=', r.dmarc_summary.p || '(none)');
    if (r.dmarc_summary.sp) push('  sp=', r.dmarc_summary.sp);
    if (r.dmarc_summary.pct) push('  pct=', r.dmarc_summary.pct);
    if (r.dmarc_summary.rua) push('  rua=', r.dmarc_summary.rua);
  }
  push('BIMI', r.bimi || '(none)');
  push('MTA-STS TXT', r.mta_sts);
  if (r.dkim_selectors.length) {
    push('DKIM selectors', r.dkim_selectors.map((d) => d.selector).join(', '));
  } else {
    push('DKIM selectors', '(none of the common selectors)');
  }
  if (r.smtp_check) {
    lines.push('SMTP probe      :');
    const s = r.smtp_check;
    if (s.error) lines.push(`  error       : ${s.error}`);
    if (s.mx) lines.push(`  mx          : ${s.mx}`);
    if (s.banner) lines.push(`  banner      : ${s.banner}`);
    lines.push(`  starttls    : ${s.starttls === null ? '(unknown)' : s.starttls}`);
    if (s.target) lines.push(`  target      : ${s.target.code} ${s.target.deliverable} — ${s.target.message}`);
    if (s.random_probe) lines.push(`  random      : ${s.random_probe.code} ${s.random_probe.deliverable} — ${s.random_probe.message}`);
    lines.push(`  catch-all   : ${s.catch_all === null ? '(unknown)' : s.catch_all}`);
  }
  for (const e of r.errors) lines.push(`  ! ${e}`);
  return lines.join('\n');
}

function renderObsidian(r) {
  const date = new Date().toISOString();
  const lines = [];

  const tags = ['email-recon'];
  if (r.domain) tags.push(`domain/${r.domain}`);
  if (r.is_free_provider) tags.push('free-provider');
  if (r.is_disposable) tags.push('disposable');
  if (r.is_role_account) tags.push('role-account');

  lines.push('---');
  lines.push(`email: "${r.email}"`);
  if (r.domain) lines.push(`domain: ${r.domain}`);
  lines.push(`created: ${date}`);
  lines.push(`valid_syntax: ${r.valid_syntax}`);
  lines.push('tags:');
  for (const tag of tags) lines.push(`  - ${tag}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${r.email}`);
  lines.push('');

  if (!r.valid_syntax) {
    lines.push('> [!warning] Invalid Syntax');
    for (const e of r.errors) lines.push(`> ${e}`);
    return lines.join('\n');
  }

  lines.push('## Classification');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Free Provider | ${r.is_free_provider} |`);
  lines.push(`| Disposable | ${r.is_disposable} |`);
  lines.push(`| Role Account | ${r.is_role_account} |`);
  lines.push('');

  lines.push('## Identity');
  lines.push('');
  const gravatarStatus = r.gravatar_exists === null ? 'unknown' : r.gravatar_exists;
  lines.push(`- **Gravatar**: [avatar](${r.gravatar_url}) — exists: ${gravatarStatus}`);
  lines.push('');

  lines.push('## DNS Records');
  lines.push('');
  lines.push('### MX');
  if (r.mx_records.length) {
    for (const rec of r.mx_records) lines.push(`- ${rec}`);
  } else {
    lines.push('*(none)*');
  }
  lines.push('');
  lines.push('### A');
  if (r.a_records.length) {
    for (const rec of r.a_records) lines.push(`- ${rec}`);
  } else {
    lines.push('*(none)*');
  }
  lines.push('');
  if (r.aaaa_records && r.aaaa_records.length) {
    lines.push('### AAAA');
    for (const rec of r.aaaa_records) lines.push(`- ${rec}`);
    lines.push('');
  }
  lines.push('### NS');
  if (r.ns_records.length) {
    for (const rec of r.ns_records) lines.push(`- ${rec}`);
  } else {
    lines.push('*(none)*');
  }
  lines.push('');

  lines.push('## Email Authentication');
  lines.push('');
  lines.push('### SPF');
  if (r.spf) {
    lines.push('```');
    lines.push(r.spf);
    lines.push('```');
    if (r.spf_summary) {
      lines.push(`- **Policy**: ${r.spf_summary.qualifier || '(none)'}`);
      if (r.spf_summary.includes.length) lines.push(`- **Includes**: ${r.spf_summary.includes.join(', ')}`);
      if (r.spf_summary.ip4.length) lines.push(`- **IP4**: ${r.spf_summary.ip4.join(', ')}`);
      if (r.spf_summary.ip6.length) lines.push(`- **IP6**: ${r.spf_summary.ip6.join(', ')}`);
    }
  } else {
    lines.push('*(none)*');
  }
  lines.push('');
  lines.push('### DMARC');
  if (r.dmarc) {
    lines.push('```');
    lines.push(r.dmarc);
    lines.push('```');
    if (r.dmarc_summary) {
      if (r.dmarc_summary.p) lines.push(`- **Policy**: ${r.dmarc_summary.p}`);
      if (r.dmarc_summary.sp) lines.push(`- **Subdomain Policy**: ${r.dmarc_summary.sp}`);
      if (r.dmarc_summary.pct) lines.push(`- **Percentage**: ${r.dmarc_summary.pct}%`);
      if (r.dmarc_summary.rua) lines.push(`- **Report URI**: ${r.dmarc_summary.rua}`);
    }
  } else {
    lines.push('*(none)*');
  }
  lines.push('');
  lines.push('### DKIM');
  if (r.dkim_selectors && r.dkim_selectors.length) {
    for (const d of r.dkim_selectors) {
      const rec = d.record.length > 80 ? `${d.record.slice(0, 80)}…` : d.record;
      lines.push(`- **${d.selector}**: \`${rec}\``);
    }
  } else {
    lines.push('*(none of the common selectors matched)*');
  }
  lines.push('');
  lines.push('### BIMI');
  lines.push(r.bimi || '*(none)*');
  lines.push('');
  lines.push('### MTA-STS');
  lines.push(`${r.mta_sts}`);
  lines.push('');

  if (r.smtp_check) {
    lines.push('## SMTP Probe');
    lines.push('');
    const s = r.smtp_check;
    if (s.error) {
      lines.push(`> [!warning] Error: ${s.error}`);
    } else {
      if (s.mx) lines.push(`- **MX**: ${s.mx}`);
      if (s.banner) lines.push(`- **Banner**: ${s.banner}`);
      lines.push(`- **STARTTLS**: ${s.starttls === null ? 'unknown' : s.starttls}`);
      if (s.target) lines.push(`- **Deliverable**: ${s.target.deliverable} (${s.target.code} — ${s.target.message})`);
      if (s.random_probe) lines.push(`- **Random probe**: ${s.random_probe.deliverable} (${s.random_probe.code} — ${s.random_probe.message})`);
      lines.push(`- **Catch-all**: ${s.catch_all === null ? 'unknown' : s.catch_all}`);
    }
    lines.push('');
  }

  if (r.errors.length) {
    lines.push('## Errors');
    lines.push('');
    for (const e of r.errors) lines.push(`- ${e}`);
    lines.push('');
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const opts = { email: null, json: false, smtp: false, sender: 'probe@example.com', obsidian: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--smtp') opts.smtp = true;
    else if (a === '--sender') opts.sender = argv[++i];
    else if (a.startsWith('--sender=')) opts.sender = a.slice('--sender='.length);
    else if (a === '--obsidian') {
      const next = argv[i + 1];
      opts.obsidian = (next && !next.startsWith('-')) ? argv[++i] : '.';
    } else if (a.startsWith('--obsidian=')) opts.obsidian = a.slice('--obsidian='.length);
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
  --smtp            probe top MX with banner + RCPT TO + catch-all test
  --sender <addr>   MAIL FROM for the SMTP probe (default: probe@example.com)
  --json            emit JSON instead of text
  --obsidian [dir]  write a Markdown note to the given vault directory (default: .)
  -h, --help        show this help

Env:
  DOH=1                       force DNS-over-HTTPS for every lookup
  DOH_URL=<url>               DoH endpoint (default: https://dns.google/resolve)
  DNS_SERVERS=<csv>           override UDP DNS servers (e.g. 1.1.1.1,8.8.8.8)`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts || opts.help || !opts.email) {
    printHelp();
    process.exit(opts && opts.help ? 0 : 2);
  }
  const rep = await inspect(opts.email, { doSmtp: opts.smtp, sender: opts.sender });
  if (opts.obsidian !== null) {
    const filename = `${rep.email}.md`;
    const dest = path.resolve(opts.obsidian, filename);
    fs.writeFileSync(dest, renderObsidian(rep), 'utf8');
    console.error(`note written to ${dest}`);
  }
  console.log(opts.json ? JSON.stringify(rep, null, 2) : renderText(rep));
  process.exit(rep.valid_syntax ? 0 : 1);
}

module.exports = { inspect, renderText, renderObsidian, FREE_PROVIDERS, DISPOSABLE_PROVIDERS, ROLE_ACCOUNTS };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(2);
  });
}
