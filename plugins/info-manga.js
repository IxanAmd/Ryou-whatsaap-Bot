const API = 'https://api.jikan.moe/v4/manga';
const FALLBACK_IMG = 'https://i.imgur.com/0Z8FQhK.png';

function safeJoin(arr, sep = '\n') {
  if (!Array.isArray(arr) || !arr.length) return '-';
  return arr.join(sep);
}
function clean(s) {
  if (!s) return '-';
  return String(s)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim();
  const m = txt.match(/^[.!](mangainfo|manga|infomanga)\b(?:\s+(.+))?/i);
  if (!m) return;

  const query = (m[2] || '').trim();
  if (!query) {
    return ctx.reply(
      '*Masukkan judul manga yang ingin kamu cari!*\n' +
      '• Contoh: *.manga vinland saga*\n' +
      '• Contoh: *.mangainfo one piece*'
    );
  }

  try {
    await ctx.reply('🔎 Sedang mencari manga...');

    const url = `${API}?q=${encodeURIComponent(query)}&limit=1&sfw`;
    const json = await fetchJson(url);

    if (!json?.data?.length) {
      return ctx.reply('❌ Tidak ditemukan.');
    }

    const d = json.data[0];

    const titles = Array.isArray(d.titles)
      ? d.titles.map(t => `${t.title} [${t.type || '-'}]`)
      : [d.title || '-'];

    const authors = Array.isArray(d.authors)
      ? d.authors.map(a => `${a?.name || '-'} (${a?.url || '-'})`)
      : [];

    const genres = Array.isArray(d.genres)
      ? d.genres.map(g => g?.name).filter(Boolean)
      : [];

    const imageUrl =
      d?.images?.jpg?.image_url ||
      d?.images?.webp?.image_url ||
      FALLBACK_IMG;

    const info =
`📚 *Title*
${safeJoin(titles)}

📑 *Chapters* : ${d.chapters ?? '-'}
✉️ *Type*     : ${d.type ?? '-'}
🗂 *Status*   : ${d.status ?? '-'}

😎 *Genre*
${safeJoin(genres)}

🗃 *Volumes*  : ${d.volumes ?? '-'}
🌟 *Favorite* : ${d.favorites ?? '-'}
🧮 *Score*    : ${d.score ?? '-'}
🧮 *Scored*   : ${d.scored ?? '-'}
🧮 *Scored By*: ${d.scored_by ?? '-'}

🌟 *Rank*     : ${d.rank ?? '-'}
🤩 *Popularity*: ${d.popularity ?? '-'}
👥 *Members*  : ${d.members ?? '-'}

⛓️ *URL*      : ${d.url || '-'}

👨‍🔬 *Authors*
${safeJoin(authors)}

📝 *Background*
${clean(d.background)}

💬 *Synopsis*
${clean(d.synopsis)}`;

    // kirim gambar + caption; fallback ke teks bila gagal
    try {
      await ctx.client.sendMessage(ctx.from, {
        image: { url: imageUrl },
        caption: `*MANGA INFO*\n${info}`
      });
    } catch {
      await ctx.reply(`*MANGA INFO*\n${info}`);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    await ctx.reply(`❌ Terjadi kesalahan.\n${msg}`);
  }
}

handler.command  = (ctx) => /^[.!](mangainfo|manga|infomanga)\b/i.test(String(ctx.text || ''));
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['anime'];
handler.key      = 'manga_info';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.manga <judul>', '.mangainfo <judul>', '.infomanga <judul>'];

module.exports = handler;