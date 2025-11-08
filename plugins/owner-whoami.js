async function handler(ctx) {
  const msg =
`Sender : ${ctx.sender}
Role   : ${ctx.role}
isOwner: ${ctx.role === 'owner' ? 'YES' : 'NO'}`;
  await ctx.reply(msg);
}
handler.command = /^!whoami$/i;
handler.role = 'all';
handler.scope = 'all';
handler.enabled = true;
handler.key = 'whoami';
handler.limit = 5;
module.exports = handler;