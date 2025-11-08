// plugins/ai-ss2code.js
// .ss2code <url> — atau reply/kirim gambar, auto-upload ke Uguu
// API: https://api.nekolabs.my.id/ai/ss2code?imageUrl=...

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ========== helpers ==========
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
  if (root?.imageMessage) return root.imageMessage; // fallback: kirim gambar + caption
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
    timeout: 30000,
  });
  const f = data?.files?.[0];
  if (!f?.url) throw new Error('Upload gagal (Uguu).');
  return f.url;
}
function isUrl(s='') { return /^https?:\/\//i.test(String(s).trim()); }

// bersihin HTML: hilangkan newline/tab & spasi berlebih antar tag
function cleanHtml(html = '') {
  let s = String(html);
  // buang CR/LF/TAB
  s = s.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\t/g, ' ');
  // rapikan spasi berlebih
  s = s.replace(/\s{2,}/g, ' ').trim();
  // rapikan antar tag
  s = s.replace(/>\s+</g, '><');
  return s;
}

// ========== core ==========
async function ss2codeProcess(imageUrl) {
  const api = `https://api.nekolabs.my.id/ai/ss2code?imageUrl=${encodeURIComponent(imageUrl)}`;

  // Ambil sebagai arraybuffer lalu deteksi content-type
  const res = await axios.get(api, { responseType: 'arraybuffer', timeout: 60_000 });
  const ct = String(res.headers['content-type'] || '');

  if (/json/i.test(ct)) {
    const text = Buffer.from(res.data).toString('utf8');
    const json = JSON.parse(text);
    const raw = json.result || json.data?.result || json.html || '';
    if (!raw) throw new Error(json.message || 'API tidak mengembalikan result.');
    return cleanHtml(raw);
  }

  // kalau server ngasih text/html langsung
  if (/text\/html/i.test(ct)) {
    const text = Buffer.from(res.data).toString('utf8');
    return cleanHtml(text);
  }

  // fallback: coba parse sebagai utf8
  const text = Buffer.from(res.data).toString('utf8');
  try {
    const j = JSON.parse(text);
    const raw = j.result || j.data?.result || j.html || '';
    if (raw) return cleanHtml(raw);
  } catch {}
  if (/<html[\s>]/i.test(text)) return cleanHtml(text);

  throw new Error('Format respons tidak dikenali.');
}

// ========== handler ==========
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  // cocokkan & ambil arg bila ada
  const m = txt.match(/^[.!]ss2code\b\s*(.+)?/i);
  if (!m) return; // biar handler lain bisa jalan

  try {
    let arg = (m[1] || '').trim();
    let imageUrl = isUrl(arg) ? arg : null;

    if (!imageUrl) {
      // tidak ada URL → cari gambar dari pesan/reply
      const imgMsg = getImageMessage(ctx);
      if (!imgMsg) {
        return ctx.reply('Kirim/reply *gambar* dengan caption *.ss2code* atau pakai *.ss2code <url>*');
      }
      await ctx.reply('⏳ Upload gambar...');
      const buf = await bufferFromImageMessage(imgMsg);
      imageUrl = await uploadUguu(buf, 'ss2code.jpg');
    }

    await ctx.reply('🧠 Mengubah screenshot ➜ kode HTML...');
    const html = await ss2codeProcess(imageUrl);

    // kirim sebagai dokumen HTML
    const buff = Buffer.from(html, 'utf8');
    await ctx.client.sendMessage(
      ctx.from,
      {
        document: buff,
        fileName: 'ss2code.html',
        mimetype: 'text/html',
        caption: '✅ Selesai. File HTML sudah dirapikan (tanpa newline/spasi berlebih).',
      },
      { quoted: ctx.message }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal ss2code: ${e?.message || e}`);
  }
}

// ========== metadata ==========
handler.command  = (ctx) => /^[.!]ss2code\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_ss2code';
handler.tags     = ['ai', 'tools'];
handler.cost     = 3; // pakai 3 limit per pemakaian
handler.help     = ['.ss2code <url> (atau reply/kirim gambar)'];

module.exports = handler;