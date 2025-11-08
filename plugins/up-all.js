// plugins/tools_tourlcloud.js
// .tourl — upload ke beberapa server (best-effort)

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getAnyBuffer(ctx) {
  const root = ctx.message?.message || {};
  const q = root?.extendedTextMessage?.contextInfo?.quotedMessage || root;
  const cand = q?.documentMessage || q?.imageMessage || q?.videoMessage || q?.audioMessage || null;
  if (!cand) return null;

  const type =
    q?.documentMessage ? 'document' :
    q?.imageMessage    ? 'image' :
    q?.videoMessage    ? 'video' : 'audio';

  const stream = await downloadContentFromMessage(cand, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buffer = Buffer.concat(chunks);
  const mime = cand?.mimetype || 'application/octet-stream';
  let ext = 'bin';
  const sp = mime.split('/');
  if (sp[1]) ext = sp[1].split(';')[0];
  return { buffer, mime, ext };
}

async function uploadTo(url, field, filename, buffer, mime) {
  const form = new FormData();
  form.append(field, buffer, { filename, contentType: mime });
  try {
    const { data } = await axios.post(url, form, { headers: form.getHeaders(), timeout: 60000, validateStatus: () => true });
    // Normalisasi beberapa kemungkinan response
    if (data?.status === 'success' && data?.data?.url) return data.data.url;
    if (data?.url) return data.url;
    if (typeof data === 'string' && /^https?:\/\//i.test(data)) return data;
    return null;
  } catch {
    return null;
  }
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](tourl|url)\b/i.test(txt)) return;

  const got = await getAnyBuffer(ctx);
  if (!got) return ctx.reply('Balas pesan yang berisi *file atau media*.');

  await ctx.reply('☁️ Upload ke beberapa server...');
  const name = `upload.${got.ext}`;

  const uploads = [];
  const u1 = await uploadTo('https://phpstack-1487948-5667813.cloudwaysapps.com/upload.php', 'file', name, got.buffer, got.mime);
  if (u1) uploads.push(['Cloudku Stack', u1]);

  const u2 = await uploadTo('https://cloudkuimages.guru/upload.php', 'file', name, got.buffer, got.mime);
  if (u2) uploads.push(['Cloudku Guru', u2]);

  const u3 = await uploadTo('https://cloudkuimages.com/upload.php', 'file', name, got.buffer, got.mime);
  if (u3) uploads.push(['Cloudku Images', u3]);

  if (!uploads.length) return ctx.reply('Gagal mengunggah ke semua server. Coba lagi nanti.');

  const lines = uploads.map(([n,u]) => `• ${n}\n  ${u}`).join('\n\n');
  await ctx.client.sendMessage(ctx.from, { text: `🌥️ *Hasil Upload*\n\n${lines}` }, { quoted: ctx.message });
}

handler.command  = (ctx) => /^[.!](tourl|url)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_tourlcloud';
handler.tags     = ['tools'];
handler.cost     = 2;
handler.help     = ['.tourl (reply/kirim file/media)'];

module.exports = handler;