// plugins/menu.js (safe audio + robust all)
// .menu [tag|all] / .allmenu

const path = require('path');
const fs = require('fs');
const axios = require('axios');

const DEFAULT_IMG  = 'https://files.catbox.moe/hspat9.png';
const DEFAULT_VID  = 'https://files.catbox.moe/02czae.mp4';
const DEFAULT_OPUS = path.join(process.cwd(), 'mp3', 'menu.mp3');

function nowId() {
  const d = new Date();
  return {
    jam: d.toLocaleTimeString('id-ID', { hour12: false }),
    tgl: d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
}

function titleCase(s = '') { return String(s).replace(/\b\w/g, c => c.toUpperCase()); }

function greet(name = 'kak') {
  const h = new Date().getHours();
  const s = h < 4 ? 'malam' : h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam';
  return `Halo ${name}! Selamat ${s}~`;
}

function getName(ctx) { return ctx.message?.pushName || ctx.pushName || ctx.participantName || 'kak'; }

function block(title, lines = []) {
  if (!lines.length) return '';
  const top = `┌  ◦ ${title}`;
  const mid = lines.slice(0, -1).map(l => `│  ◦ ${l}`).join('\n');
  const bot = `└  ◦ ${lines[lines.length - 1]}`;
  return [top, mid, bot].filter(Boolean).join('\n');
}

const isUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

function pickImage(cfg) { return cfg?.images?.menu || cfg?.defaultMenuImage || DEFAULT_IMG; }
function pickVideo(cfg) { return cfg?.videos?.menu || cfg?.defaultMenuVideo || DEFAULT_VID; }

function normalizeAudioSrc(cfg) {
  const raw = (cfg?.audios?.menu ?? DEFAULT_OPUS);
  if (!raw) return null;
  if (typeof raw === 'object' && raw.url) return String(raw.url);
  try { return String(raw); } catch { return null; }
}

function uniqueTags(reg = []) {
  const set = new Set();
  for (const p of reg) if (Array.isArray(p.tags)) p.tags.forEach(t => t && set.add(String(t)));
  return [...set];
}

function listByTag(reg = [], tag) {
  const items = reg.filter(p => Array.isArray(p.tags) && p.tags.includes(tag));
  if (!items.length) return [`(belum ada fitur pada tag "${tag}")`];
  const lines = [];
  for (const p of items) {
    const helps = Array.isArray(p.help) && p.help.length ? p.help : [p.key || p.__file || '(tanpa nama)'];
    helps.forEach(h => lines.push(h));
  }
  return lines;
}

function listAllGrouped(reg = []) {
  const groups = {};
  for (const p of reg) {
    const tags = Array.isArray(p.tags) && p.tags.length ? p.tags : ['other'];
    for (const t of tags) {
      groups[t] = groups[t] || [];
      const helps = Array.isArray(p.help) && p.help.length ? p.help : [p.key || p.__file || '(tanpa nama)'];
      helps.forEach(h => groups[t].push(h));
    }
  }
  const parts = [];
  for (const [tag, arr] of Object.entries(groups)) {
    const head = `《 Menu ${titleCase(tag)} 》`;
    const body = arr.map(s => `• ${s}`).join('\n');
    parts.push(`${head}\n${body}`);
  }
  return parts.join('\n\n');
}

// === audio sender (auto-detect mp3/opus)
async function sendOpus(ctx, srcRaw) {
  try {
    const src = normalizeAudioSrc({ audios: { menu: srcRaw } });
    if (!src) return ctx.reply('⚠️ Audio menu tidak dikonfigurasi.');

    const abs = path.isAbsolute(src) ? src : path.join(process.cwd(), src);
    await fs.promises.access(abs, fs.constants.R_OK);
    const ext = path.extname(abs).toLowerCase();

    const mime = ext === '.mp3'
      ? 'audio/mpeg'
      : 'audio/ogg; codecs=opus';

    const st = await fs.promises.stat(abs);
    if (st.size <= 0) throw new Error('file size 0');

    await ctx.client.sendMessage(ctx.from, {
      audio: fs.createReadStream(abs),
      mimetype: mime,
      ptt: true
    });
  } catch (e) {
    await ctx.reply(`⚠️ Gagal kirim audio menu: ${e?.message || e}`);
  }
}

// === main menu logic
async function sendMenu(ctx, argRaw) {
  const cfg = ctx.config || {};
  const reg = global.PLUGIN_REGISTRY || [];
  const name = getName(ctx);
  const { jam, tgl } = nowId();

  const botName = cfg.botName || 'My Bot';
  const author = cfg.authorName || 'Unknown';
  const imgUrl = pickImage(cfg);
  const vidUrl = pickVideo(cfg);
  const opusSrc = normalizeAudioSrc(cfg);

  const infoBlock = block('Info Bot', [
    `Name : ${botName}`,
    `Author : ${author}`,
    `Date : ${tgl}`,
    `Time : ${jam}`
  ]);

  const arg = (argRaw || '').trim().toLowerCase();

  // === .menu (tanpa argumen)
  if (!arg) {
    const tags = uniqueTags(reg);
    const tagsLines = tags.length ? tags.map(t => `.menu ${t}`) : ['(belum ada tag)'];
    const caption =
      `${greet(name)}\n\n${infoBlock}\n\n《 Menu Tags 》\n` +
      `${tagsLines.map(s => `• ${s}`).join('\n')}\n\nKetik *.menu <tag>* atau *.menu all*`;
    try {
      await ctx.client.sendMessage(ctx.from, { image: { url: imgUrl }, caption });
    } catch (e) {
      await ctx.reply(`⚠️ Gagal kirim gambar menu: ${e.message}`);
    }
    await sendOpus(ctx, opusSrc);
    return;
  }

  // === .menu all / .allmenu
  if (arg === 'all' || arg === 'allmenu') {
    const body = listAllGrouped(reg);
    const caption = `${greet(name)}\n\n${infoBlock}\n\n${body}`;
    const imgUrl = pickImage(cfg);
    const vidUrl = pickVideo(cfg);

    try {
      // Thumbnail dari image
      let thumb;
      try {
        const { data } = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
        thumb = Buffer.from(data);
      } catch {}

      // Kirim 1 pesan video (tanpa audio) + caption
      await ctx.client.sendMessage(ctx.from, {
        video: { url: vidUrl },
        caption: caption,
        gifPlayback: true, // tampil seperti GIF (tanpa audio)
        ...(thumb ? { jpegThumbnail: thumb } : {})
      });

    } catch (e) {
      await ctx.reply(`⚠️ Gagal kirim allmenu: ${e.message}\n\n${caption}`);
    }
    return;
  }

  // === .menu <tag>
  const lines = listByTag(reg, arg);
  const caption =
    `${greet(name)}\n\n${infoBlock}\n\n《 Menu ${titleCase(arg)} 》\n` +
    `${lines.map(s => `• ${s}`).join('\n')}\n\nKetik *.menu all* untuk semua fitur.`;

  try {
    await ctx.client.sendMessage(ctx.from, { image: { url: imgUrl }, caption });
  } catch (e) {
    await ctx.reply(`⚠️ Gagal kirim gambar menu: ${e.message}\n\n${caption}`);
  }
  await sendOpus(ctx, opusSrc);
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!]menu(?:\s+(.+))?$/i) || txt.match(/^[.!](allmenu)\b/i);
  if (!m) return;
  await sendMenu(ctx, (m[1] || '').trim());
}

handler.command = (ctx) => /^[.!](menu|allmenu)\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'menu';
handler.nolimit = true;
handler.register = false;
handler.help = ['.menu', '.menu <tag>', '.menu all', '.allmenu'];

module.exports = handler;b