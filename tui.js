// email-info TUI — interactive terminal REPL with ANSI colors.
'use strict';

const readline = require('readline');
const { inspect } = require('./email-info.js');

const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = c('2');
const bold = c('1');
const red = c('31');
const green = c('32');
const yellow = c('33');
const cyan = c('36');
const magenta = c('35');

function badge(label, tone) {
  if (!useColor) return `[${label}]`;
  const color = { ok: '32', warn: '33', bad: '31', info: '36' }[tone] || '2';
  return `\x1b[${color}m\x1b[7m ${label} \x1b[0m`;
}

function boolBadge(v, { trueTone = 'bad', falseTone = 'ok', trueLabel, falseLabel } = {}) {
  if (v === true) return badge(trueLabel || 'yes', trueTone);
  if (v === false) return badge(falseLabel || 'no', falseTone);
  return badge('unknown', 'warn');
}

function kv(k, v) {
  return `  ${dim(k.padEnd(16))}${v}`;
}

function header(text) {
  return `\n${bold(cyan(text))}\n${dim('─'.repeat(text.length))}`;
}

function renderColored(r) {
  const out = [];
  out.push(header('Target'));
  out.push(kv('email', bold(r.email)));
  out.push(kv('syntax', r.valid_syntax ? badge('valid', 'ok') : badge('invalid', 'bad')));

  if (!r.valid_syntax) {
    for (const e of r.errors) out.push(kv('error', red(e)));
    return out.join('\n');
  }

  out.push(kv('local', r.local));
  out.push(kv('domain', r.domain));

  const flags = [
    boolBadge(r.is_free_provider, { trueTone: 'warn', falseTone: 'ok', trueLabel: 'free provider', falseLabel: 'custom domain' }),
    boolBadge(r.is_disposable, { trueTone: 'bad', falseTone: 'ok', trueLabel: 'disposable', falseLabel: 'not disposable' }),
    boolBadge(r.is_role_account, { trueTone: 'warn', falseTone: 'ok', trueLabel: 'role account', falseLabel: 'personal' }),
  ].join(' ');
  out.push(kv('flags', flags));

  const grav = r.gravatar_exists === true ? badge('has avatar', 'ok')
    : r.gravatar_exists === false ? badge('no avatar', 'warn')
    : badge('unknown', 'warn');
  out.push(kv('gravatar', `${grav} ${dim(r.gravatar_url)}`));

  out.push(header('DNS'));
  out.push(kv('MX', r.mx_records.length ? r.mx_records.join(', ') : dim('(none)')));
  out.push(kv('A', r.a_records.length ? r.a_records.join(', ') : dim('(none)')));
  if (r.aaaa_records.length) out.push(kv('AAAA', r.aaaa_records.join(', ')));
  if (r.ns_records.length) out.push(kv('NS', r.ns_records.join(', ')));

  out.push(header('Authentication'));

  const spfParts = [r.spf ? badge('present', 'ok') : badge('missing', 'warn')];
  if (r.spf_summary && r.spf_summary.qualifier) {
    const q = r.spf_summary.qualifier;
    const tone = q === '-all' ? 'ok' : q === '~all' ? 'warn' : 'bad';
    spfParts.push(badge(q, tone));
  }
  out.push(kv('SPF', spfParts.join(' ')));
  if (r.spf) out.push(kv('', dim(r.spf)));
  if (r.spf_summary && r.spf_summary.includes.length) {
    out.push(kv('  includes', dim(r.spf_summary.includes.join(', '))));
  }

  const dmarcParts = [r.dmarc ? badge('present', 'ok') : badge('missing', 'warn')];
  if (r.dmarc_summary && r.dmarc_summary.p) {
    const p = r.dmarc_summary.p;
    const tone = p === 'reject' ? 'ok' : p === 'quarantine' ? 'warn' : 'bad';
    dmarcParts.push(badge(`p=${p}`, tone));
  }
  out.push(kv('DMARC', dmarcParts.join(' ')));
  if (r.dmarc) out.push(kv('', dim(r.dmarc)));

  out.push(kv('BIMI', r.bimi ? badge('present', 'ok') : badge('none', 'warn')));
  out.push(kv('MTA-STS', r.mta_sts ? badge('advertised', 'ok') : badge('none', 'warn')));

  if (r.dkim_selectors.length) {
    out.push(header('DKIM selectors found'));
    for (const d of r.dkim_selectors) {
      const preview = d.record.length > 100 ? d.record.slice(0, 100) + '…' : d.record;
      out.push(kv(d.selector, dim(preview)));
    }
  } else {
    out.push(kv('DKIM', dim('(none of ~15 common selectors)')));
  }

  if (r.smtp_check) {
    out.push(header('SMTP probe'));
    const s = r.smtp_check;
    if (s.error) out.push(kv('error', red(s.error)));
    if (s.mx) out.push(kv('mx', s.mx));
    if (s.banner) out.push(kv('banner', dim(s.banner)));
    out.push(kv('starttls', s.starttls === true ? badge('advertised', 'ok')
      : s.starttls === false ? badge('not advertised', 'warn')
      : badge('unknown', 'warn')));
    if (s.target) {
      const tone = s.target.deliverable === true ? 'ok' : s.target.deliverable === false ? 'bad' : 'warn';
      out.push(kv('target RCPT', `${badge(String(s.target.code), tone)} ${dim(s.target.message)}`));
    }
    if (s.random_probe) {
      const tone = s.random_probe.deliverable === true ? 'warn' : s.random_probe.deliverable === false ? 'ok' : 'warn';
      out.push(kv('random RCPT', `${badge(String(s.random_probe.code), tone)} ${dim(s.random_probe.message)}`));
    }
    out.push(kv('catch-all', s.catch_all === true ? badge('yes', 'warn')
      : s.catch_all === false ? badge('no', 'ok')
      : badge('unknown', 'warn')));
  }

  return out.join('\n');
}

