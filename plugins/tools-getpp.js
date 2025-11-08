// plugins/getpp.js
// Support nomor langsung, mention di grup, reply pesan, atau diri sendiri

function cleanJid(jid) {
  if (!jid) return null;
  // buang device tag
  const base = jid.split('@')[0].split(':')[0];
  return base + '@s.whatsapp.net';
}

async function handler(ctx) {
  let number = null;

  const txt = ctx.text.replace(/^[.!](getpp|getprofile|pp)\s*/i, '').trim();

  // 1) Nomor manual
  if (txt) {
    number = txt.replace(/[^\d]/g, '');
  }

  // 2) Mention di grup
  if (!number) {
    const mentioned = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) {
      number = mentioned[0].split('@')[0].split(':')[0]; // buang device tag
    }
  }

  // 3) Reply pesan user
  if (!number && ctx.message?.message?.extendedTextMessage?.contextInfo?.participant) {
    number = ctx.message.message.extendedTextMessage.contextInfo.participant.split('@')[0].split(':')[0];
  }

  // 4) Fallback ke pengirim sendiri
  if (!number) {
    number = (ctx.sender || '').split('@')[0].split(':')[0];
  }

  const jid = number + '@s.whatsapp.net';

  await ctx.reply('⏳ Mengambil foto profil...');
  try {
    let ppUrl;
    try {
      ppUrl = await ctx.client.profilePictureUrl(cleanJid(jid), 'image');
    } catch {
      ppUrl = null;
    }

    if (!ppUrl) {
      return ctx.reply('🍂 Tidak ada foto profil (mungkin disembunyikan oleh privasi).');
    }

    await ctx.client.sendMessage(ctx.from, {
      image: { url: ppUrl },
      caption: `✨ Foto profil untuk wa.me/${number}`
    }, { quoted: ctx.message });
  } catch (error) {
    console.error(error);
    await ctx.reply('🍂 Gagal mengambil Foto Profil.');
  }
}

handler.help = ['.getpp <nomor>', '.getpp @mention', '.getpp (reply pesan)', '.getpp (diri sendiri)'];
handler.command = /^[.!](getpp|getprofile|pp)(\s+.*)?$/i;
handler.tags = ['downloader'];
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'getpp';
handler.nolimit = false;
handler.cost = 5;
;

module.exports = handler;