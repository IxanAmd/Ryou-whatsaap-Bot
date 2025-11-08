// plugins/jjanime.js
// .jjanime — ambil 1 video TikTok random bertema "jj am anime" (bisa custom query)

const ENDPOINT = 'https://tikwm.com/api/feed/search';

function pick(arr) { return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }
function fmtNum(n){ n = Number(n||0); return n.toLocaleString('en-US'); }

async function searchTikTok(query = 'random jj am anime', { count = 15, cursor = 0, web = 1, hd = 1 } = {}) {
  const body = new URLSearchParams({
    keywords: query,
    count: String(count),
    cursor: String(cursor),
    web: String(web),
    hd: String(hd),
  }).toString();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) jjanime-bot/1.0',
    },
    body
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const list = data?.data?.videos || [];
  if (!Array.isArray(list) || !list.length) throw new Error('No videos');

  const v = pick(list);
  if (!v) throw new Error('Random pick failed');

  const makeAbs = (p) => (typeof p === 'string' && p.startsWith('/')) ? ('https://tikwm.com' + p) : p;

  return {
    id: v.id,
    title: v.title || '(no title)',
    author: {
      name: v?.author?.nickname || '-',
      username: v?.author?.unique_id || '-',
    },
    stats: {
      play: v.play_count, like: v.digg_count, comment: v.comment_count, share: v.share_count,
    },
    media: {
      nowm: makeAbs(v.play),        // no watermark
      wm: makeAbs(v.wmplay),        // with watermark
      music: makeAbs(v.music),
      cover: makeAbs(v.cover) || makeAbs(v.origin_cover) || null,
    }
  };
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim();
  const m = txt.match(/^[.!](jjanime)\b(?:\s+(.+))?/i);
  if (!m) return;

  const query = (m[2] || '').trim();            // opsional: custom kata kunci
  const qUse = query || 'random jj am anime';   // default

  try {
    await ctx.reply('⏳ Mencari video...');
    const item = await searchTikTok(qUse);

    const cap =
`*[ RANDOM JJ ANIME ]*
• Title : ${item.title}
• Author: ${item.author.name} (@${item.author.username})
• Views : ${fmtNum(item.stats.play)}  • ❤ ${fmtNum(item.stats.like)}
• Comms : ${fmtNum(item.stats.comment)} • Shares ${fmtNum(item.stats.share)}
• Query : ${qUse}`;

    // kirim video no-watermark; kalau gagal, coba yang WM
    try {
      await ctx.client.sendMessage(ctx.from, {
        video: { url: item.media.nowm },
        caption: cap,
        mimetype: 'video/mp4',
        fileName: 'jjanime.mp4'
      });
    } catch {
      await ctx.client.sendMessage(ctx.from, {
        video: { url: item.media.wm || item.media.nowm },
        caption: cap + '\n\n(⚠️ fallback: wm)',
        mimetype: 'video/mp4',
        fileName: 'jjanime_wm.mp4'
      });
    }
  } catch (err) {
    await ctx.reply('*[ VIDEO NOT FOUND ]*');
  }
}

handler.command  = (ctx) => /^[.!](jjanime)\b/i.test(String(ctx.text || ''));
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'jjanime';
handler.tags     = ['internet'];
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.jjanime', '.jjanime <kata kunci opsional>'];

module.exports = handler;