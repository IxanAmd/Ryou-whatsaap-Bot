// plugins/limit.js
// .limit — tampilkan ringkas: Nama, Role, Status, Sisa limit

function box(title, lines) {
  const top = `┌────《 ${title} 》───`;
  const body = (lines || []).map(l => `│ ${l}`).join('\n');
  const bot = `└────────────`;
  return [top, body, bot].join('\n');
}

async function handler(ctx) {
  const name   = ctx.message?.pushName || 'User';
  const role   = (ctx.role || 'user').toUpperCase();
  const quota  = global.USAGE.quota();
  const used   = Number(global.USAGE.total?.get?.(ctx.sender)?.used || 0);
  const sisa   = ctx.unlimited ? '∞' : Math.max(0, quota - used);
  const status = ctx.unlimited ? 'UNLIMITED' : `FREE (Quota ${quota})`;

  const caption = box('LIMIT', [
    `° Nama  : ${name}`,
    `° Role  : ${role}`,
    `° Status: ${status}`,
    `° Sisa  : ${sisa}`
  ]);

  await ctx.reply(caption);
}

handler.command = /^[.!]limit$/i;
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'limit';
handler.nolimit = true;   // cek limit tidak memotong limit
handler.register = false;
handler.help = ['.limit'];

module.exports = handler;