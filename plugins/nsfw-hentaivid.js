// plugins/vidhentai.js
// ctx version — SFMCompile random video scraper

const axios = require('axios');
const cheerio = require('cheerio');

// === Scraper utama ===
async function xhentai() {
  const page = Math.floor(Math.random() * 1153);
  const url = `https://sfmcompile.club/page/${page}`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const hasil = [];

    $('#primary > div > div > ul > li > article').each((_, el) => {
      hasil.push({
        title: $(el).find('header > h2').text().trim(),
        link: $(el).find('header > h2 > a').attr('href'),
        category: $(el).find('header > div.entry-before-title > span > span').text().replace('in ', '').trim(),
        share_count: $(el).find('header > div.entry-after-title > p > span.entry-shares').text().trim(),
        views_count: $(el).find('header > div.entry-after-title > p > span.entry-views').text().trim(),
        type: $(el).find('source').attr('type') || 'image/jpeg',
        video_1: $(el).find('source').attr('src') || $(el).find('img').attr('data-src'),
        video_2: $(el).find('video > a').attr('href') || ''
      });
    });

    return hasil;
  } catch (err) {
    console.error('Scraper Error:', err.message);
    return [];
  }
}

// === Handler utama ===
async function handler(ctx) {
  const text = (ctx.text || '').trim();
  await ctx.reply(
    `👋 Halo!\nPerintah *${ctx.command || '.vidhentai'}* sedang dijalankan.\nBot akan mengirim hasil di chat pribadi (PM).`
  );

  const results = await xhentai();
  if (!results.length) {
    return ctx.reply('⚠️ Gagal mengambil data dari situs sumber.');
  }

  const randomItem = results[Math.floor(Math.random() * results.length)];
  const caption = `
⭔ *Title:* ${randomItem.title}
⭔ *Category:* ${randomItem.category}
⭔ *Mimetype:* ${randomItem.type}
⭔ *Views:* ${randomItem.views_count}
⭔ *Shares:* ${randomItem.share_count}
⭔ *Source:* ${randomItem.link}
⭔ *Media Url:* ${randomItem.video_1 || '(tidak tersedia)'}
`.trim();

  try {
    await ctx.client.sendMessage(ctx.sender, {
      video: { url: randomItem.video_1 },
      caption
    });
  } catch (err) {
    console.error('Send error:', err.message);
    await ctx.reply('⚠️ Gagal mengirim video. Mungkin file sudah dihapus.');
  }
}

// === Metadata plugin ===
handler.command = (ctx) => /^[.!]vidhentai\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'private';
handler.tags = ['nsfw'];
handler.key = 'vidhentai';
handler.enabled = true;
handler.premium = false;
handler.cost     = 5; //
handler.nolimit = false;
handler.help = ['.vidhentai'];

module.exports = handler;