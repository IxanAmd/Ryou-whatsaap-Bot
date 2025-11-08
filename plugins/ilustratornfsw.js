// plugins/ai-illustrous.js
// .illust <prompt> | <ratio>  — AI illustration via nekolabs (wai-nsfw-illustrous v11)

const axios = require('axios');

// ── helpers ─────────────────────────────────────────────────────────
function parseArgs(text = '') {
  // Contoh: ".illust Shiroko | 16:9"
  const m = text.trim().match(/^[.!](illust|wai|illustrous)\s+([\s\S]+)/i);
  if (!m) return null;
  const raw = m[2].trim();
  const [promptPart, ratioPart] = raw.split('|').map(s => (s || '').trim());
  const prompt = promptPart || '';
  let ratio = (ratioPart || '').replace(/\s+/g, '');
  if (!/^\d+\s*[:x]\s*\d+$/i.test(ratio)) ratio = ''; // validasi sederhana "a:b" atau "a x b"
  ratio = ratio.replace(/x/i, ':'); // izinkan "16x9" -> "16:9"
  return { prompt, ratio: ratio || '1:1' };
}

async function fetchIllust(prompt, ratio) {
  const url = `https://api.nekolabs.my.id/ai/wai-nsfw-illustrous/v11`;
  const params = { prompt, ratio };

  // response bisa image langsung atau JSON
  const res = await axios.get(url, {
    params,
    responseType: 'arraybuffer',
    timeout: 60_000
  });

  const ctype = String(res.headers['content-type'] || '');
  if (/image\//i.test(ctype)) {
    return { type: 'buffer', data: Buffer.from(res.data) };
  }

  // coba parse JSON
  try {
    const text = Buffer.from(res.data).toString('utf8');
    const json = JSON.parse(text);
    const outUrl = json.url || json.result || json.data?.url;
    if (!outUrl) throw new Error(json.message || 'Endpoint tidak mengembalikan gambar.');
    return { type: 'url', data: outUrl };
  } catch {
    // fallback: kirim sebagai buffer
    return { type: 'buffer', data: Buffer.from(res.data) };
  }
}

// ── handler ─────────────────────────────────────────────────────────
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](illust|wai|illustrous)\b/i.test(txt)) return;

  const parsed = parseArgs(txt);
  if (!parsed || !parsed.prompt) {
    return ctx.reply('❗Prompt wajib diisi.\nContoh: *.illust Shiroko* atau *.illust Shiroko | 16:9*');
  }

  try {
    await ctx.reply('🎨 Membuat ilustrasi...');

    const out = await fetchIllust(parsed.prompt, parsed.ratio);

    if (out.type === 'url') {
      await ctx.client.sendMessage(
        ctx.from,
        { image: { url: out.data }, caption: `✅ Selesai\nPrompt: ${parsed.prompt}\nRasio: ${parsed.ratio}` },
        { quoted: ctx.message }
      );
    } else {
      await ctx.client.sendMessage(
        ctx.from,
        { image: out.data, caption: `✅ Selesai\nPrompt: ${parsed.prompt}\nRasio: ${parsed.ratio}` },
        { quoted: ctx.message }
      );
    }
  } catch (e) {
    await ctx.reply(`❌ Gagal generate: ${e?.message || e}`);
  }
}

// ── metadata (sesuai kerangka handler.js kamu) ──────────────────────
handler.command  = (ctx) => /^[.!](illust|wai|illustrous)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_illustrous';
handler.tags     = ['ai', 'image'];
handler.cost     = 6; // pakai 6 limit per pemakaian
handler.help     = ['.illust <prompt>', '.illust <prompt> | 16:9'];

module.exports = handler;