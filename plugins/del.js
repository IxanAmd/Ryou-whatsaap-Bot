// plugins/tools-delete.js
// .del / .delete — Hapus pesan bot (reply pesan bot yang mau dihapus)

function unwrap(msg = {}) {
  if (msg.ephemeralMessage) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension.message);
  if (msg.documentWithCaptionMessage) return unwrap(msg.documentWithCaptionMessage.message);
  return msg;
}

function getQuotedInfo(ctx) {
  const root = unwrap(ctx.message?.message || {});
  const ci =
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    root?.messageContextInfo ||
    null;

  if (!ci) return null;

  // stanzaId/id pesan yang di-reply
  const stanzaId = ci.stanzaId || ci.stanzaID;
  // di group, participant adalah pengirim asli pesan yg di-reply
  const participant = ci.participant || null;

  return { stanzaId, participant };
}

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](del|delete)\b/i.test(txt)) return; // hanya tangkap .del / .delete

  const qi = getQuotedInfo(ctx);
  if (!qi || !qi.stanzaId) {
    return ctx.reply('Balas *pesan bot* yang mau dihapus dengan perintah *.del*');
  }

  // identitas bot
  const botJid = ctx.client?.user?.id || '';
  const botBare = botJid.split(':')[0]; // buang device tag jika ada

  // heuristik: kalau di grup, pastikan yang direply itu dari bot (participant == bot)
  if (ctx.isGroup && qi.participant && !qi.participant.startsWith(botBare)) {
    return ctx.reply('❌ Hanya bisa menghapus *pesan yang dikirim bot*. Balas pesan bot lalu ketik *.del*');
  }

  try {
    // Untuk menghapus pesan bot, gunakan fromMe: true + id = stanzaId
    await ctx.client.sendMessage(ctx.from, {
      delete: {
        remoteJid: ctx.from,
        fromMe: true,              // penting: hapus pesan yang bot kirim
        id: qi.stanzaId,
        // participant tidak wajib saat fromMe:true, tapi aman bila disertakan di grup
        participant: ctx.isGroup ? (qi.participant || undefined) : undefined,
      }
    });

    // opsional: beri konfirmasi singkat via chat (di-delete juga nggak perlu)
    // await ctx.reply('✅ Pesan dihapus.');
  } catch (e) {
    await ctx.reply(`❌ Gagal menghapus pesan: ${e?.message || e}\nPastikan kamu *reply pesan bot*, bukan pesan orang lain.`);
  }
}

// Metadata sesuai handler.js kamu
handler.command  = (ctx) => /^[.!](del|delete)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'tools_delete';
handler.tags     = ['tools', 'moderation'];
handler.nolimit  = true;     // hapus tidak memotong limit
handler.help     = ['.del (reply pesan bot yang mau dihapus)'];

module.exports = handler;