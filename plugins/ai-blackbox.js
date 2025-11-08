
const axios = require('axios');

async function handler(ctx) {
  const query = (ctx.text || '').trim();
  if (!query)
    return ctx.reply(`*• Example:* .bb [question]\n\n_Contoh:_\n.bb bagaimana cara kerja javascript?`);

  await ctx.reply('_🧠 Memproses pertanyaanmu... tunggu sebentar_');

  try {
    const { data } = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(query)}`);

    if (!data || !data.result)
      return ctx.reply('⚠️ Tidak ada jawaban ditemukan dari Blackbox AI.');

    await ctx.reply(`🧩 *BLACKBOX AI ANSWER:*\n\n${data.result}`);
  } catch (err) {
    await ctx.reply(`⚠️ Terjadi kesalahan: ${err.message}`);
  }
}

handler.command  = (ctx) => /^[.!/](bb|blackbox|kotakhitam|blekbok)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['ai'];
handler.key      = 'blackbox_ai';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.bb [question]', '.blackbox [question]'];

module.exports = handler;