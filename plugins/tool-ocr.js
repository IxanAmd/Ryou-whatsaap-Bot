// plugins/tools-ocr.js
// .ocr — ekstrak teks dari gambar (Hoshino OCR API), support reply/kirim gambar ATAU .ocr <url>

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ── helpers ─────────────────────────────────────────
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
  // prioritas reply
  if (q?.imageMessage) return q.imageMessage;
  // fallback: gambar di pesan saat ini
  if (root?.imageMessage) return root.imageMessage;
  return null;
}

async function bufferFromImageMessage(imgMsg) {
  const stream = await downloadContentFromMessage(imgMsg, 'image');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadUguu(buffer, filename = 'image.jpg') {
  const form = new FormData();
  form.append('files[]', buffer, { filename });
  const { data } = await axios.post('https://uguu.se/upload.php', form, {
    headers: form.getHeaders(),
    timeout: 30000
  });
  const f = data?.files?.[0];
  if (!f?.url) throw new Error('Upload gagal (Uguu).');
  return f.url;
}

async function ocrByUrl(imageUrl) {
  const api = `https://api-ai-hoshino.vercel.app/tools/ocr?url=${encodeURIComponent(imageUrl)}`;
  const { data } = await axios.get(api, { timeout: 30000 });
  const text = data?.result?.text || data?.text || data?.result || '';
  if (!text || !String(text).trim()) throw new Error('Teks tidak terdeteksi.');
  return String(text).trim();
}

// ── handler ────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]ocr\b/i.test(txt)) return;

  try {
    // 1) coba pakai URL dari argumen
    let arg = txt.replace(/^[.!]ocr\b/i, '').trim();
    let imageUrl = arg && /^https?:\/\//i.test(arg) ? arg : null;

    // 2) kalau tidak ada URL ⇒ ambil gambar dari reply/kirim
    if (!imageUrl) {
      const imgMsg = getImageMessage(ctx);
      if (!imgMsg) return ctx.reply('Kirim/reply *gambar* dengan caption *.ocr* atau *.ocr <url>*');
      const buf = await bufferFromImageMessage(imgMsg);
      imageUrl = await uploadUguu(buf, 'ocr.jpg');
    }

    await ctx.reply('🔎 Membaca teks dari gambar...');
    const text = await ocrByUrl(imageUrl);

    const out =
`《 OCR Result 》
- Sumber : ${imageUrl}
- Hasil :
${text}`;

    await ctx.client.sendMessage(ctx.from, { text: out });
  } catch (e) {
    await ctx.reply(`❌ Gagal OCR: ${e?.message || e}`);
  }
}

// meta (sesuai kerangka handler.js kamu)
handler.command  = (ctx) => /^[.!]ocr\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_ocr';
handler.tags     = ['tools'];
handler.cost     = 2;
handler.help     = ['.ocr (reply/kirim gambar)', '.ocr <url>'];

module.exports = handler;