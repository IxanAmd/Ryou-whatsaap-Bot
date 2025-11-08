// plugins/anime-layaranime-latest.js
// .layar [jumlah] / .anime-latest [jumlah] — ambil list anime terbaru dari LayarAnime API

const axios = require('axios');

const API = 'https://www.apis-anomaki.zone.id/anime/layaranime-latest';

// ambil array aman dari berbagai bentuk respons
function extractArray(j) {
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.result)) return j.result;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.list)) return j.list;
  // kadang { status:true, result:{ items:[...] } }
  if (Array.isArray(j?.result?.items)) return j.result.items;
  return [];
}

function normStr(x, def='-') {
  if (x === null || x === undefined) return def;
  const s = String(x).trim();
  return s.length ? s : def;
}

function formatLine(it, i) {
  // coba berbagai kemungkinan field nama & url
  const title = normStr(it.title || it.name || it.judul || it.anime_title || it?.anime?.title, '(tanpa judul)');
  const ep    = normStr(it.episode || it.ep || it.eps || it.episodeNumber || it.latest_ep || it?.anime?.episode, '-');
  const url   = normStr(
    it.url || it.link || it.page || it.permalink || it?.anime?.url || it?.detailUrl,
    '-'
  );

  const date  = it.date || it.update || it.released || it?.anime?.date || null;
  const dateLine = date ? ` | ${date}` : '';

  return `${i}. ${title}\n   Episode: ${ep}${dateLine}\n   Link   : ${url}`;
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](layar|anime\-latest|animelatest)(?:\s+(\d{1,3}))?$/i);
  if (!m) return;

  const limit = Math.max(1, Math.min(50, Number(m[2] || 10)));

  try {
    await ctx.reply('🔎 Mengambil anime terbaru...');
    const { data } = await axios.get(API, { timeout: 25_000 });

    const arr = extractArray(data);
    if (!arr.length) {
      return ctx.reply('⚠️ Tidak ada data terbaru yang bisa ditampilkan saat ini.');
    }

    const items = arr.slice(0, limit);
    const lines = items.map((it, idx) => formatLine(it, idx + 1));

    const head = `《 LayarAnime — Terbaru 》\n- Total: ${arr.length}\n- Tampil: ${items.length}\n`;
    const body = lines.join('\n\n');
    const msg = `${head}\n${body}\n\n• Tampilkan lebih banyak: *.layar ${Math.min(arr.length, 20)}*`;

    // kirim sebagai text (jika terlalu panjang, kirim sebagai dokumen txt)
    if (msg.length <= 3500) {
      await ctx.reply(msg);
    } else {
      const buf = Buffer.from(msg, 'utf8');
      await ctx.client.sendMessage(ctx.from, {
        document: buf,
        mimetype: 'text/plain',
        fileName: 'layaranime-latest.txt',
        caption: 'Daftar terbaru terlalu panjang, dikirim sebagai file.'
      }, { quoted: ctx.message });
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal ambil daftar: ${e?.response?.status ? `HTTP ${e.response.status}` : e?.message || e}`);
  }
}

// metadata sesuai kerangka kamu
handler.command  = (ctx) => /^[.!](layar|anime\-latest|animelatest)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'anime_layaranime_latest';
handler.tags     = ['anime', 'search'];
handler.cost     = 1; // pakai 1 limit per pemakaian
handler.help     = ['.layar [jumlah]', '.anime-latest [jumlah]'];

module.exports = handler;