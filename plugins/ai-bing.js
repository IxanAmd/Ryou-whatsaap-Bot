// plugins/bingimg.js
// Pencarian gambar dari Bing (via API eksternal)
// versi ctx — clean & siap pakai

const axios = require('axios');

async function bingimgSearch(query) {
  try {
    const res = await axios.get(
      `https://restapi.apibotwa.biz.id/api/bingimg?message=${encodeURIComponent(query)}`
    );

    const data = res.data;
    if (data.status === 200 && data.data && data.data.response) {
      return data.data.response; // URL gambar hasil pencarian
    }
    return null;
  } catch (err) {
    console.error('Bing Image Search Error:', err.message);
    return null;
  }
}

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  if (!text) {
    return ctx.reply('❗ Masukkan kata kunci pencarian gambar.\n\nContoh: `.bingimg kucing lucu`');
  }

  await ctx.reply('🔎 Mencari gambar di Bing... Mohon tunggu sebentar.');

  const imageUrl = await bingimgSearch(text);

  if (imageUrl) {
    await ctx.replyImage(
      imageUrl,
      `📸 *Hasil pencarian gambar untuk:* ${text}`
    );
  } else {
    await ctx.reply('⚠️ Gambar tidak ditemukan untuk pencarian ini. Coba kata kunci lain.');
  }
}

// ==== metadata ====
handler.command = (ctx) => /^[.!]bingimg\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'all';
handler.tags = ['search'];
handler.key = 'bingimg';
handler.enabled = true;
handler.nolimit = false;
handler.help = ['.bingimg <kata kunci>'];

module.exports = handler;