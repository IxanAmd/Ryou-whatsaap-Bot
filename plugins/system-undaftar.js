// plugins/undaftar.js
// Fitur hapus pendaftaran mandiri: .undaftar

let jidNormalizedUser = (j) => j;
try { ({ jidNormalizedUser } = require('@whiskeysockets/baileys')); } catch {}

const box = (title, lines = []) => {
  const top = `┌────《 ${title} 》───`;
  const body = lines.map(l => `│ ${l}`).join('\n');
  const bot  = `└────────────`;
  return [top, body, bot].join('\n');
};

async function doUndaftar(ctx) {
  const userJid = (ctx.sender && ctx.sender.endsWith?.('@lid') && jidNormalizedUser)
    ? jidNormalizedUser(ctx.sender)
    : ctx.sender;

  // Belum terdaftar
  if (!global.USERDB?.isRegistered?.(userJid)) {
    await ctx.reply('⚠️ Data kamu belum terdaftar.');
    return;
  }

  // Hapus dari USERDB
  const ok = global.USERDB?.unregister?.(userJid);
  if (!ok) {
    await ctx.reply('❌ Gagal un-daftar. Hubungi owner.');
    return;
  }

  // Hapus profil dari store (kalau ada)
  try {
    const key = global.USERDB.keyOf(userJid);
    const store = (global.__REG_STORE__ = global.__REG_STORE__ || {});
    store.profile = store.profile || new Map();
    store.profile.delete(key);
  } catch {}

  const caption = box('UNDAFTAR BERHASIL', [
    `User : ${userJid}`,
    `Status: data registrasi dihapus`
  ]);

  await ctx.reply(caption);
}

async function handler(ctx) {
  const t = String(ctx.text || '').trim();
  if (!/^[.!]undaftar\b/i.test(t)) return;
  return doUndaftar(ctx);
}

handler.command  = (ctx) => /^[.!]undaftar\b/i.test(String(ctx.text || ''));
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['system'];
handler.key      = 'undaftar';
handler.nolimit  = true;
handler.register = false; // biar bisa jalan walau user belum register (akan di-handle cek di atas)
handler.cost     = 0;
handler.help     = ['.undaftar'];

module.exports = handler;