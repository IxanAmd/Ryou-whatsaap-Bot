// plugins/tools_gofile.js
// .gofile — upload file ke GoFile

const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function getAnyBufferFromCtx(ctx) {
  const root = ctx.message?.message || {};
  const q = root?.extendedTextMessage?.contextInfo?.quotedMessage || root;
  const cand = q?.documentMessage || q?.imageMessage || q?.videoMessage || q?.audioMessage || null;
  if (!cand) return null;

  const type =
    q?.documentMessage ? 'document' :
    q?.imageMessage    ? 'image' :
    q?.videoMessage    ? 'video' :
    'audio';

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

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]gofile\b/i.test(txt)) return;

  const got = await getAnyBufferFromCtx(ctx);
  if (!got) return ctx.reply('Kirim/reply *file/media* yang ingin diupload.');

  await ctx.reply('⏳ Upload ke GoFile...');
  try {
    const form = new FormData();
    form.append('file', got.buffer, `upload.${got.ext}`);
    const { data } = await axios.post('https://upload.gofile.io/uploadFile', form, { headers: form.getHeaders(), timeout: 60000 });
    const page = data?.data?.downloadPage;
    if (!page) throw new Error('Upload gagal');
    await ctx.reply(`✅ Berhasil:\n${page}`);
  } catch (e) {
    await ctx.reply(`❌ ${e?.message || e}`);
  }
}

handler.command  = (ctx) => /^[.!]gofile\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_gofile';
handler.tags     = ['tools'];
handler.cost     = 2;
handler.help     = ['.gofile (reply/kirim file)'];

module.exports = handler;