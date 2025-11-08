// plugins/group-tagall.js
// .tagall [pesan] — mention semua member dengan daftar terlihat (khusus grup)

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  const m = text.match(/^[.!](tagall|notifyall)(?:\s+([\s\S]+))?$/i);
  if (!m) return;

  // hanya jalan di grup
  if (!ctx.isGroup) {
    return ctx.reply('Fitur ini hanya untuk grup.');
  }

  // opsional: hanya admin/owner
  if (!(ctx.role === 'owner' || ctx.role === 'admin')) {
    return ctx.reply('Fitur ini khusus Admin/Owner.');
  }

  try {
    const md = await ctx.client.groupMetadata(ctx.from);
    const members = (md?.participants || []).map(p => p.id).filter(Boolean);

    if (!members.length) {
      return ctx.reply('Tidak ada member yang bisa di-tag.');
    }

    const msg = (m[2] || 'Tag semua').trim();

    // Tampilkan daftar @username (fallback ke id local-part)
    const visibleHandles = members.map(id => {
      // contoh: 628xx@s.whatsapp.net atau xxxxx@lid atau 628xx:1@s.whatsapp.net
      const local = String(id).split('@')[0].split(':')[0];
      return '@' + local;
    });

    const caption =
      `《 Tag All 》\n` +
      `- Pesan : ${msg}\n\n` +
      visibleHandles.join(' ');

    await ctx.client.sendMessage(
      ctx.from,
      {
        text: caption,
        mentions: members, // penting agar benar² nge-mention (LID & non-LID)
      },
      { quoted: ctx.message }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal tagall: ${e?.message || e}`);
  }
}

handler.command  = (ctx) => /^[.!](tagall|notifyall)\b/i.test(ctx.text || '');
handler.role     = 'admin';          // Admin/Owner saja
handler.scope    = 'group';          // khusus grup
handler.enabled  = true;
handler.key      = 'group_tagall';
handler.tags     = ['group', 'tools'];
handler.cost     = 1;                // pakai 1 limit per pemakaian
handler.help     = ['.tagall [pesan]'];

module.exports = handler;