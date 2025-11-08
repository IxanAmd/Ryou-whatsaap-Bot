// plugins/tools-remini.js
// .remini <url>  — atau reply/kirim gambar (otomatis upload ke Uguu lalu proses)

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
  if (q?.imageMessage) return q.imageMessage;       // prioritas reply
  if (root?.imageMessage) return root.imageMessage; // fallback: gambar di pesan ini
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
    timeout: 30000,
  });
  const f = data?.files?.[0];
  if (!f?.url) throw new Error('Upload gagal (Uguu).');
  return f.url;
}

function isUrl(s='') { return /^https?:\/\//i.test(String(s).trim()); }

// ── core ───────────────────────────────────────────
async function reminiProcess(imageUrl) {
  const api = `https://api-ai-hoshino.vercel.app/imagecreator/remini?url=${encodeURIComponent(imageUrl)}`;

  // Kita coba tangkap dua kemungkinan respons:
  // 1) langsung binary image
  // 2) JSON { url: "..." } atau { result: "..." }
  const res = await axios.get(api, {
    responseType: 'arraybuffer',
    timeout: 60_000
  });

  const ct = String(res.headers['content-type'] || '');
  // jika JSON, parse dan ambil url
  if (/json/i.test(ct)) {
    const text = Buffer.from(res.data).toString('utf8');
    let json = {};
    try { json = JSON.parse(text); } catch {}
    const outUrl = json.url || json.result || json.data?.url;
    if (!outUrl) throw new Error(json.message || 'Endpoint tidak mengembalikan gambar.');
    return { type: 'url', data: outUrl };
  }

  // jika image, kirim sebagai buffer
  if (/image\//i.test(ct)) {
    return { type: 'buffer', data: Buffer.from(res.data) };
  }

  // fallback: coba kirim saja sebagai buffer
  return { type: 'buffer', data: Buffer.from(res.data) };
}

// ── handler ────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]remini\b/i.test(txt)) return;

  try {
    // ambil arg url bila ada
    const arg = txt.replace(/^[.!]remini\b/i, '').trim();
    let imageUrl = isUrl(arg) ? arg : null;

    // jika tidak ada URL → ambil dari reply/kirim gambar
    if (!imageUrl) {
      const imgMsg = getImageMessage(ctx);
      if (!imgMsg) {
        return ctx.reply('Kirim/reply *gambar* dengan caption *.remini* atau pakai *.remini <url>*');
      }
      await ctx.reply('⏳ Upload gambar...');
      const buf = await bufferFromImageMessage(imgMsg);
      imageUrl = await uploadUguu(buf, 'remini.jpg');
    }

    await ctx.reply('🛠️ Memperjelas gambar (remini)...');
    const out = await reminiProcess(imageUrl);

    if (out.type === 'url') {
      await ctx.client.sendMessage(ctx.from, {
        image: { url: out.data },
        caption: '✅ Selesai (URL).'
      }, { quoted: ctx.message });
    } else {
      await ctx.client.sendMessage(ctx.from, {
        image: out.data,
        caption: '✅ Selesai.'
      }, { quoted: ctx.message });
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal remini: ${e?.message || e}`);
  }
}

// meta sesuai kerangka handler.js kamu
handler.command  = (ctx) => /^[.!]remini\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_remini';
handler.tags     = ['tools', 'ai'];
handler.cost     = 5; // pakai 5 limit per pemakaian
handler.help     = ['.remini (reply/kirim gambar)', '.remini <url>'];

module.exports = handler;