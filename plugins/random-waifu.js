// plugins/random-waifu-neko.js
// .waifu / .randomwaifu — ambil gambar waifu random (direct image)

const axios = require('axios');

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](waifu|randomwaifu)\b/i.test(txt)) return;

  try {
    await ctx.reply('🎴 Mengambil waifu...');

    // ambil langsung gambar
    const res = await axios.get('https://api.nekolabs.my.id/random/waifuim/waifu', {
      responseType: 'arraybuffer',
      timeout: 20000,
    });

    const buffer = Buffer.from(res.data);

    await ctx.client.sendMessage(
      ctx.from,
      { image: buffer, caption: '✨ Waifu Random' },
      { quoted: ctx.message }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal ambil waifu: ${e?.message || e}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!](waifu|randomwaifu)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'random_waifu_neko';
handler.tags     = ['image', 'fun'];
handler.cost     = 1;
handler.help     = ['.waifu', '.randomwaifu'];

module.exports = handler;