// plugins/tools-unmorse.js
// .unmorse / .morsetotext — decode Morse → Text via api-ai-hoshino.vercel.app

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
async function morseToText(kode) {
  const url = `https://api-ai-hoshino.vercel.app/tools/morsetotext?kode=${encodeURIComponent(kode)}`;
  const { data } = await axios.get(url, { timeout: 20000 });

  // Coba beberapa kemungkinan struktur respons
  const text =
    data?.text ??
    data?.result?.text ??
    data?.data?.text ??
    data?.output ??
    null;

  if (!text) throw new Error(data?.message || 'Gagal mengubah Morse ke teks.');
  return String(text);
}

// ── handler ────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](unmorse|morsetotext)\b/i.test(txt)) return;

  // arg atau reply
  let arg = txt.replace(/^[.!](unmorse|morsetotext)\b/i, '').trim();
  if (!arg) arg = getRepliedText(ctx);

  if (!arg) {
    return ctx.reply('❗Format: *.unmorse <kode_morse>*\nContoh: *.unmorse --.*\nAtau *reply* pesan berisi kode Morse lalu ketik *.unmorse*');
  }

  try {
    await ctx.reply('⏳ Dekode Morse...');
    const plain = await morseToText(arg);

    const caption = box('Morse → Text', [
      `Morse : ${arg}`,
      `Teks  : ${plain}`
    ]);

    await ctx.reply(caption);
  } catch (e) {
    await ctx.reply(`❌ Gagal decode: ${e?.response?.data?.message || e?.message || e}`);
  }
}

// ── metadata (sesuai handler.js kamu) ──────────────
handler.command  = (ctx) => /^[.!](unmorse|morsetotext)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_unmorse';
handler.tags     = ['tools'];
handler.cost     = 1; // pakai 1 limit per pemakaian
handler.help     = ['.unmorse <kode_morse>', '.morsetotext <kode_morse> (atau reply)'];

module.exports = handler;