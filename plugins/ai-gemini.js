// plugins/gemini.js
// Gemini AI (via Hercai API) — ctx version
// Siap pakai untuk sistem bot modern

const axios = require('axios');

// Fungsi API Gemini
async function geminiAI(question) {
  try {
    const res = await axios.get(
      `https://hercai.onrender.com/gemini/hercai?question=${encodeURIComponent(question)}`,
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    return res.data?.reply || res.data?.result || 'Tidak ada respons.';
  } catch (err) {
    console.error('Gemini API Error:', err.message);
    return '❌ Gagal menghubungi server Gemini. Coba lagi nanti.';
  }
}

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  if (!text) {
    return ctx.reply(
      '✨ Halo! Ada yang bisa saya bantu?\n\nContoh: `.gemini Apa itu Node.js?`'
    );
  }

  const loadingImg = 'https://telegra.ph/file/e628941df62f8d0f8c5aa.png';
  const waitMsg = '⏳ Tunggu sebentar... Sedang memproses permintaan Anda.';

  // Kirim gambar loading
  const sent = await ctx.replyImage(loadingImg, waitMsg);

  // Panggil API Gemini
  const replyText = await geminiAI(text);

  // Edit balasan jadi hasil AI
  await ctx.client.sendMessage(ctx.from, {
    image: { url: loadingImg },
    caption: `✨ *Gemini AI*\n\n${replyText}`,
    edit: sent.key, // gunakan edit agar mengganti pesan loading
  });
}

// ==== Metadata handler ====
handler.command = (ctx) => /^[.!]gemini(ai)?\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'all';
handler.tags = ['ai'];
handler.key = 'gemini';
handler.enabled = true;
handler.premium = false;
handler.register = false;
handler.help = ['.gemini <pertanyaan>'];

module.exports = handler;