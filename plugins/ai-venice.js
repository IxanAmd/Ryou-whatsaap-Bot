// plugins/ai-venice.js
// .venice <prompt> — kirim prompt ke API Venice dari nekolabs

const axios = require('axios');
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
const m = txt.match(/^[.!]venice\s*(.*)/i);
if (!m || !m[1].trim()) {
  return ctx.reply('❗Silakan isi prompt.\n\nContoh: `.venice Eh kamu ai?`');
}
const prompt = m[1].trim();
  try {
    await ctx.reply('⏳ Menghubungi API Venice...');
    const url = `https://api.nekolabs.my.id/ai/venice?text=${encodeURIComponent(prompt)}`;
    const { data } = await axios.get(url, { timeout: 30000 });

    // Kalau API kembalikan JSON dengan properti tertentu
    // Coba beberapa kemungkinan
    let replyText = null;
    if (data.result) replyText = data.result;
    else if (data.message) replyText = data.message;
    else replyText = JSON.stringify(data);

    await ctx.reply(replyText);
  } catch (e) {
    await ctx.reply(`❌ Gagal venice: ${e?.message || e}`);
  }
}

// metadata agar plugin bisa dikenali
handler.command = (ctx) => /^[.!]venice\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'ai_venice';
handler.tags = ['ai'];
handler.cost = 4;  // misal potong 4 limit
handler.help = ['.venice <prompt>'];

module.exports = handler;