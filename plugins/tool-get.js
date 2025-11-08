// plugins/getcode.js — .get <url>
// Hasil: 1 ZIP (index.html + assets/css + assets/js + assets/files non-JSON)
// + kirim teks rapi tanpa %20 / \n literal

const axios = require('axios');
const { URL } = require('url');
const JSZip = require('jszip');
const cheerio = require('cheerio');

const MAX_BYTES = 4 * 1024 * 1024; // 4MB batas download total per file
const REQ_TIMEOUT = 45000;
const MAX_REDIRECTS = 3;

function extractUrlFromText(text) {
  const rx = /(https?:\/\/[^\s<>")]+|www\.[^\s<>")]+)/i;
  const m = String(text || '').match(rx);
  if (!m) return null;
  return m[0].replace(/[),.;!?]+$/, '');
}
function normalizeUrl(raw) {
  if (!raw) return null;
  let u = String(raw).trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).toString(); } catch { return null; }
}
function isPrivateOrLocalHost(uStr) {
  try {
    const u = new URL(uStr);
    const host = u.hostname.toLowerCase();
    if (u.username || u.password) return true;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const p = host.split('.').map(n => parseInt(n, 10));
      if (p[0] === 127) return true;
      if (p[0] === 10) return true;
      if (p[0] === 192 && p[1] === 168) return true;
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
      if (p[0] === 169 && p[1] === 254) return true;
      if (p[0] === 0) return true;
    }
    if (host === '::1' || host.startsWith('fe80:')) return true;
    return false;
  } catch { return true; }
}

function cleanText(s = '') {
  return String(s)
    .replace(/%20/g, ' ')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

function safeName(name = 'file') {
  let n = name;
  try { n = decodeURIComponent(n); } catch {}
  n = n.replace(/[?#].*$/,'');             // buang query/fragment
  n = n.replace(/[^A-Za-z0-9._-]+/g, '-'); // aman untuk FS
  n = n.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return n || 'file';
}
function extFromMime(mime = '', fallback = '') {
  mime = String(mime).toLowerCase();
  if (mime.includes('text/css')) return '.css';
  if (mime.includes('javascript') || mime.includes('ecmascript')) return '.js';
  if (mime.includes('image/png')) return '.png';
  if (mime.includes('image/jpeg')) return '.jpg';
  if (mime.includes('image/jpg')) return '.jpg';
  if (mime.includes('image/gif')) return '.gif';
  if (mime.includes('image/svg')) return '.svg';
  if (mime.includes('image/webp')) return '.webp';
  if (mime.includes('application/pdf')) return '.pdf';
  if (mime.includes('text/html')) return '.html';
  if (mime.includes('text/plain')) return '.txt';
  return fallback || '';
}

async function fetchBinary(url, baseHeaders = {}) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: REQ_TIMEOUT,
    maxRedirects: MAX_REDIRECTS,
    validateStatus: s => s >= 200 && s < 400,
    headers: {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WhatsAppBot/1.0',
      ...baseHeaders
    },
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES
  });
  const buf = Buffer.from(res.data);
  const ctype = String(res.headers['content-type'] || '').toLowerCase();
  return { buffer: buf, contentType: ctype };
}

async function fetchText(url) {
  const { buffer, contentType } = await fetchBinary(url, { Accept: 'text/html, text/plain, */*' });
  const looksText = /(^text\/)|json|xml|html/.test(contentType);
  let text = '';
  if (looksText) {
    try { text = buffer.toString('utf8'); } catch { text = ''; }
  }
  return { text, contentType, buffer };
}

