// plugins/register_verif.js
// Registrasi sederhana + verifikasi opsional (robust fallback image)

const axios = require('axios');
const FALLBACK_IMG = 'https://files.catbox.moe/41i3zi.png';

// optional normalizer (cadangan jika ctx.sender kadang @lid)
let jidNormalizedUser = (j) => j;
try { ({ jidNormalizedUser } = require('@whiskeysockets/baileys')); } catch {}

global.__REG_STORE__ = global.__REG_STORE__ || {};
const STORE = global.__REG_STORE__;
STORE.profile = STORE.profile || new Map();   // Map<userKey, { name, age, verified, regAt }>
const PROFILE = STORE.profile;

const fmtDateId = (d=new Date()) => d.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
const fmtTimeId = (d=new Date()) => d.toLocaleTimeString('id-ID',{hour12:false});

const box = (title, lines=[]) => {
  const top = `┌────《 ${title} 》───`;
  const body = lines.map(l=>`│ ${l}`).join('\n');
  const bot  = `└────────────`;
  return [top, body, bot].join('\n');
};

function parseDaftar(text) {
  const m = String(text||'').trim().match(/^[.!]daftar\s+(.+?)\s+(\d{1,2})$/i);
  if (!m) return null;
  const name = m[1].trim().slice(0,40);
  const age  = Number(m[2]);
  if (!name || !age || age<=0) return null;
  return { name, age };
}

function setProfile(userKey, data) {
  const cur = PROFILE.get(userKey) || {};
  PROFILE.set(userKey, { ...cur, ...data });
}
function getProfile(userKey) {
  return PROFILE.get(userKey) || null;
}

// --- helper: download image to Buffer (robust)
async function fetchImageBuffer(url, timeout = 10000) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout,
      validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,*/*' }
    });
    const buf = Buffer.from(res.data);
    if (buf.length > 0) return buf;
  } catch {}
  return null;
}

// --- helper: pilih & unduh foto profil atau fallback
async function safeProfileImage(ctx, jid) {
  // urutan kandidat: profilePictureUrl -> config.images.profileDefault -> config.defaultProfileImage -> FALLBACK_IMG
  const cfgImg = ctx.config?.images?.profileDefault || ctx.config?.defaultProfileImage || FALLBACK_IMG;

  // 1) coba ambil URL PP WA
  let ppUrl = null;
  try {
    const target = (jid && jid.endsWith('@lid') && jidNormalizedUser) ? jidNormalizedUser(jid) : (jid || ctx.sender);
    ppUrl = await ctx.client.profilePictureUrl(target, 'image');
  } catch { /* no pp / privacy / 404 */ }

  // 2) unduh ke buffer secara berurutan
  const buf1 = await fetchImageBuffer(ppUrl);
  if (buf1) return { buffer: buf1, source: 'pp' };

  const buf2 = await fetchImageBuffer(cfgImg);
  if (buf2) return { buffer: buf2, source: 'cfg' };

  const buf3 = await fetchImageBuffer(FALLBACK_IMG);
  if (buf3) return { buffer: buf3, source: 'fallback' };

  // 3) jika semua gagal → null (nanti kirim teks saja)
  return null;
}

async function doDaftar(ctx) {
  const parsed = parseDaftar(ctx.text);
  if (!parsed) {
    return ctx.reply('❗Format salah.\nGunakan: *.daftar <nama> <umur>*\nContoh: *.daftar Andi 15*');
  }

  const key = global.USERDB.keyOf(ctx.sender);

  // sudah ada
  if (global.USERDB.isRegistered(ctx.sender)) {
    return ctx.reply('⚠️ Anda sudah terdaftar di DB.');
  }

  // simpan
  global.USERDB.register(ctx.sender);
  setProfile(key, { name: parsed.name, age: parsed.age, regAt: Date.now(), verified: true });

  const prof  = getProfile(key);
  const quota = global.USAGE.quota();
  const hari  = fmtDateId(new Date());
  const jam   = fmtTimeId(new Date());

  const caption = box('REGISTRASI BERHASIL', [
    `Nama : ${prof.name}`,
    `Umur : ${prof.age}`,
    ctx.isGroup
      ? `LID : ${(ctx.message?.key?.participant || '-').replace(/\D/g,'')}`
      : `JID : ${ctx.sender}`,
    `Hari : ${hari}`,
    `Waktu: ${jam}`,
    `Limit: ${quota} • sisa ${quota}`
  ]);

  // kirim image (buffer) jika memungkinkan; kalau gagal, kirim teks
  try {
    const pic = await safeProfileImage(ctx, ctx.sender);
    if (pic?.buffer) {
      await ctx.client.sendMessage(ctx.from, {
        image: pic.buffer,
        caption
      });
      return;
    }
  } catch (e) {
    // lanjut ke teks fallback
  }

  // Fallback terakhir: teks saja (agar tidak error sama sekali)
  await ctx.reply(caption);
}

async function doUnregister(ctx) {
  const key = global.USERDB.keyOf(ctx.sender);
  if (!global.USERDB.isRegistered(ctx.sender)) {
    return ctx.reply('Kamu belum terdaftar.');
  }
  const ok = global.USERDB.unregister?.(ctx.sender);
  if (!ok) return ctx.reply('Gagal unregister. Hubungi owner.');
  PROFILE.delete(key);
  await ctx.reply('✅ Berhasil unregister. Data dihapus.');
}

async function handler(ctx) {
  const t = (ctx.text||'').trim();
  if (/^[.!]daftar\b/i.test(t))               return doDaftar(ctx);
  if (/^[.!](unregister|unreg)\b/i.test(t))   return doUnregister(ctx);
}

handler.command  = (ctx) => /^[.!](daftar|unregister|unreg)\b/i.test(ctx.text||'');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['system'];
handler.key      = 'register_verif';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.daftar <nama> <umur>', '.unregister'];

module.exports = handler;