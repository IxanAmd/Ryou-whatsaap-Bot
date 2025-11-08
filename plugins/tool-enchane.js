// plugins/tools-pxpic-enhance-neko.js
// .pxpic / .pxenhance — Enhance via NekoLabs PxPic
// Endpoint: https://api.nekolabs.my.id/tools/pxpic/enhance?imageUrl=...

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ── helpers ─────────────────────────────────────────
function unwrap(msg = {}) {
  if (msg?.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg?.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg?.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg?.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  if (msg?.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg || {};
}
function getImageMessage(ctx) {
  const root = unwrap(ctx.message?.message || {});
  const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage;
  const q = quoted ? unwrap(quoted) : null;
  if (q?.imageMessage) return q.imageMessage;       // prioritas reply
  if (root?.imageMessage) return root.imageMessage; // fallback: gambar di pesan ini
  return null;
}
async function bufferFromImageMessage(imgMsg) {
  const stream = await downloadContentFromMessage(imgMsg, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}
async function uploadUguu(buffer, filename = 'image.jpg') {
  const form = new FormData();
  form.append('files[]', buffer, { filename });
  const { data } = await axios.post('https://uguu.se/upload.php', form, {
    headers: form.getHeaders(),
    timeout: 30_000,
  });
  const f = data?.files?.[0];
  if (!f?.url) throw new Error('Upload gagal (Uguu).');
  return f.url;
}
function isUrl(s = '') { return /^https?:\/\//i.test(String(s).trim()); }

// ── core ───────────────────────────────────────────
async function pxpicEnhance(imageUrl) {
  const api = `https://api.nekolabs.my.id/tools/pxpic/enhance?imageUrl=${encodeURIComponent(imageUrl)}`;
  const res = await axios.get(api, { responseType: 'arraybuffer', timeout: 60_000 });
  if (res.status !== 200 || !res.data) throw new Error(`API status ${res.status}`);
  return Buffer.from(res.data);
}

// ── handler ────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](pxpic|pxenhance)\b/i.test(txt)) return;

  try {
    const arg = txt.replace(/^[.!](pxpic|pxenhance)\b/i, '').trim();
    let imageUrl = isUrl(arg) ? arg : null;

    if (!imageUrl) {
      const imgMsg = getImageMessage(ctx);
      if (!imgMsg) {
        return ctx.reply('Kirim/reply *gambar* dengan caption *.pxpic* / *.pxenhance* atau pakai *.pxpic <url>*');
      }
      await ctx.reply('⏳ Upload gambar...');
      const buf = await bufferFromImageMessage(imgMsg);
      imageUrl = await uploadUguu(buf, 'pxpic-enhance.jpg');
    }

    await ctx.reply('✨ Memproses (PxPic Enhance)...');
    const out = await pxpicEnhance(imageUrl);

    await ctx.client.sendMessage(ctx.from, {
      image: out,
      caption: '✅ Selesai (PxPic Enhance).'
    }, { quoted: ctx.message });

  } catch (e) {
    await ctx.reply(`❌ Gagal PxPic Enhance: ${e?.message || e}`);
  }
}

// ── metadata (sesuai handler.js kamu) ──────────────
handler.command  = (ctx) => /^[.!](pxpic|pxenhance)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_pxpic_enhance_neko';
handler.tags     = ['tools', 'ai'];
handler.cost     = 5; // potong 5 limit per pakai
handler.help     = ['.pxpic (reply/kirim gambar)', '.pxpic <url>', '.pxenhance (alias)'];

module.exports = handler;