function absolutize(base, link) {
  try { return new URL(link, base).toString(); } catch { return null; }
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim();
  if (!/^[.!](get)\b/i.test(txt)) return;

  const arg = txt.replace(/^[.!](get)\b/i, '').trim();

  // Cari URL dari argumen / quoted
  let target = extractUrlFromText(arg);
  if (!target) {
    const root = (ctx.message && ctx.message.message) || {};
    const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage;
    const qText = quoted && (quoted.extendedTextMessage?.text || quoted.conversation || null);
    if (qText) target = extractUrlFromText(qText);
  }
  if (!target) target = extractUrlFromText(txt);

  const finalUrl = normalizeUrl(target);
  if (!finalUrl) {
    return ctx.reply('Format:\n• .get <url>\n• atau reply pesan yang berisi URL lalu ketik .get');
  }
  if (isPrivateOrLocalHost(finalUrl)) {
    return ctx.reply('❌ URL tidak diizinkan (host lokal/private diblokir).');
  }

  try {
    await ctx.reply('⏳ Mengambil halaman & aset...');

    // 1) Ambil HTML
    const { text: htmlRaw, contentType } = await fetchText(finalUrl);
    if (!htmlRaw || !/html/.test(contentType)) {
      return ctx.reply('❌ Tidak menemukan HTML pada URL tersebut.');
    }

    // 2) Parse dan cari CSS/JS/asset lain
    const $ = cheerio.load(htmlRaw, { decodeEntities: false });

    // Kumpulkan link src/href
    const links = new Set();

    // CSS
    $('link[rel="stylesheet"][href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h) links.add(h);
    });

    // JS eksternal
    $('script[src]').each((_, el) => {
      const s = $(el).attr('src');
      if (s) links.add(s);
    });

    // Asset lain (img, video poster, audio src, source[src], etc.)
    $('img[src], video[poster], audio[src], source[src], link[rel="preload"][href], link[rel="icon"][href], link[rel="shortcut icon"][href]')
      .each((_, el) => {
        const $el = $(el);
        const a = $el.attr('src') || $el.attr('href') || $el.attr('poster');
        if (a) links.add(a);
      });

    // 3) Download aset dan susun ZIP
    const zip = new JSZip();
    const assetsCSS = 'assets/css/';
    const assetsJS  = 'assets/js/';
    const assetsFiles = 'assets/files/';

    const downloadedMap = new Map(); // originalAbsUrl -> localPath

    // Helper untuk unduh satu aset
    const downloadAsset = async (rawUrl) => {
      const abs = absolutize(finalUrl, rawUrl);
      if (!abs) return null;
      if (downloadedMap.has(abs)) return downloadedMap.get(abs);

      let data, ctype;
      try {
        const { buffer, contentType: ct } = await fetchBinary(abs);
        data = buffer; ctype = ct;
      } catch { return null; }

      // Skip JSON
      if (/json/.test(ctype)) return null;

      // Tentukan subfolder & nama file
      let sub, ext;
      if (/text\/css/.test(ctype) || /\.css(\?|#|$)/i.test(abs)) {
        sub = assetsCSS; ext = '.css';
      } else if (/javascript|ecmascript/.test(ctype) || /\.m?js(\?|#|$)/i.test(abs)) {
        sub = assetsJS; ext = '.js';
      } else {
        sub = assetsFiles;
        // tebak ext dari mime atau URL
        const urlObj = new URL(abs);
        const base = urlObj.pathname.split('/').pop() || 'file';
        const guessed = extFromMime(ctype, (base.includes('.') ? '' : '')); // jika URL sudah punya ext, biarkan
        if (!base.includes('.') && guessed) ext = guessed; else ext = '';
      }

      const urlObj = new URL(abs);
      let base = urlObj.pathname.split('/').pop() || 'file';
      base = safeName(base);
      if (!base.includes('.') && ext) base = base + ext;

      // Hindari duplikat nama
      let local = sub + base;
      let i = 1;
      while (zip.file(local)) {
        const dot = base.lastIndexOf('.');
        const name = dot > -1 ? base.slice(0, dot) : base;
        const ex = dot > -1 ? base.slice(dot) : '';
        local = `${sub}${name}-${i}${ex}`;
        i++;
      }

      zip.file(local, data);
      downloadedMap.set(abs, local);
      return local;
    };

    // Unduh semua kandidat
    const arrLinks = [...links];
    for (const l of arrLinks) { await downloadAsset(l); }

    // 4) Rewrite HTML agar referensi ke lokal
    // - href/src/poster → ke path di zip bila diunduh
    const rewriteAttr = (i, el, attr) => {
      const $el = $(el);
      const raw = $el.attr(attr);
      if (!raw) return;
      const abs = absolutize(finalUrl, raw);
      if (!abs) return;
      const local = downloadedMap.get(abs);
      if (local) $el.attr(attr, local);
    };

    $('link[rel="stylesheet"][href]').each((i, el) => rewriteAttr(i, el, 'href'));
    $('script[src]').each((i, el) => rewriteAttr(i, el, 'src'));
    $('img[src]').each((i, el) => rewriteAttr(i, el, 'src'));
    $('video[poster]').each((i, el) => rewriteAttr(i, el, 'poster'));
    $('audio[src]').each((i, el) => rewriteAttr(i, el, 'src'));
    $('source[src]').each((i, el) => rewriteAttr(i, el, 'src'));
    $('link[rel="preload"][href], link[rel="icon"][href], link[rel="shortcut icon"][href]')
      .each((i, el) => rewriteAttr(i, el, 'href'));

    // 5) Bersihkan teks (tanpa %20 / \n literal) untuk caption/preview
    const prettyHtml = cleanText($.html());

    // 6) Masukkan index.html ke ZIP
    zip.file('index.html', Buffer.from(prettyHtml, 'utf8'));

    // 7) Kirim ZIP + teks rapi
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const previewLimit = 2500; // supaya muat 1 pesan
    const preview =
      'Hasil Grab:\n' +
      `• URL: ${finalUrl}\n` +
      `• Files: index.html + ${downloadedMap.size} aset\n\n` +
      'Cuplikan HTML:\n' +
      '```html\n' +
      prettyHtml.slice(0, previewLimit) +
      (prettyHtml.length > previewLimit ? '\n... (terpotong)' : '') +
      '\n```';

    await ctx.client.sendMessage(
      ctx.from,
      {
        document: zipBuf,
        mimetype: 'application/zip',
        fileName: 'site.zip',
        caption: preview
      },
      { quoted: ctx.message }
    );

  } catch (e) {
    const msg = e?.message || String(e);
    await ctx.client.sendMessage(
      ctx.from,
      { text: 'Gagal membuat ZIP.\nAlasan: ' + msg + '\nURL: ' + finalUrl },
      { quoted: ctx.message }
    );
  }
}

handler.command = (ctx) => /^[.!](get)\b/i.test(String(ctx.text || ''));
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'tools_getcode_zip';
handler.tags = ['tools', 'web'];
handler.cost = 2;
handler.help = [
  '.get <url web>',
  '(bisa reply pesan yang berisi URL)',
  'Output: 1 ZIP (html, css, js, file lain non-JSON) + teks rapi'
];

module.exports = handler;