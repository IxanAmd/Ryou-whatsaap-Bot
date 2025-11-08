// plugins/ai-editimg-nanobanana.js
// .editimg <prompt> — reply/kirim gambar, proses via Nano Banana (Photogpt)

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { img2img } = require('../lib/nano-banana');

// --- helpers -------------------------------------------------
function unwrap(msg = {}) {
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}
function getImageMessage(ctx) {
  const root = unwrap(ctx.message?.message || {});
  const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage;
  const q = quoted ? unwrap(quoted) : null;
  if (q?.imageMessage) return q.imageMessage;       // prioritas: reply
  if (root?.imageMessage) return root.imageMessage; // fallback: gambar di pesan ini
  return null;
}
async function bufferFromImageMessage(imgMsg) {
  const stream = await downloadContentFromMessage(imgMsg, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// --- handler -------------------------------------------------
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]editimg\b/i.test(txt)) return;

  // Wajib prompt
  const input = txt.replace(/^[.!]editimg\b/i, '').trim();
  if (!input) return ctx.reply('❗Prompt wajib diisi.\nContoh: *.editimg* rambut jadi ungu, efek bokeh');

  try {
    const imgMsg = getImageMessage(ctx);
    if (!imgMsg) return ctx.reply('Kirim/reply *gambar* lalu tulis: *.editimg <prompt>*');

    await ctx.reply('🧪 Memproses gambar... (± beberapa detik)');

    const buf = await bufferFromImageMessage(imgMsg);
    const out = await img2img(buf, input);

    await ctx.client.sendMessage(
      ctx.from,
      { image: out, caption: `✅ Selesai.\nPrompt: ${input}` },
      { quoted: ctx.message }
    );
  } catch (e) {
    // error umum yang sering muncul di service ini
    const msg = String(e?.message || e);
    if (/403/i.test(msg)) return ctx.reply('❌ Ditolak server (403). Coba lagi beberapa saat.');
    if (/timeout|ETIMEDOUT|ENETUNREACH|ECONN|aborted/i.test(msg)) return ctx.reply('❌ Jaringan/API timeout. Coba ulang.');
    return ctx.reply(`❌ Gagal edit gambar: ${msg}`);
  }
}

// metadata sesuai kerangka handler.js kamu
handler.command  = (ctx) => /^[.!]editimg\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_editimg_nanobanana';
handler.tags     = ['ai', 'image'];
handler.cost     = 10; // potong 10 limit per pemakaian
handler.help     = ['.editimg <prompt> (reply/kirim gambar)'];

module.exports = handler;