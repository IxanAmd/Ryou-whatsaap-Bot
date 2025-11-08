const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';

const ok = s => typeof s === 'string' && /^https?:\/\//i.test(s);
function findUrlDeep(o, exts=[]) {
  const urls=[], st=[o];
  while (st.length){const c=st.pop(); if(!c)continue;
    if(Array.isArray(c))st.push(...c); else if(typeof c==='object')st.push(...Object.values(c));
    else if(typeof c==='string'&&ok(c))urls.push(c);}
  if(exts.length){const p=urls.find(u=>exts.some(e=>u.toLowerCase().includes(e))); if(p)return p;}
  return urls[0]||null;
}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](pindl|pinterestdl)\s+(.+)/i);
  if(!m) return ctx.reply('❗Format: .pindl <url|pin_id>');
  await ctx.reply('⏳ Mengambil media Pinterest...');
  const { data:j } = await axios.get(`${API_BASE}/downloader/pindl?link=${encodeURIComponent(m[2])}`, {timeout:25000});
  const img = findUrlDeep(j, ['.jpg','.jpeg','.png','.gif']);
  if(!img) return ctx.reply('❌ Gambar tidak ditemukan.');
  await ctx.client.sendMessage(ctx.from, { image:{url:img}, caption:'《 Pinterest DL 》\n- Selesai' });
}

handler.command = /^[.!](pindl|pinterestdl)\b/i;
handler.role='all'; handler.scope='all'; handler.enabled=true;
handler.key='pindl'; handler.tags=['downloader']; handler.cost=2;
handler.help=['.pindl <url|pin id>'];
module.exports = handler;