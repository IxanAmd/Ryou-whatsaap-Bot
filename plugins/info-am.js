// plugins/tools-am-preset-info.js
// .ampreset <url> — Ambil info preset (AM Preset) via api.nekolabs.my.id
// Contoh: .ampreset https://example.com/preset/123

const axios = require('axios');

// ——— utils —————————————————————————————————
function firstUrlFromText(t='') {
  const m = String(t).match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}
function unwrap(msg = {}) {
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}
function getRepliedText(ctx) {
  const root = unwrap(ctx.message?.message || {});
  const q = root?.extendedTextMessage?.contextInfo?.quotedMessage;
  return (
    q?.conversation ||
    q?.extendedTextMessage?.text ||
    ''
  )?.trim();
}
function box(title, lines=[]) {
  const head = `《 ${title} 》`;
  return head + '\n' + lines.map(l => `- ${l}`).join('\n');
}
function pick(obj, keys=[]) {
  const out = {};
  for (const k of keys) if (obj?.[k] != null && obj[k] !== '') out[k] = obj[k];
  return out;
}
function pickFirst(obj, candidates=[]) {
  for (const k of candidates) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.startsWith('http')) return v;
  }
  return null;
}

// ——— API call ————————————————————————————————
async function fetchPresetInfo(targetUrl) {
  const api = `https://api.nekolabs.my.id/tools/am-preset-info?url=${encodeURIComponent(targetUrl)}`;
  const { data } = await axios.get(api, { timeout: 30_000 });
  // Normalisasi struktur (fleksibel)
  const payload = data?.data || data?.result || data || {};
  return payload;
}

// ——— handler ————————————————————————————————
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!]ampreset\b/i.test(txt)) return;

  // Ambil URL dari argumen atau reply
  let arg = txt.replace(/^[.!]ampreset\b/i, '').trim();
  let url = firstUrlFromText(arg);
  if (!url) {
    const qtxt = getRepliedText(ctx);
    url = firstUrlFromText(qtxt || '');
  }
  if (!url) return ctx.reply('❗Format: *.ampreset <url>*\nBisa juga *reply* pesan yang berisi URL, lalu ketik *.ampreset*');

  try {
    await ctx.reply('🔎 Mengambil info preset...');
    const info = await fetchPresetInfo(url);

    // Coba ambil field umum
    const title = info.title || info.name || info.presetName || 'AM Preset';
    const coverUrl = pickFirst(info, ['cover', 'thumbnail', 'thumb', 'image', 'coverUrl', 'thumbnailUrl']);
    const dlUrl = pickFirst(info, ['download', 'preset', 'file', 'link', 'downloadUrl']);

    const common = pick(info, [
      'author', 'creator', 'bpm', 'key', 'scale', 'genre', 'tags', 'size', 'version'
    ]);

    const lines = [];
    lines.push(`Title : ${title}`);
    if (common.author || common.creator) lines.push(`Author : ${common.author || common.creator}`);
    if (common.bpm)    lines.push(`BPM : ${common.bpm}`);
    if (common.key)    lines.push(`Key : ${common.key}`);
    if (common.scale)  lines.push(`Scale : ${common.scale}`);
    if (common.genre)  lines.push(`Genre : ${common.genre}`);
    if (common.tags)   lines.push(`Tags : ${Array.isArray(common.tags) ? common.tags.join(', ') : common.tags}`);
    if (common.size)   lines.push(`Size : ${common.size}`);
    if (common.version)lines.push(`Version : ${common.version}`);
    if (dlUrl)         lines.push(`Download : ${dlUrl}`);
    lines.push(`Source : ${url}`);

    const caption = box('AM Preset Info', lines);

    if (coverUrl) {
      await ctx.client.sendMessage(ctx.from, {
        image: { url: coverUrl },
        caption
      }, { quoted: ctx.message });
    } else {
      await ctx.reply(caption);
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal ambil preset: ${e?.response?.data?.message || e?.message || e}`);
  }
}

// ——— metadata ————————————————————————————————
handler.command  = (ctx) => /^[.!]ampreset\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_ampreset_info';
handler.tags     = ['tools'];
handler.cost     = 2; // pakai 2 limit
handler.help     = ['.ampreset <url> (atau reply URL)'];

module.exports = handler;