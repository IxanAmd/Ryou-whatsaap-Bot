// plugins/snapcode.js
// .snapcode <kode> / .carbon <kode>
// Render code -> image via carbonara API

const axios = require('axios');

const API_URL = 'https://carbonara.solopov.dev/api/cook';

function getQuotedText(ctx) {
  try {
    const m = ctx.message?.message || {};
    const q =
      m?.extendedTextMessage?.contextInfo?.quotedMessage ||
      m?.imageMessage?.contextInfo?.quotedMessage ||
      m?.videoMessage?.contextInfo?.quotedMessage ||
      m?.documentMessage?.contextInfo?.quotedMessage ||
      m?.messageContextInfo?.quotedMessage ||
      null;

    if (!q) return null;
    // Ambil isi teks dari berbagai tipe
    return (
      q.conversation ||
      q.extendedTextMessage?.text ||
      q.imageMessage?.caption ||
      q.videoMessage?.caption ||
      q.documentMessage?.caption ||
      null
    );
  } catch { return null; }
}

function parseInput(text) {
  const m = String(text || '').match(/^[.!](snapcode|carbon)\b(?:\s+([\s\S]+))?$/i);
  return m ? (m[2] || '').trim() : '';
}

async function handler(ctx) {
  const typed = parseInput(ctx.text);
  const quoted = getQuotedText(ctx);
  const code = (typed || quoted || '').trim();

  if (!code) {
    return ctx.reply('❗Contoh: *.snapcode console.log("hello world")*\nAtau reply pesan kode lalu ketik *.snapcode*');
  }

  await ctx.reply('⏳ Membuat Snapcode...');

  try {
    const { data } = await axios.post(
      API_URL,
      { code },
      { responseType: 'arraybuffer', timeout: 25000, headers: { 'Content-Type': 'application/json' } }
    );

    const img = Buffer.from(data);
    await ctx.client.sendMessage(ctx.from, {
      image: img,
      caption: `《 Snapcode 》\n- Panjang: ${code.length} karakter\n- Siap disimpan ✅`
    });
  } catch (e) {
    console.error('[snapcode]', e?.response?.data || e?.message || e);
    await ctx.reply('❌ Gagal membuat Snapcode (API error / timeout).');
  }
}

handler.command  = (ctx) => /^[.!](snapcode|carbon)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'snapcode';
handler.tags     = ['maker'];
handler.cost     = 5;  
handler.register = true;    // wajib daftar
handler.help     = ['.snapcode <kode>', '.carbon <kode>'];

module.exports = handler;