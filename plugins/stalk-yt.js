// plugins/stalker-yt.js
// .ytstalk <username|channel> — stalk YouTube channel/user

const axios = require('axios');
const API = 'https://www.apis-anomaki.zone.id/stalker/yt-stalk?usrname=';

function s(x, d='-'){ return (x===undefined||x===null)?d:String(x).trim()||d; }
function pickThumb(d){
  return d.banner || d.thumbnail || d.avatar || d.image || null;
}

async function handler(ctx){
  const txt = (ctx.text||'').trim();
  const m = txt.match(/^[.!](ytstalk|yts)\s+(.+)/i);
  if (!m) return;

  const user = m[2].trim();
  try{
    await ctx.reply('📺 Mengambil data channel...');
    const { data } = await axios.get(API + encodeURIComponent(user), { timeout: 25000 });
    const d = data?.result || data?.data || data || {};

    const name  = s(d.title || d.name || d.channelName || user);
    const subs  = s(d.subscribers || d.subs || d.subCount);
    const vids  = s(d.videos || d.videoCount);
    const desc  = s(d.description || d.desc);
    const url   = s(d.url || d.link || d.channel_url);

    const cap = [
      '《 YouTube Stalk 》',
      `- Query : ${user}`,
      `- Name  : ${name}`,
      `- Subs  : ${subs}`,
      `- Videos: ${vids}`,
      `- URL   : ${url}`,
      '',
      desc !== '-' ? desc : ''
    ].filter(Boolean).join('\n');

    const thumb = pickThumb(d);
    if (thumb) {
      await ctx.client.sendMessage(ctx.from, { image: { url: thumb }, caption: cap }, { quoted: ctx.message });
    } else {
      await ctx.reply(cap);
    }
  }catch(e){
    await ctx.reply(`❌ Gagal stalk: ${e?.response?.status ? 'HTTP '+e.response.status : e?.message||e}`);
  }
}

handler.command  = (ctx)=>/^[.!](ytstalk|yts)\b/i.test(ctx.text||'');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'stalker_youtube';
handler.tags     = ['stalker','search'];
handler.cost     = 1;
handler.help     = ['.ytstalk <username|channel>'];

module.exports = handler;