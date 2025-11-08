// plugins/maker-ngl.js
// .ngl <title> <text> — generate fake NGL image

const axios = require('axios');

function parseNglArgs(txt) {
  // hapus prefix & command
  const body = txt.replace(/^[.!]ngl\b/i, '').trim();
  if (!body) return { ok: false };

  // dukung title pakai kutip: .ngl "My Title" isi teks...
  let title = '';
  let rest  = '';

  if (/^"[^"]+"|^'[^']+'/.test(body)) {
    const m = body.match(/^"([^"]+)"|^'([^']+)'/);
    title = (m[1] || m[2] || '').trim();
    rest  = body.slice(m[0].length).trim();
  } else {
    const sp = body.indexOf(' ');
    if (sp === -1) return { ok: false };
    title = body.slice(0, sp).trim();
    rest  = body.slice(sp + 1).trim();
  }

  if (!title || !rest) return { ok: false };
  return { ok: true, title, text: rest };
}

async function handler(ctx) {
  try {
    const txt = (ctx.text || '').trim();
    // pastikan hanya jalan untuk .ngl
    if (!/^[.!]ngl\b/i.test(txt)) return;

    const parsed = parseNglArgs(txt);
    if (!parsed.ok) {
      return ctx.reply(
        'Format: *.ngl <title> <text>*\n' +
        'Contoh:\n' +
        '• *.ngl Anonymous Hai bang*\n' +
        '• *.ngl "Secret Confession" kamu lucu bgt'
      );
    }

    const { title, text } = parsed;

    await ctx.reply('⏳ Membuat gambar NGL...');
    const url = `https://flowfalcon.dpdns.org/imagecreator/ngl?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`;

    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (res.status !== 200 || !res.data) throw new Error(`API status ${res.status}`);

    const buffer = Buffer.from(res.data);

    // kirim TANPA quote untuk mengurangi risiko Bad MAC
    await ctx.client.sendMessage(ctx.from, {
      image: buffer,
      caption: `Title: ${title}\nText: ${text}`
    });
  } catch (e) {
    await ctx.reply(`❌ Gagal membuat NGL: ${e?.message || e}`);
  }
}

// metadata (sesuai pola router kamu)
handler.command  = (ctx) => /^[.!]ngl\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'maker_ngl';
handler.tags     = ['maker'];
handler.cost     = 2;
handler.help     = ['.ngl <title> <text>'];

module.exports = handler;