const fetch = require('node-fetch');

async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const arg = txt.replace(/^[.!/]wuwa-sheets\b/i, '').trim();

  const characters = {
    sanhua: '1102',
    baizhi: '1103',
    lingyang: '1104',
    chixia: '1202',
    encore: '1203',
    mortefi: '1204',
    calcharo: '1301',
    yinlin: '1302',
    yuanwu: '1303',
    yangyang: '1402',
    aalto: '1403',
    jiyan: '1404',
    jianxin: '1405',
    'rover-spectro': '1502',
    verina: '1503',
    taoqi: '1601',
    danjin: '1602',
    'rover-havoc': '1604'
  };

  if (!arg) {
    const list = Object.keys(characters).map(k => `• ${k}`).join('\n');
    return ctx.reply(`*• Example :* .wuwa-sheets [chara name]\n\n*• List Characters :*\n${list}`);
  }

  const id = characters[arg.toLowerCase()];
  if (!id) {
    const list = Object.keys(characters).map(k => `• ${k}`).join('\n');
    return ctx.reply(`Karakter tidak ditemukan.\n\n*• Example :* .wuwa-sheets [chara name]\n\n*• List Characters :*\n${list}`);
  }

  try {
    const url = `https://raw.githubusercontent.com/DEViantUA/wuthering-waves-elevation-materials/main/character/${id}.png`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mendapatkan data gambar.');

    const buffer = await res.arrayBuffer();
    const img = Buffer.from(buffer);

    await ctx.client.sendMessage(ctx.from, {
      image: img,
      caption: `📄 *Wuthering Waves - Sheet*\nCharacter: *${arg.toUpperCase()}*`
    }, { quoted: ctx.message });

  } catch (err) {
    await ctx.reply(`⚠️ Gagal memuat sheet: ${err.message}`);
  }
}

handler.command  = (ctx) => /^[.!/]wuwa-sheets\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['anime'];
handler.key      = 'wuwa_sheets';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.wuwa-sheets [chara name]'];

module.exports = handler;