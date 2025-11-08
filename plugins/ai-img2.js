// plugins/ai-creart.js
// .creart <prompt>  |  .img2img <prompt>
// Creart AI (text2image & image2image) — premium only

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// --- helpers -------------------------------------------------
async function translateToEnglish(text) {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single';
    const { data } = await axios.get(url, {
      params: { client: 'gtx', sl: 'auto', tl: 'en', dt: 't', q: text },
      timeout: 20000
    });
    return data?.[0]?.[0]?.[0] || text;
  } catch {
    return text;
  }
}

async function getQuotedOrOwnImageBuffer(ctx) {
  const root = ctx.message?.message || {};
  const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  const targetImage = quoted?.imageMessage || root?.imageMessage || null;
  if (!targetImage) return null;

  const stream = await downloadContentFromMessage(targetImage, 'image');
  const chunks = [];
  for await (const ch of stream) chunks.push(ch);
  return Buffer.concat(chunks);
}

// --- Creart API wrappers ------------------------------------
async function creartTxt2Img(prompt) {
  const translated = await translateToEnglish(prompt);
  const form = new FormData();
  form.append('prompt', translated);
  form.append('input_image_type', 'text2image');
  form.append('aspect_ratio', '4x5');
  form.append('guidance_scale', '9.5');
  form.append('controlnet_conditioning_scale', '0.5');

  const { data } = await axios.post(
    'https://api.creartai.com/api/v2/text2image',
    form,
    { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 }
  );
  return Buffer.from(data);
}

async function creartImg2Img(prompt, imageBuffer) {
  const translated = await translateToEnglish(prompt);
  const form = new FormData();
  form.append('prompt', translated);
  form.append('input_image_type', 'image2image');
  form.append('aspect_ratio', '4x5');
  form.append('guidance_scale', '9.5');
  form.append('controlnet_conditioning_scale', '0.5');
  form.append('image_file', imageBuffer, 'image.png');

  const { data } = await axios.post(
    'https://api.creartai.com/api/v2/image2image',
    form,
    { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 }
  );
  return Buffer.from(data);
}

// --- handler -------------------------------------------------
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](creart|img2img)\s+(.+)/i);
  if (!m) return;

  const cmd = m[1].toLowerCase();
  const prompt = m[2].trim();

  try {
    if (cmd === 'creart') {
      await ctx.reply('🖼️ Generate image (text2image)...');
      const buf = await creartTxt2Img(prompt);
      await ctx.client.sendMessage(ctx.from, { image: buf });
      return;
    }

    if (cmd === 'img2img') {
      const imgBuf = await getQuotedOrOwnImageBuffer(ctx);
      if (!imgBuf) {
        return ctx.reply('Kirim/Reply gambar dengan caption *.img2img <prompt>*');
      }
      await ctx.reply('🖌️ Transform image (image2image)...');
      const out = await creartImg2Img(prompt, imgBuf);
      await ctx.client.sendMessage(ctx.from, { image: out });
      return;
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal: ${e?.message || e}`);
  }
}

// metadata (sesuai handler kamu)
handler.command  = (ctx) => /^[.!](creart|img2img)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_creart';
handler.tags     = ['ai'];
handler.premium  = false;  // ⬅️ premium only (dibaca oleh handler.js kamu)
handler.cost     = 8;     // kurangi 8 limit per pemakaian (ubah bebas)
handler.help     = [
  '.creart <prompt>',
  '.img2img <prompt> (reply/kirim gambar)'
];

module.exports = handler;