// plugins/tools-feature-check.js
// .cekfitur — hitung berapa fitur yang pakai API dan yang tidak

const fs = require('fs');
const path = require('path');

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]cekfitur\b/i.test(txt)) return;

  try {
    const pluginsDir = path.join(__dirname); // sesuaikan kalau struktur plugin beda
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

    let withApi = 0;
    let withoutApi = 0;

    for (const file of files) {
      const content = fs.readFileSync(path.join(pluginsDir, file), 'utf8');
      if (/axios|fetch|node-fetch|https?:\/\//i.test(content)) {
        withApi++;
      } else {
        withoutApi++;
      }
    }

    const total = withApi + withoutApi;

    await ctx.reply(
      `📊 *Statistik Fitur Bot*\n\n` +
      `🔗 Pakai API eksternal : ${withApi}\n` +
      `📦 Lokal/offline       : ${withoutApi}\n` +
      `━━━━━━━━━━━━━━\n` +
      `📌 Total fitur terdeteksi: ${total}`
    );
  } catch (e) {
    await ctx.reply(`❌ Error cek fitur: ${e?.message || e}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!]cekfitur\b/i.test(ctx.text || '');
handler.role     = 'owner';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_feature_check';
handler.tags     = ['tools', 'owner'];
handler.cost     = 0;
handler.help     = ['.cekfitur'];

module.exports = handler;