function printBanner(state) {
  const title = bold(magenta('  email-info TUI  '));
  const hint = dim('type an email, or ".help" for commands, Ctrl+D to quit');
  const mode = dim(`smtp=${state.smtp ? 'on' : 'off'}  json=${state.json ? 'on' : 'off'}`);
  process.stdout.write(`\n${title}\n${hint}\n${mode}\n\n`);
}

function printHelp() {
  const lines = [
    bold('commands'),
    `  ${green('<email>')}         inspect a single address`,
    `  ${green('.smtp on|off')}    toggle intrusive SMTP probe (default: off)`,
    `  ${green('.json')}           dump the next inspect result as JSON`,
    `  ${green('.clear')}          clear the screen`,
    `  ${green('.help')}           show this help`,
    `  ${green('.quit')}           exit (also Ctrl+D)`,
    '',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

async function handleLine(line, state, rl) {
  const input = line.trim();
  if (!input) return;

  if (input === '.quit' || input === '.exit') { rl.close(); return; }
  if (input === '.help') { printHelp(); return; }
  if (input === '.clear') { process.stdout.write('\x1b[2J\x1b[H'); printBanner(state); return; }
  if (input === '.json') { state.jsonOnce = true; process.stdout.write(dim('next result will be JSON\n')); return; }
  if (input.startsWith('.smtp')) {
    const arg = input.slice(5).trim();
    if (arg === 'on') state.smtp = true;
    else if (arg === 'off') state.smtp = false;
    else state.smtp = !state.smtp;
    process.stdout.write(dim(`smtp probe ${state.smtp ? 'on' : 'off'}\n`));
    return;
  }
  if (input.startsWith('.')) {
    process.stdout.write(red(`unknown command: ${input}\n`));
    return;
  }

  process.stdout.write(dim('looking up...\n'));
  try {
    const rep = await inspect(input, { doSmtp: state.smtp });
    if (state.jsonOnce) {
      state.jsonOnce = false;
      process.stdout.write(JSON.stringify(rep, null, 2) + '\n');
    } else {
      process.stdout.write(renderColored(rep) + '\n');
    }
  } catch (e) {
    process.stdout.write(red(`error: ${e.message || e}\n`));
  }
}

function runTui() {
  const state = { smtp: false, jsonOnce: false };
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: useColor ? `\x1b[35memail-info›\x1b[0m ` : 'email-info> ',
  });

  printBanner(state);
  rl.prompt();

  let queue = Promise.resolve();
  let closed = false;
  rl.on('line', (line) => {
    queue = queue
      .then(() => handleLine(line, state, rl))
      .then(() => { if (!closed) rl.prompt(); });
  });

  rl.on('close', () => {
    closed = true;
    queue.then(() => {
      process.stdout.write(dim('\nbye\n'));
      process.exit(0);
    });
  });
}

module.exports = { runTui, renderColored };

if (require.main === module) runTui();
