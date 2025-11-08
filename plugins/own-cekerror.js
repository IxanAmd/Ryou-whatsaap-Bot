// plugins/tools_plugin_errors.js
// .perror [nama-file.js] — cek error plugin (syntax/regex/export/metadata)

const fs = require('fs');
const path = require('path');

const PLUG_DIR = path.join(process.cwd(), 'plugins');
const MAX_TEXT = 3500; // biar gak kepotong WA

function listPluginFiles() {
  try {
    return fs.readdirSync(PLUG_DIR)
      .filter(f => f.endsWith('.js'))
      .map(f => ({ name: f, full: path.join(PLUG_DIR, f) }));
  } catch (e) {
    return [];
  }
}

function prettyErr(err) {
  if (!err) return 'Unknown error';
  // baris pertama saja agar singkat
  const s = (err.stack || String(err)).split('\n').slice(0, 3).join('\n');
  return s;
}

function validateHandler(mod) {
  const issues = [];
  if (typeof mod !== 'function') {
    issues.push('export bukan function (handler).');
    return issues;
  }
  // metadata opsional – beri warning saja
  if (typeof mod.command !== 'function') issues.push('property "command" tidak ada / bukan function.');
  if (!Array.isArray(mod.tags)) issues.push('property "tags" tidak ada / bukan array.');
  if (!Array.isArray(mod.help)) issues.push('property "help" tidak ada / bukan array.');
  if (mod.enabled === false) issues.push('plugin disabled (enabled=false).');
  return issues;
}

function checkOne(fileObj) {
  const { name, full } = fileObj;
  const res = { file: name, ok: false, errors: [], warnings: [] };

  try {
    // bersihkan cache agar selalu fresh
    try { delete require.cache[require.resolve(full)]; } catch {}
    const mod = require(full);

    // validasi bentuk export
    const issues = validateHandler(mod);
    if (issues.length) res.warnings.push(...issues);

    // uji ringan: panggil command() dengan dummy ctx (harus boolean)
    if (typeof mod === 'function' && typeof mod.command === 'function') {
      try {
        const dummy = { text: '.healthcheck' };
        const r = mod.command(dummy);
        if (typeof r !== 'boolean') {
          res.warnings.push('command() tidak mengembalikan boolean.');
        }
      } catch (e) {
        res.errors.push('Gagal eksekusi command(): ' + prettyErr(e));
      }
    }

    if (!res.errors.length) res.ok = true;
  } catch (e) {
    res.errors.push(prettyErr(e));
  }
  return res;
}

function buildReport(results, onlyErrors = false) {
  const oks = results.filter(r => r.ok);
  const errs = results.filter(r => r.errors.length);
  const warns = results.filter(r => !r.errors.length && r.warnings.length);

  const lines = [];
  lines.push('🧪 Hasil pemeriksaan plugin:');
  lines.push(`• Total file: ${results.length}`);
  lines.push(`• OK: ${oks.length}`);
  lines.push(`• Warning: ${warns.length}`);
  lines.push(`• Error: ${errs.length}`);
  lines.push('');

  const pushDetail = (arr, title, symbol) => {
    if (!arr.length) return;
    lines.push(title);
    for (const r of arr) {
      lines.push(`${symbol} ${r.file}`);
      if (r.errors && r.errors.length) {
        for (const e of r.errors) lines.push(`   ✖ ${e}`);
      }
      if (r.warnings && r.warnings.length) {
        for (const w of r.warnings) lines.push(`   • ${w}`);
      }
    }
    lines.push('');
  };

  pushDetail(errs, '⛔ Error:', '•');
  if (!onlyErrors) {
    pushDetail(warns, '⚠️ Warning:', '•');
    if (oks.length) lines.push('✅ OK:\n' + oks.map(r => '• ' + r.file).join('\n'));
  }

  return lines.join('\n').trim();
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](perror|pluginerror)(?:\s+(.+))?$/i);
  if (!m) return;

  const target = (m[2] || '').trim();
  const files = listPluginFiles();
  if (!files.length) return ctx.reply('Tidak menemukan folder/berkas plugin.');

  if (target) {
    const f = files.find(x => x.name.toLowerCase() === target.toLowerCase());
    if (!f) return ctx.reply(`File *${target}* tidak ditemukan di /plugins.`);
    const res = checkOne(f);
    const report = buildReport([res], false);
    return ctx.reply(report);
  }

  await ctx.reply('🔍 Memeriksa semua plugin...');
  const results = files.map(checkOne);
  const report = buildReport(results, true);

  if (report.length <= MAX_TEXT) {
    return ctx.reply(report);
  } else {
    // terlalu panjang – kirim sebagai file .txt
    const buf = Buffer.from(report, 'utf8');
    return ctx.client.sendMessage(ctx.from, {
      document: buf,
      mimetype: 'text/plain',
      fileName: 'plugin-check-report.txt',
      caption: 'Ringkasan terlalu panjang, lampiran berisi detail lengkap.'
    }, { quoted: ctx.message });
  }
}

// metadata (sesuai kerangka kamu)
handler.command  = (ctx) => /^[.!](perror|pluginerror)\b/i.test(ctx.text || '');
handler.role     = 'owner';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_plugin_errors';
handler.tags     = ['system', 'dev'];
handler.cost     = 0;
handler.help     = ['.perror', '.perror <nama-file.js>'];

module.exports = handler;