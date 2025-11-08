// plugins/delete_plugin.js
// Hapus plugin: .dp <nama>.js | .delplugin <nama>.js | .deleteplugin <nama>.js
// Khusus owner.

const fs = require('fs-extra');
const path = require('path');

function sanitizeName(name) {
  let n = String(name || '').trim();
  if (!n.endsWith('.js')) n += '.js';
  if (!/^[A-Za-z0-9_\-]+\.js$/.test(n)) return null;
  return n;
}

function simpleBox(title, lines = []) {
  const head = `《 ${title} 》`;
  const body = lines.map(l => `- ${l}`).join('\n');
  return `${head}\n${body}`;
}

async function handler(ctx) {
  const text = ctx.text || '';
  const m = text.match(/^[.!](?:dp|delplugin|deleteplugin)\s+(.+)$/i);

  // tanpa argumen → tampilkan daftar plugin
  if (!m) {
    try {
      const files = (await fs.readdir(__dirname)).filter(f => f.endsWith('.js')).slice(0, 60);
      return ctx.reply(
        simpleBox('DAFTAR PLUGINS', files.length ? files : ['(kosong)']) +
        `\n\nContoh: .dp ping_work.js`
      );
    } catch {
      return ctx.reply('❌ Tidak bisa membaca folder plugins.');
    }
  }

  const safe = sanitizeName(m[1]);
  if (!safe) return ctx.reply('❗Nama tidak valid. Gunakan huruf/angka/underscore/dash dan akhiri *.js*.\nContoh: *.dp getpp.js*');

  const target = path.join(__dirname, safe);
  const realPluginsDir = path.resolve(__dirname);
  const realTarget = path.resolve(target);
  if (!realTarget.startsWith(realPluginsDir)) {
    return ctx.reply('⛔ Path tidak valid.');
  }

  if (!(await fs.pathExists(realTarget))) {
    return ctx.reply(`⚠️ Plugin *${safe}* tidak ditemukan.`);
  }

  try {
    await fs.unlink(realTarget);
    await ctx.reply(
      simpleBox('DELETE PLUGIN', [
        `Nama   : ${safe}`,
        `Status : Berhasil dihapus`,
        `Info   : Loader akan otomatis reload`
      ])
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal menghapus *${safe}*.\nError: ${e.message}`);
  }
}

handler.command = /^[.!](dp|delplugin|deleteplugin)(\s+.+)?$/i;
handler.role = 'owner';
handler.scope = 'all';
handler.enabled = true;
handler.nolimit = true;
handler.key = 'delete_plugin';
handler.help = ['.dp <nama>.js', '.delplugin <nama>.js', '.deleteplugin <nama>.js'];

module.exports = handler;