// plugins/saveplugins.js
// Owner-only: simpan kode plugin dari reply ke /plugins
// Perintah: .saveplugin <nama-file>.js  (alias: .sp <nama-file>.js)

const fs = require('fs-extra');
const path = require('path');

// --- ambil teks dari pesan yang di-reply (quoted) ---
function pickQuotedText(message) {
  const ci = message?.message?.extendedTextMessage?.contextInfo;
  const q = ci?.quotedMessage || {};
  const raw =
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    q.documentMessage?.caption ||
    q.documentWithCaptionMessage?.message?.caption ||
    '';
  if (!raw) return '';

  // ambil isi dalam code block ```...``` bila ada
  const m1 = raw.match(/```[\s\S]*?\n([\s\S]*?)```/); // dengan deklarasi bahasa
  const m2 = raw.match(/```([\s\S]*?)```/);           // tanpa deklarasi
  if (m1 && m1[1]) return m1[1].trim();
  if (m2 && m2[1]) return m2[1].trim();
  return raw.trim();
}

// --- validasi & sanitasi nama file ---
function sanitizeFilename(name) {
  let n = (name || '').trim();
  if (!n) return null;
  if (!/\.js$/i.test(n)) n += '.js';
  // hanya huruf, angka, titik, minus, underscore
  if (!/^[a-zA-Z0-9._-]+\.js$/.test(n)) return null;
  if (n.startsWith('.') || n.includes('..')) return null;
  return n;
}

function timestamp() {
  const d = new Date();
  const pad = s => String(s).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function handler(ctx) {
  // Hanya owner; handler global akan menolak selain owner dengan image, tapi kita guard lagi biar aman
  if (ctx.role !== 'owner') {
    return; // biarkan handler global yang kasih pesan deny
  }

  const text = (ctx.text || '').trim();
  const m = text.match(/^(?:\.saveplugin|\.sp)\s+([^\s]+)$/i);
  if (!m) {
    return ctx.reply(
`💾 SAVE PLUGIN (Owner)
Perintah:
  .saveplugin <nama-file>.js   (reply ke pesan berisi kode)
Alias:
  .sp <nama-file>.js

Contoh:
  .sp menu-help.js   ← reply ke kode plugin`
    );
  }

  const rawName = m[1];
  const fname = sanitizeFilename(rawName);
  if (!fname) {
    return ctx.reply(
`⚠️ Nama file tidak valid.
Gunakan huruf/angka/._- dan akhiri dengan .js
Contoh: my-plugin.js, menu_help.js

Input: ${rawName}`
    );
  }

  const code = pickQuotedText(ctx.message);
  if (!code) {
    return ctx.reply(
`❗ Tidak ada kode pada pesan yang di-reply.
Silakan reply pesan yang berisi kode.
Boleh pakai \`\`\`code block\`\`\` atau teks biasa.

File: ${fname}`
    );
  }

  try {
    const pluginsDir = path.join(__dirname);         // folder ini adalah /plugins
    const rootDir = path.join(pluginsDir, '..', 'plugins'); // jaga kalau dipindah
    const targetDir = fs.existsSync(rootDir) ? rootDir : pluginsDir;

    await fs.ensureDir(targetDir);

    const target = path.join(targetDir, fname);
    // Anti path traversal: pastikan path dimulai dari targetDir
    const safe = path.normalize(target);
    if (!safe.startsWith(path.normalize(targetDir))) {
      return ctx.reply(`🚫 Nama file berbahaya (path traversal terdeteksi).`);
    }

    let mode = 'create';
    if (await fs.pathExists(safe)) {
      const bak = safe.replace(/\.js$/i, `.${timestamp()}.bak.js`);
      await fs.copy(safe, bak);
      mode = 'overwrite (backup dibuat)';
    }

    await fs.writeFile(safe, code, 'utf8');
    const stat = await fs.stat(safe);

    // optional: sentuh mtime supaya watcher mendeteksi
    try { await fs.utimes(safe, new Date(), new Date()); } catch {}

    await ctx.reply(
`✅ Plugin tersimpan
Nama : ${fname}
Size : ${stat.size} bytes
Mode : ${mode}

${ctx.groupName ? `Group: ${ctx.groupName}` : ''}`.trim()
    );

  } catch (e) {
    await ctx.reply(
`❌ Gagal menyimpan plugin
File : ${fname}
Error: ${String(e?.message || e).slice(0,200)}`
    );
  }
}

/* ===== Metadata ===== */
handler.tag = ['owner','dev','file'];
handler.help = ['.saveplugin <nama-file>.js  (reply ke kode)', '.sp <nama-file>.js'];
handler.command = /^(?:\.saveplugin|\.sp)\s+[^\s]+$/i;
handler.role = 'owner';     // khusus Owner
handler.scope = 'all';      // private & group
handler.premium = false;
handler.key = 'saveplugins';
handler.enabled = true;
handler.nolimit = true;     // tidak mengurangi limit

module.exports = handler;