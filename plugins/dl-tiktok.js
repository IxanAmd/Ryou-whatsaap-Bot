// plugins/tiktok.js
// Cmd: .tt <url> / .tiktok <url>
// Limit cost: 2 (global), requires register.

const axios = require('axios');

function box(title, lines) {
  const top = `┌────《 ${title} 》───`;
  const body = (lines || []).map(l => `│ ${l}`).join('\n');
  const bot = `└────────────`;
  return [top, body, bot].join('\n');
}

function firstUrl(text = '') {
  const m = (text || '').match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

async function handler(ctx) {
  const url = firstUrl(ctx.text);

  // --- check kalau user ketik ".tt" tanpa url ---
  if (!url) {
    return ctx.reply('❗ Link?\nFormat: *.tt <url_tiktok>*\nContoh: *.tt https://vm.tiktok.com/xxxx*');
  }

  await ctx.reply('⏳ Tunggu sebentar, lagi ngunduh…');

  try {
    const params = new URLSearchParams({ url, hd: '1' }).toString();
    const { data } = await axios.post(
      'https://tikwm.com/api/',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': 'current_language=en',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari',
        },
        timeout: 25_000
      }
    );

    if (!data || !data.data) {
      return ctx.reply('⚠️ Gagal mengambil data dari TikTok.');
    }

    const res = data.data;
    const title   = res.title || '-';
    const author  = res.author?.nickname || '-';
    const region  = res.region || '-';
    const views   = Number(res.play_count || 0).toLocaleString('id-ID');
    const likes   = Number(res.digg_count || 0).toLocaleString('id-ID');
    const comms   = Number(res.comment_count || 0).toLocaleString('id-ID');

    const caption = box('TIKTOK DOWNLOADER', [
      `• Judul  : ${title}`,
      `• Author : ${author}`,
      `• Region : ${region}`,
      `• Views  : ${views}`,
      `• Likes  : ${likes}`,
      `• Komen  : ${comms}`,
      '',
      `• Sumber : tikwm.com`,
      `• Note   : Audio dikirim terpisah bila tersedia`
    ]);

    if (Array.isArray(res.images) && res.images.length > 0) {
      let first = true;
      for (const img of res.images) {
        await ctx.client.sendMessage(ctx.from, {
          image: { url: img },
          caption: first ? caption : ''
        });
        first = false;
      }
    } else if (res.play) {
      await ctx.client.sendMessage(ctx.from, {
        video: { url: res.play },
        caption
      });
    } else {
      return ctx.reply('⚠️ Konten tidak dikenali (bukan foto/video).');
    }

    if (res.music && /^https?:\/\//i.test(res.music)) {
      setTimeout(async () => {
        try {
          await ctx.client.sendMessage(ctx.from, {
            audio: { url: res.music },
            mimetype: 'audio/mp4'
          });
        } catch {}
      }, 1500);
    }

  } catch (e) {
    console.error('[tiktok] error:', e?.message || e);
    await ctx.reply('❌ Terjadi kesalahan saat memproses video.');
  }
}

handler.command  = /^[.!](tt|tiktok)(\s+|$)/i;
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tiktok_dl';
handler.nolimit  = false;
handler.cost     = 2;   // biaya 2 limit
handler.register = true;
handler.help     = ['.tt <url>', '.tiktok <url>'];

module.exports = handler;