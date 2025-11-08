// plugins/tools-morse.js
// .morse <teks> — encode teks ke Morse via api-ai-hoshino.vercel.app

const axios = require('axios');

// ── helpers ─────────────────────────────────────────
function unwrap(msg = {}) {
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}
function getRepliedText(ctx) {
  const root = unwrap(ctx.message?.message || {});
  const q = root?.extendedTextMessage?.contextInfo?.quotedMessage;
  return (
    q?.conversation ||
    q?.extendedTextMessage?.text ||
    ''
  )?.trim();
}
function box(title, lines = []) {
  const head = `《 ${title} 》`;
  return head + '\n' + lines.map(l => `- ${l}`).join('\n');
}

// ── core ───────────────────────────────────────────
async function textToMorse(text) {
  const api = `https://api-ai-hoshino.vercel.app/tools/texttomorse?text=${encodeURIComponent(text)}`;
  const { data } = await axios.get(api, { timeout: 20000 });
  // Normalisasi kemungkinan bentuk respons
  // Coba beberapa jalur umum: data.morse / data.result.morse / data.data.morse / data.output
  const morse =
    data?.morse ??
    data?.result?.morse ??
    data?.data?.morse ??
    data?.output ??
    null;
  if (!morse) throw new Error(data?.message || 'Gagal mengubah ke Morse.');
  return String(morse);
}

// ── handler ────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]morse\b/i.test(txt)) return;

  // Ambil argumen atau teks yang direply
  let arg = txt.replace(/^[.!]morse\b/i, '').trim();
  if (!arg) arg = getRepliedText(ctx);

  if (!arg) {
    return ctx.reply('❗Format: *.morse <teks>*\nAtau *reply* pesan teks lalu ketik *.morse*');
  }

  try {
    await ctx.reply('⏳ Mengonversi ke Morse...');
    const morse = await textToMorse(arg);

    const caption = box('Text → Morse', [
      `Teks  : ${arg}`,
      `Morse : ${morse}`
    ]);

    await ctx.reply(caption);
  } catch (e) {
    await ctx.reply(`❌ Gagal konversi: ${e?.response?.data?.message || e?.message || e}`);
  }
}

// ── metadata (sesuai handler.js kamu) ──────────────
handler.command  = (ctx) => /^[.!]morse\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_morse';
handler.tags     = ['tools'];
handler.cost     = 1; // potong 1 limit
handler.help     = ['.morse <teks> (atau reply teks)'];

module.exports = handler;