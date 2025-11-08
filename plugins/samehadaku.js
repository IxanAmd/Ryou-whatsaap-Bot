
const axios = require("axios");
const cheerio = require("cheerio");

class Samehada {
  async latest() {
    try {
      const { data } = await axios.get("https://samehadaku.email/anime-terbaru/");
      const $ = cheerio.load(data);
      const posts = [];
      $(".post-show li").each((_, el) => {
        const title = $(el).find(".entry-title a").attr("title");
        const link = $(el).find(".entry-title a").attr("href");
        const date = $(el)
          .find(".dashicons-calendar")
          .parent()
          .text()
          .replace("Released on:", "")
          .trim();
        posts.push({ title, date, link });
      });
      return posts;
    } catch (e) {
      return [];
    }
  }

  async search(text) {
    const { data } = await axios.get("https://samehadaku.email");
    const $ = cheerio.load(data);
    const nonce = $("#live_search-js-extra").html()?.match(/"nonce":"([^"]+)"/)?.[1];
    if (!nonce) throw new Error("Gagal ambil nonce.");

    const { data: result } = await axios.get(
      `https://samehadaku.email/wp-json/eastheme/search/?keyword=${encodeURIComponent(text)}&nonce=${nonce}`
    );
    return Object.values(result).map((v) => v);
  }

  async detail(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("h1.entry-title").text().trim();
    const image = $(".thumb img").attr("src");
    const rating = $('.rtg span[itemprop="ratingValue"]').text().trim();
    const description = $(".entry-content-single").text().trim();

    const genres = $(".genre-info a")
      .map((_, el) => $(el).text().trim())
      .get();

    const episodes = $(".lstepsiode.listeps li")
      .map((_, el) => ({
        title: $(el).find(".epsleft .lchx a").text().trim(),
        url: $(el).find(".epsleft .lchx a").attr("href"),
        date: $(el).find(".epsleft .date").text().trim(),
      }))
      .get();

    return { title, image, rating, description, genres, episodes };
  }

  async download(url) {
    if (!url.includes("samehadaku.email")) throw new Error("URL tidak valid.");
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("h1.entry-title").text().trim();
    const result = { title, url, unduhan: [] };

    const serverList = $("div#server > ul > li");
    for (let i = 0; i < serverList.length; i++) {
      const server = $(serverList[i]);
      const info = {
        nama: server.find("span").text().trim(),
        tipe: server.find("div").attr("data-type"),
        nume: server.find("div").attr("data-nume"),
        post: server.find("div").attr("data-post"),
      };

      const form = new URLSearchParams({
        action: "player_ajax",
        post: info.post,
        nume: info.nume,
        type: info.tipe,
      });

      const linkRes = await axios.post(
        "https://samehadaku.email/wp-admin/admin-ajax.php",
        form,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Origin: "https://samehadaku.email",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      const $link = cheerio.load(linkRes.data);
      info.tautan = $link("iframe").attr("src");
      result.unduhan.push(info);
    }

    return result;
  }
}

async function handler(ctx) {
  const txt = String(ctx.text || "").trim();
  const m = txt.match(/^[.!](samehada|samehadaku)\b(?:\s+(.+))?/i);
  if (!m) return;

  const [cmd, argsRaw] = [m[1], (m[2] || "").trim()];
  if (!argsRaw)
    return ctx.reply(
      `*[ SAMEHADAKU MENU ]*\n` +
        `• .samehada search <query>\n` +
        `• .samehada detail <url>\n` +
        `• .samehada episode <url>`
    );

  const feature = argsRaw.split(" ")[0];
  const input = argsRaw.slice(feature.length + 1).trim();
  const same = new Samehada();

  if (feature === "search") {
    if (!input) return ctx.reply(`• Example: .samehada search one piece`);
    await ctx.reply("🔎 Mencari anime...");
    try {
      const res = await same.search(input);
      const caption =
        `Ketik *.samehada detail [url]* untuk melihat detail.\n\n` +
        res
          .map(
            (a, i) =>
              `*${i + 1}.* ${a.title}\n• Type: ${a.data.type}\n• Score: ${a.data.score}\n• Genre: ${a.data.genre}\n• URL: ${a.url}`
          )
          .join("\n\n");
      const thumb = res[0]?.img || null;
      if (thumb) {
        await ctx.client.sendMessage(ctx.from, {
          image: { url: thumb },
          caption,
        });
      } else {
        await ctx.reply(caption);
      }
    } catch (e) {
      await ctx.reply("❌ Gagal mencari anime.");
    }
  }

  else if (feature === "detail") {
    if (!input) return ctx.reply(`• Example: .samehada detail <url>`);
    await ctx.reply("📖 Mengambil detail anime...");
    try {
      const res = await same.detail(input);
      const caption =
        `*${res.title}*\n` +
        `• Score: ${res.rating}\n` +
        `• Genre: ${res.genres.join(", ")}\n\n` +
        `${res.description}\n\n` +
        `Ketik *.samehada episode [url]* untuk melihat episode.\n\n` +
        res.episodes
          .map(
            (a) =>
              `• ${a.title}\n  ${a.date}\n  ${a.url}`
          )
          .join("\n\n");
      await ctx.client.sendMessage(ctx.from, {
        image: { url: res.image },
        caption,
      });
    } catch {
      await ctx.reply("❌ Gagal ambil detail anime.");
    }
  }

  else if (feature === "episode") {
    if (!input) return ctx.reply(`• Example: .samehada episode <url>`);
    await ctx.reply("🎬 Mengambil tautan episode...");
    try {
      const data = await same.download(input);
      const mp4 = data.unduhan.find((a) => a.tautan?.endsWith(".mp4"));
      const caption =
        `*${data.title}*\n• ${mp4?.nama || "-"}\n• Download: ${mp4?.tautan || "Tidak ditemukan"}`;
      if (mp4?.tautan) {
        await ctx.client.sendMessage(ctx.from, {
          document: { url: mp4.tautan },
          fileName: `${data.title}.mp4`,
          mimetype: "video/mp4",
          caption,
        });
      } else {
        await ctx.reply(caption);
      }
    } catch {
      await ctx.reply("❌ Gagal ambil tautan download.");
    }
  }
}

handler.command  = (ctx) => /^[.!](samehada|samehadaku)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'samehadaku';
handler.tags     = ['anime'];
handler.nolimit  = false;
handler.register = false;
handler.help     = ['.samehada search <query>', '.samehada detail <url>', '.samehada episode <url>'];

module.exports = handler;