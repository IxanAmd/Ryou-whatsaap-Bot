// plugins/search-cosplaytele.js
// .cosplaytele <query> — cari gambar cosplay via NekoLabs
// Endpoint: https://api.nekolabs.my.id/discovery/cosplaytele/search?q=...

const axios = require('axios');

const API = 'https://api.nekolabs.my.id/discovery/cosplaytele/search?q=';

function isUrl(s='') { return /^https?:\/\//i.test(String(s)); }

function collectImageUrls(obj, limit = 5) {
  // ambil semua string yang mirip URL gambar dari objek JSON
  const urls = new Set();
  const stack = [obj];
  while (stack.length && urls.size < limit) {
    const cur = stack.pop();
    if (!cur) continue;
    if (Array.isArray(cur)) { stack.push(...cur); continue; }
    if (typeof cur === 'object') { stack.push(...Object.values(cur)); continue; }
    if (typeof cur === 'string') {
      const s = cur.trim();
      if (isUrl(s) && /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(s)) urls.add(s);
    }
  }
  return [...urls].slice(0, limit);
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](cosplaytele|cstele|cosplay)\s+(.+)/i);
  if (!m) return;
  const query = m[2].trim();
  if (!query) return ctx.reply('❗Format: *.cosplaytele <query>*\nContoh: *.cosplaytele Ryou*');

  try {
    await ctx.reply('🔎 Mencari cosplay...');
    const { data } = await axios.get(API + encodeURIComponent(query), { timeout: 25_000 });

    // Coba beberapa struktur umum: result, data, items, dll.
    const base = Array.isArray(data) ? data
               : Array.isArray(data?.result) ? data.result
               : Array.isArray(data?.data) ? data.data
               : Array.isArray(data?.items) ? data.items
               : data;

    const images = collectImageUrls(base, 5);
    if (!images.length) {
      return ctx.reply('⚠️ Tidak ada hasil cocok. Coba kata kunci lain.');
    }

    // kirim maksimal 5 gambar (satu per pesan biar aman)
    let sent = 0;
    for (const url of images) {
      await ctx.client.sendMessage(ctx.from, {
        image: { url },
        caption: `《 CosplayTele 》\n- Query: ${query}\n- Hasil ${++sent}/${images.length}`
      }, { quoted: ctx.message });
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal ambil data: ${e?.response?.status || ''} ${e?.message || e}`);
  }
}

// ── metadata (sesuai handler.js kamu) ──────────────
handler.command  = (ctx) => /^[.!](cosplaytele|cstele|cosplay)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'search_cosplaytele';
handler.tags     = ['search', 'image'];
handler.cost     = 2; // pakai 2 limit per pemakaian
handler.help     = ['.cosplaytele <query>', '.cstele <query>', '.cosplay <query>'];

module.exports = handler;