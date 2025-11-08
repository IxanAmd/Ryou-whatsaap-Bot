// plugins/pinsearch.js
// Cmd: .pin <kata kunci> / .pinterest <kata kunci>
// Ambil 5 gambar dari API: https://www.apis-anomaki.zone.id/search/pinsearch?query=...
// Biaya limit global: 2

const axios = require('axios');

const API_BASE = 'https://www.apis-anomaki.zone.id/search/pinsearch?query=';

function box(title, lines) {
  const top = `┌────《 ${title} 》───`;
  const body = (lines || []).map(l => `│ ${l}`).join('\n');
  const bot = `└────────────`;
  return [top, body, bot].join('\n');
}

function parseQuery(text = '') {
  const m = text.match(/^[.!](pin|pinterest)\s+(.+)/i);
  return m ? m[2].trim() : null;
}

function pickUrls(payload) {
  // Normalisasi berbagai kemungkinan struktur response
  const arr = Array.isArray(payload?.data) ? payload.data
           : Array.isArray(payload?.result) ? payload.result
           : Array.isArray(payload?.results) ? payload.results
           : Array.isArray(payload) ? payload
           : [];

  const urls = [];
  for (const it of arr) {
    if (!it) continue;
    const u = typeof it === 'string'
      ? it
      : it.url || it.image || it.img || it.link || it.thumbnail || it.media;
    if (u && /^https?:\/\//i.test(u)) urls.push(u);
  }
  // unik & bersih
  return [...new Set(urls)];
}

async function handler(ctx) {
  const q = parseQuery(ctx.text);
  if (!q) {
    return ctx.reply('❗ Link kata kunci?\nFormat: *.pin <kata kunci>*\nContoh: *.pin anime girl*');
  }

  await ctx.reply('🔎 Cari gambar di Pinterest…');

  try {
    const { data } = await axios.get(API_BASE + encodeURIComponent(q), { timeout: 25_000 });
    const urls = pickUrls(data);

    if (!urls.length) {
      return ctx.reply('⚠️ Tidak menemukan gambar yang cocok.');
    }

    const top5 = urls.slice(0, 5);

    const caption = box('PINTEREST', [
      `• Query : ${q}`,
      `• Hasil : ${top5.length} gambar`
    ]);

    let first = true;
    for (const u of top5) {
      await ctx.client.sendMessage(ctx.from, {
        image: { url: u },
        caption: first ? caption : ''
      });
      first = false;
    }
  } catch (e) {
    console.error('[pinsearch] error:', e?.message || e);
    await ctx.reply('❌ Gagal mengambil data dari API Pinterest.');
  }
}

handler.command  = /^[.!](pin|pinterest)(\s+|$)/i;
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags = ['search'];
handler.key      = 'pinsearch';
handler.nolimit  = false;
handler.cost     = 2;      // potong 2 limit global
handler.register = true;   // wajib sudah daftar/terverifikasi
handler.help     = ['.pin <kata kunci>', '.pinterest <kata kunci>'];

module.exports = handler;