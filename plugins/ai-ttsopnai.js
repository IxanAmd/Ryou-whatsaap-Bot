// plugins/tools-tts-openai.js
// .tts <teks>[|voice] — TTS via api.nekolabs.my.id
// Contoh: .tts Hai semua|alloy  atau reply teks lalu .tts

const axios = require('axios');

function parseArgs(txt) {
  // hilangkan prefix & command
  const m = txt.match(/^[.!]tts\s+([\s\S]+)/i);
  if (!m) return { text: '', voice: '' };
  const raw = m[1].trim();
  const [teks, v = ''] = raw.split('|');
  return { text: (teks || '').trim(), voice: (v || '').trim() };
}

function getRepliedText(ctx) {
  const root = ctx.message?.message || {};
  const em = root.extendedTextMessage;
  const quoted = em?.contextInfo?.quotedMessage;
  const qtxt =
    quoted?.conversation ||
    quoted?.extendedTextMessage?.text ||
    '';
  return (qtxt || '').trim();
}

async function fetchTTS(text, voice) {
  const base = 'https://api.nekolabs.my.id/tools/tts/openai';
  const url = `${base}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice || 'alloy')}`;

  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60_000 });
  const ct = String(res.headers['content-type'] || '');

  // Ada 2 kemungkinan: langsung audio (binary) atau JSON {url: "..."}
  if (/application\/json/i.test(ct)) {
    const json = JSON.parse(Buffer.from(res.data).toString('utf8'));
    const fileUrl = json.url || json.result || json.data?.url;
    if (!fileUrl) throw new Error(json.message || 'Endpoint tidak mengembalikan audio.');
    return { type: 'url', data: fileUrl, mimetype: 'audio/mpeg' };
  }

  // Jika header audio, kirim buffer
  const mimetype =
    /audio\/(mpeg|mp3)/i.test(ct) ? 'audio/mpeg' :
    /audio\/ogg/i.test(ct)       ? 'audio/ogg; codecs=opus' :
    /audio\//i.test(ct)          ? ct : 'audio/mpeg';

  return { type: 'buffer', data: Buffer.from(res.data), mimetype };
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]tts\b/i.test(txt)) return;

  // Ambil teks/voice dari argumen, jika kosong coba dari reply
  let { text, voice } = parseArgs(txt);
  if (!text) {
    const q = getRepliedText(ctx);
    if (q) text = q;
  }
  if (!text) {
    return ctx.reply('❗Format: *.tts <teks>[|voice]*\nContoh: *.tts Halo dunia|alloy*\nAtau **reply** ke teks lalu ketik *.tts*');
  }
  if (!voice) voice = 'alloy';

  try {
    await ctx.reply('🗣️ Membuat audio...');

    const out = await fetchTTS(text, voice);

    if (out.type === 'url') {
      await ctx.client.sendMessage(ctx.from, {
        audio: { url: out.data },
        mimetype: out.mimetype,
        ptt: false
      }, { quoted: ctx.message });
    } else {
      await ctx.client.sendMessage(ctx.from, {
        audio: out.data,
        mimetype: out.mimetype,
        ptt: false
      }, { quoted: ctx.message });
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal TTS: ${e?.message || e}`);
  }
}

// ===== metadata sesuai kerangka kamu =====
handler.command  = (ctx) => /^[.!]tts\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_tts_openai';
handler.tags     = ['tools', 'ai', 'tts'];
handler.cost     = 2; // potong 2 limit per pemakaian
handler.help     = ['.tts <teks>[|voice]  (atau reply teks)'];

module.exports = handler;