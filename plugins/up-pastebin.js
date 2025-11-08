// plugins/tools_pastebin.js
// .uppastebin <text> — upload ke Pastebin

const axios = require('axios');

const API_KEY = 'AC5NX7WFZ03Jv8XxcFDDgIYNi5hxm8cf';
const API_URL = 'https://pastebin.com/api/api_post.php';

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!]uppastebin\s+([\s\S]+)/i);
  if (!m) return;

  const content = m[1];
  await ctx.reply('⏳ Membuat paste...');

  try {
    const params = new URLSearchParams();
    params.append('api_dev_key', API_KEY);
    params.append('api_option', 'paste');
    params.append('api_paste_code', content);

    const res = await axios.post(API_URL, params, { timeout: 30000 });
    const url = String(res.data || '');
    if (!/^https?:\/\//i.test(url)) throw new Error('Gagal membuat pastebin');

    await ctx.client.sendMessage(ctx.from, { text: `✅ Paste berhasil dibuat:\n${url}` }, { quoted: ctx.message });
  } catch (e) {
    await ctx.reply('❌ Terjadi error saat membuat paste. Coba lagi nanti.');
  }
}

handler.command  = (ctx) => /^[.!]uppastebin\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_pastebin';
handler.tags     = ['tools'];
handler.cost     = 1;
handler.help     = ['.uppastebin <teks>'];

module.exports = handler;