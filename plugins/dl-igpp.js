// plugins/igpp.js
// IG Profile Picture: .igpp <username> / .igdl-pp <username>
// Primary: apis-anomaki; Fallback: scrape via r.jina.ai
const axios = require('axios');

const API_BASE = 'https://www.apis-anomaki.zone.id';
const TIMEOUT  = 25000;

const isUrl = s => typeof s === 'string' && /^https?:\/\//i.test(s);

function normalizeUsername(raw = '') {
  let u = String(raw).trim().replace(/^@+/, '');
  u = u.split(/\s+/)[0];
  u = u.replace(/[^a-zA-Z0-9._]/g, '');
  return u;
}

function caption(uname) {
  return `《 IG Profile Picture 》\n- @${uname}`;
}

function uniq(arr) { return [...new Set(arr)]; }

function collectUrlsDeep(obj) {
  const urls = [];
  const st = [obj];
  while (st.length) {
    const cur = st.pop();
    if (!cur) continue;
    if (Array.isArray(cur)) { st.push(...cur); continue; }
    if (typeof cur === 'object') { st.push(...Object.values(cur)); continue; }
    if (typeof cur === 'string' && isUrl(cur)) urls.push(cur);
  }
  return uniq(urls);
}

function pickImage(urls) {
  const imgOnly = urls.filter(u => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u));
  if (!imgOnly.length) return null;
  const pref = imgOnly.find(u => /profile_pic|1080|hd/i.test(u));
  return pref || imgOnly[0];
}

// --- FALLBACK SCRAPE ---------------------------------------------------------
async function scrapePP(username) {
  // Gunakan proxy fetch yang merender HTML murni tanpa JS & CORS
  const page = `https://r.jina.ai/http://www.instagram.com/${encodeURIComponent(username)}/`;
  const { data: html } = await axios.get(page, { timeout: TIMEOUT });

  // Cari profile_pic_url_hd (atau profile_pic_url) di sumber halaman
  const reHd  = /"profile_pic_url_hd"\s*:\s*"([^"]+)"/i;
  const reStd = /"profile_pic_url"\s*:\s*"([^"]+)"/i;

  let m = html.match(reHd) || html.match(reStd);
  if (!m) return null;

  // Unescape \u0026, \/ dll
  let url = m[1]
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/\\u003d/g, '=');

  return url;
}

// --- MAIN --------------------------------------------------------------------
async function handler(ctx) {
  try {
    const m = ctx.text.match(/^[.!](igpp|igdl\-pp)\s+(.+)/i);
    if (!m) return ctx.reply('❗Format: .igpp <username>\nContoh: .igpp @natgeo');

    const username = normalizeUsername(m[2]);
    if (!username) return ctx.reply('❗Username tidak valid. Contoh: .igpp natgeo');

    await ctx.reply('⏳ Mengambil foto profil IG...');

    // 1) PRIMARY: API kamu
    let best = null;
    try {
      const url = `${API_BASE}/downloader/igdl-pp?username=${encodeURIComponent(username)}`;
      const { data } = await axios.get(url, { timeout: TIMEOUT });

      const candidates = collectUrlsDeep({
        a: data?.image || data?.url,
        b: data?.result?.image || data?.result?.url,
        data
      });

      best = pickImage(candidates);
    } catch (_) {
      // lanjut ke fallback
    }

    // 2) FALLBACK: scrape
    if (!best) {
      try {
        best = await scrapePP(username);
      } catch (_) {}
    }

    if (!best) {
      return ctx.reply(
        '⚠️ Foto profil tidak ditemukan.\n' +
        '- Pastikan username benar & akun tidak privat.\n' +
        '- Coba lagi beberapa saat (rate-limit).'
      );
    }

    await ctx.client.sendMessage(ctx.from, {
      image: { url: best },
      caption: caption(username)
    });
  } catch (e) {
    console.error('[igpp]', e?.response?.data || e?.message || e);
    await ctx.reply('❌ Gagal mengambil foto profil (akun privat/username salah/API error).');
  }
}

handler.command = /^[.!](igpp|igdl\-pp)\b/i;
handler.role    = 'all';
handler.scope   = 'all';
handler.enabled = true;
handler.key     = 'igpp';
handler.tags    = ['downloader'];
handler.cost    = 2;
handler.register= true;       // butuh register kalau sistemmu pakai gate
handler.help    = ['.igpp <username>'];

module.exports = handler;