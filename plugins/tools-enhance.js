// plugins/tools_enhance.js
// .enhance — perjelas / auto-enhance gambar via reaimagine.zipoapps
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const API_KEY = '-mY6Nh3EWwV1JihHxpZEGV1hTxe2M_zDyT0i8WNeDV4buW9l02UteD6ZZrlAIO0qf6NhYA';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getImageBufferFromCtx(ctx) {
  const root = ctx.message?.message || {};
  const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  const imgMsg =
    quoted?.imageMessage ||
    root?.imageMessage ||
    null;

  if (!imgMsg) return null;

  const stream = await downloadContentFromMessage(imgMsg, 'image');
  const bufs = [];
  for await (const c of stream) bufs.push(c);
  return Buffer.concat(bufs);
}

async function enhanceImage(buffer) {
  // 1) upload
  const form = new FormData();
  form.append('file', buffer, { filename: 'image.jpg' });

  const up = await axios.post(
    'https://reaimagine.zipoapps.com/enhance/autoenhance/',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: API_KEY,
        'User-Agent': 'Dalvik/2.1.0 (Linux; Android 10; Redmi Note 5 Pro)',
      },
      validateStatus: () => true
    }
  );
  if (up.status !== 200) {
    throw new Error(`Upload gagal: HTTP ${up.status}`);
  }

  const name = up.headers?.name || up.data?.name;
  if (!name) throw new Error(`Gagal ambil token 'name' dari response.`);

  // 2) polling hasil
  for (let i = 0; i < 15; i++) {
    const res = await axios.post(
      'https://reaimagine.zipoapps.com/enhance/request_res/',
      null,
      {
        headers: {
          name,
          app: 'enhanceit',
          ad: '0',
          Authorization: API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Dalvik/2.1.0 (Linux; Android 10; Redmi Note 5 Pro)',
        },
        responseType: 'arraybuffer',
        validateStatus: () => true
      }
    );

    if (res.status === 200 && res.data && res.data.byteLength > 0) {
      return Buffer.from(res.data);
    }
    await sleep(4000);
  }
  throw new Error('Timeout: hasil tidak tersedia setelah beberapa percobaan.');
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]enhance$/i.test(txt)) return;

  try {
    const buf = await getImageBufferFromCtx(ctx);
    if (!buf) return ctx.reply('⚠️ Kirim *gambar* dengan caption *.enhance* atau reply gambar dengan perintah itu.');

    await ctx.reply('✨ Memproses, mohon tunggu...');
    const out = await enhanceImage(buf);

    await ctx.client.sendMessage(ctx.from, {
      image: out,
      caption: '✅ Selesai! Gambar sudah diperjelas.'
    }, { quoted: ctx.message });
  } catch (e) {
    await ctx.reply(`❌ Gagal enhance: ${e?.message || e}`);
  }
}

// metadata (gaya bot kamu)
handler.command  = (ctx) => /^[.!]enhance$/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_enhance';
handler.tags     = ['tools'];
handler.cost     = 8;  // pakai 8 limit per pemakaian
handler.help     = ['.enhance (reply/kirim gambar)'];

module.exports = handler;