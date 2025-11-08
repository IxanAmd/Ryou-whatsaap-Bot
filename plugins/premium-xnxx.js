// plugins/xnxx.js
// Versi ctx + cost system, no premium
// ⚠️ NSFW content — gunakan di private mode

const Scraper = require('../../lib/scrape_file/tools/xnxx'); // sesuaikan path scrape kamu

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  ctx.client.xnxx = ctx.client.xnxx || {};

  if (!text) {
    return ctx.reply(
      `❗ Contoh:\n.xnxx genshin impact`
    );
  }

  await ctx.reply(`🔎 Sedang mencari video untuk kata kunci: *${text}*`);

  try {
    const video = await Scraper.search(text);
    if (!video.result?.length) {
      return ctx.reply('⚠️ Tidak ditemukan hasil untuk kata kunci tersebut.');
    }

    const hasilList = video.result
      .map(
        (a, i) =>
          `*${i + 1}.* ${a.title}\n🧩 Info: ${a.info}\n🔗 Source: ${a.link}`
      )
      .join('\n\n');

    const caption = `*[ XNXX SEARCH RESULTS ]*\n\n${hasilList}`;
    const sent = await ctx.reply(caption);

    await ctx.reply(
      `Ketik salah satu angka *1 - ${video.result.length}* untuk mengunduh video.`,
      { quoted: sent }
    );

    ctx.client.xnxx[ctx.sender] = video.result;
  } catch (err) {
    console.error('XNXX Search Error:', err);
    await ctx.reply('❌ Gagal mengambil data dari server.');
  }
}

// === listener angka ===
handler.before = async (ctx) => {
  ctx.client.xnxx = ctx.client.xnxx || {};
  if (!ctx.text) return;
  if (isNaN(ctx.text)) return;
  if (!ctx.client.xnxx[ctx.sender]) return;

  const index = Number(ctx.text) - 1;
  const list = ctx.client.xnxx[ctx.sender];
  if (index < 0 || index >= list.length) {
    return ctx.reply('⚠️ Nomor yang kamu pilih tidak valid.');
  }

  const selected = list[index];
  await ctx.reply(`⏳ Sedang mengunduh video: *${selected.title}*`);

  try {
    const hasil = await Scraper.download(selected.link);
    await ctx.replyVideo(
      hasil.files?.low || hasil.files?.high,
      `🎬 *${selected.title}*\n📂 ${selected.link}`
    );
  } catch (e) {
    console.error('XNXX Download Error:', e);
    await ctx.reply('❌ Gagal mengunduh video. Mungkin link sudah tidak aktif.');
  }

  delete ctx.client.xnxx[ctx.sender];
};

// === metadata ===
handler.command = (ctx) => /^[.!]xnxx\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'private';
handler.tags = ['nsfw'];
handler.key = 'xnxx';
handler.enabled = true;
handler.cost = 5; // kurangi 5 limit saat digunakan
handler.help = ['.xnxx <keyword>'];
handler.desc = 'Cari dan unduh video dari XNXX';

module.exports = handler;