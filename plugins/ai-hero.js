// plugins/canvas-hero-pinkgreen.js
// .hero <url> atau reply/kirim gambar → proses via API NekoLabs brave-pink-hero-green

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// helpers
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
  if (q?.imageMessage) return q.imageMessage;
  if (root?.imageMessage) return root.imageMessage;
  return null;
}

async function bufferFromImageMessage(imgMsg) {
  const stream = await downloadContentFromMessage(imgMsg, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// upload to Uguu to get public URL
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

function isUrl(s='') {
  return /^https?:\/\//i.test(String(s).trim());
}

// handler
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]hero\b/i.test(txt)) return;

  try {
    const arg = txt.replace(/^[.!]hero\b/i, '').trim();
    let imageUrl = isUrl(arg) ? arg : null;

    if (!imageUrl) {
      const imgMsg = getImageMessage(ctx);
      if (!imgMsg) {
        return ctx.reply('Kirim/reply *gambar* dengan caption *.hero* atau *.hero <url>*');
      }
      await ctx.reply('⏳ Upload gambar...');
      const buf = await bufferFromImageMessage(imgMsg);
      imageUrl = await uploadUguu(buf, 'hero.jpg');
    }

    await ctx.reply('🎨 Memproses efek hero...');
    const api = `https://api.nekolabs.my.id/canvas/brave-pink-hero-green?imageUrl=${encodeURIComponent(imageUrl)}`;
    const res = await axios.get(api, { responseType: 'arraybuffer', timeout: 60000 });

    if (res.status !== 200 || !res.data) {
      throw new Error(`API status ${res.status}`);
    }

    const buffer = Buffer.from(res.data);
    await ctx.client.sendMessage(ctx.from, {
      image: buffer,
      caption: '✅ Selesai (Hero Pink–Green)'
    }, { quoted: ctx.message });

  } catch (e) {
    await ctx.reply(`❌ Gagal efek hero: ${e?.message || e}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!]hero\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'canvas_hero_pinkgreen';
handler.tags     = ['canvas'];
handler.cost     = 5;
handler.help     = ['.hero (reply/kirim gambar)', '.hero <url>'];

module.exports = handler;