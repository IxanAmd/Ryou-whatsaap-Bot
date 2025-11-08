// plugins/random-maid-neko.js
// .maid / .randommaid — ambil gambar maid waifu random (direct image)

const axios = require('axios');

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](maid|randommaid)\b/i.test(txt)) return;

  try {
    await ctx.reply('🎴 Mengambil maid waifu...');

    const res = await axios.get('https://api.nekolabs.my.id/random/waifuim/maid', {
      responseType: 'arraybuffer',
      timeout: 20000,
    });

    const buffer = Buffer.from(res.data);

    await ctx.client.sendMessage(
      ctx.from,
      { image: buffer, caption: '✨ Maid Waifu Random' },
      { quoted: ctx.message }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal ambil maid waifu: ${e?.message || e}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!](maid|randommaid)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'random_waifu_maid';
handler.tags     = ['image', 'fun'];
handler.cost     = 1;
handler.help     = ['.maid', '.randommaid'];

module.exports = handler;