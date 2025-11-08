// plugins/ai-animagine.js
// .animagine <prompt>|<ratio> (contoh: .animagine Shiroko (blue archive)|16:9)

const axios = require('axios');

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]animagine\b/i.test(txt)) return;

  try {
    // ambil prompt dan ratio dari input
    const input = txt.replace(/^[.!]animagine\b/i, '').trim();
    if (!input) {
      return ctx.reply('❌ Prompt wajib diisi!\n\nContoh:\n.animagine Shiroko (blue archive)|16:9');
    }

    const [prompt, ratio = '1:1'] = input.split('|').map(v => v.trim());
    if (!prompt) {
      return ctx.reply('❌ Prompt tidak boleh kosong.');
    }

    await ctx.reply('🎨 Membuat gambar dengan Animagine...');

    // panggil API
    const api = `https://api.nekolabs.my.id/ai/animagine/xl-3.1?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;
    const res = await axios.get(api, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    });

    const buffer = Buffer.from(res.data);

    // kirim hasil
    await ctx.client.sendMessage(
      ctx.from,
      { image: buffer, caption: `✅ Animagine XL-3.1\n📌 Prompt: ${prompt}\n📐 Ratio: ${ratio}` },
      { quoted: ctx.message }
    );

  } catch (e) {
    await ctx.reply(`❌ Gagal generate gambar: ${e?.message || e}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!]animagine\b/i.test(ctx.text || '');
handler.role     = 'all';    // bebas, bisa free atau premium
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_animagine';
handler.tags     = ['ai', 'image'];
handler.cost     = 5;        // misal potong 5 limit
handler.help     = ['.animagine <prompt>|<ratio>'];

module.exports = handler;