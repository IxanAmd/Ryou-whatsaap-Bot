// plugins/group-hidetag.js
// .hidetag [pesan] — mention semua member tanpa menampilkan daftar (silent mention, khusus grup)

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  const m = text.match(/^[.!](hidetag|ht)(?:\s+([\s\S]+))?$/i);
  if (!m) return;

  if (!ctx.isGroup) {
    return ctx.reply('Fitur ini hanya untuk grup.');
  }

  if (!(ctx.role === 'owner' || ctx.role === 'admin')) {
    return ctx.reply('Fitur ini khusus Admin/Owner.');
  }

  try {
    const md = await ctx.client.groupMetadata(ctx.from);
    const members = (md?.participants || []).map(p => p.id).filter(Boolean);

    if (!members.length) {
      return ctx.reply('Tidak ada member yang bisa di-mention.');
    }

    const msg = (m[2] || ' ').trim(); // boleh kosong (spasi) biar tetap “silent”

    await ctx.client.sendMessage(
      ctx.from,
      {
        text: `《 Hide Tag 》\n- ${msg}`,
        mentions: members, // hanya di mentions, teks tidak berisi @... => hidetag
      },
      { quoted: ctx.message }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal hidetag: ${e?.message || e}`);
  }
}

handler.command  = (ctx) => /^[.!](hidetag|ht)\b/i.test(ctx.text || '');
handler.role     = 'admin';          // Admin/Owner saja
handler.scope    = 'group';          // khusus grup
handler.enabled  = true;
handler.key      = 'group_hidetag';
handler.tags     = ['group', 'tools'];
handler.cost     = 1;                // pakai 1 limit per pemakaian
handler.help     = ['.hidetag [pesan]'];

module.exports = handler;