// plugins/store_payment.js
// .pay / .payment  → info pilihan; .dana / .gopay → detail

const IMAGE = 'https://files.catbox.moe/h3njeb.jpg';
const FOOT  = '© isan';

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  if (!/^[.!](pay|payment|dana|gopay)\b/i.test(txt)) return;

  const cmd = txt.slice(1).split(/\s+/)[0].toLowerCase();

  try {
    if (cmd === 'pay' || cmd === 'payment') {
      const cap = [
        'Pilih Format Payment',
        '',
        '• .dana',
        '',
        FOOT
      ].join('\n');
      await ctx.client.sendMessage(ctx.from, { image: { url: IMAGE }, caption: cap }, { quoted: ctx.message });
      return;
    }
    if (cmd === 'dana') {
      const cap = [
        '*PAYMENT DANA : @isan*',
        '',
        '• *Nomor:* 081262253187',
        '',
        '*[ ! ] Penting :* Wajib memberikan Bukti Transfer'
      ].join('\n');
      await ctx.client.sendMessage(ctx.from, { image: { url: IMAGE }, caption: cap }, { quoted: ctx.message });
      return;
    }
  } catch (e) {
    await ctx.reply(`❌ Error: ${e?.message || e}`);
  }
}

handler.command  = (ctx) => /^[.!](pay|payment|dana|gopay)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'store_payment';
handler.tags     = ['store'];
handler.cost     = 0;
handler.help     = ['.pay', '.payment', '.dana', '.gopay'];

module.exports = handler;