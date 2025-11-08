// plugins/free-proxy.js
// .proxy / .freeproxy / .getproxy — Ambil daftar proxy gratis dari api.nekolabs

const axios = require('axios');

function box(title, lines = []) {
  const head = `《 ${title} 》`;
  return `${head}\n${lines.map(l => `- ${l}`).join('\n')}`;
}

async function fetchProxies() {
  const url = 'https://api.nekolabs.my.id/tools/free-proxy';
  const res = await axios.get(url, { timeout: 15_000 });
  return res.data;
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](proxy|freeproxy|getproxy)\b/i.test(txt)) return;

  try {
    await ctx.reply('⏳ Mengambil daftar proxy gratis...');

    const data = await fetchProxies();

    // Struktur respons bisa berbeda — kita coba normalisasi:
    // Jika API mengembalikan object { data: [...] } atau array langsung
    let list = [];
    if (!data) throw new Error('Respon kosong dari API.');
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data.proxies)) list = data.proxies;
    else {
      // fallback: ambil nilai string/obj di root
      if (typeof data === 'object') {
        list = Object.values(data).flat().filter(Boolean);
      }
    }

    if (!list.length) throw new Error('Tidak ada proxy tersedia.');

    // Ambil maksimal 20 item supaya tidak spam chat
    const MAX = 20;
    const take = list.slice(0, MAX);

    // Normalisasi tiap item menjadi string "ip:port (type) - negara" jika memungkinkan
    const lines = take.map((it, i) => {
      if (typeof it === 'string') return `${i+1}. ${it}`;
      if (typeof it === 'object') {
        const host = it.ip || it.host || it.proxy || it.address || '';
        const port = it.port ? `:${it.port}` : '';
        const type = it.type || it.protocol || it.scheme || '';
        const country = it.country || it.location || '';
        const latency = it.latency ? ` • ${it.latency}ms` : '';
        const out = `${host}${port}${type ? ` (${type.toUpperCase()})` : ''}${country ? ` • ${country}` : ''}${latency}`;
        return `${i+1}. ${out}`.trim();
      }
      return `${i+1}. ${String(it)}`;
    });

    const caption = box('FREE PROXY', [
      `Total ditemukan: ${Array.isArray(list) ? list.length : '?'}`,
      '',
      ...lines,
      '',
      `Tampilkan ${Math.min(MAX, list.length)} dari ${list.length} hasil.`
    ]);

    // Kirim sebagai teks (bisa diubah ke file jika terlalu panjang)
    await ctx.client.sendMessage(ctx.from, { text: caption }, { quoted: ctx.message });
  } catch (e) {
    console.error('free-proxy error:', e);
    await ctx.reply(`❌ Gagal ambil proxy: ${e?.message || e}`);
  }
}

// metadata sesuai format handler kamu
handler.command  = (ctx) => /^[.!](proxy|freeproxy|getproxy)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_free_proxy';
handler.tags     = ['tools', 'network'];
handler.cost     = 1; // potong 1 limit per pemakaian
handler.help     = ['.proxy', '.freeproxy', '.getproxy'];

module.exports = handler;