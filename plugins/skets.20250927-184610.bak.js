// plugins/ai_tosketsa.js
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getImageBuffer(ctx) {
  const q = ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || ctx.message?.message;
  const img = q?.imageMessage;
  if (!img) return null;

  const stream = await downloadContentFromMessage(img, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function imageToEdge(buffer) {
  const form = new FormData();
  form.append('hidden_image_width', '1712');
  form.append('hidden_image_height', '2560');
  form.append('upload_file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('edge_strength', '2');
  form.append('edge_smooth', 'true');

  const id = Math.random().toString(36).slice(2, 12);
  const uploadUrl = `https://tech-lagoon.com/canvas/image-to-edge?id=${id}&new_file=true`;

  const res = await axios.post(uploadUrl, form, {
    headers: {
      ...form.getHeaders(),
      origin: 'https://tech-lagoon.com',
      referer: 'https://tech-lagoon.com/imagechef/image-to-edge.html',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'Mozilla/5.0'
    },
    timeout: 60000,
    validateStatus: () => true
  });

  if (!Array.isArray(res.data) || !res.data[0]) throw new Error('Gagal dapat hasil sketsa.');
  const [resId] = res.data;
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `https://tech-lagoon.com/imagechef/image-to-edge/${resId}?n=${n}`;
}

async function handler(ctx) {
  if (!/^[.!]tosketsa\b/i.test(ctx.text || '')) return;
  const buf = await getImageBuffer(ctx);
  if (!buf) return ctx.reply('Kirim/reply *gambar* dulu ya, lalu ketik *.tosketsa*.');

  await ctx.reply('⏳ Membuat sketsa...');
  try {
    const out = await imageToEdge(buf);
    await ctx.client.sendMessage(ctx.from, {
      image: { url: out },
      caption: '✅ Selesai (sketsa).'
    }, { quoted: ctx.message });
  } catch (e) {
    await ctx.reply(`❌ ${e?.message || 'Gagal memproses sketsa.'}`);
  }
}

handler.command  = (ctx) => /^[.!]tosketsa\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_tosketsa';
handler.tags     = ['ai'];
handler.cost     = 3;
handler.help     = ['.tosketsa (reply/kirim gambar)'];

module.exports = handler;