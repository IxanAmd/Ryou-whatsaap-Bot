const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';

const ok=s=>typeof s==='string'&&/^https?:\/\//i.test(s);
function findUrlDeep(o,exts=[]){const u=[],st=[o];while(st.length){const c=st.pop();if(!c)continue;
if(Array.isArray(c))st.push(...c);else if(typeof c==='object')st.push(...Object.values(c));
else if(typeof c==='string'&&ok(c))u.push(c);} if(exts.length){const p=u.find(x=>exts.some(e=>x.toLowerCase().includes(e))); if(p)return p;} return u[0]||null;}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](igst|igdl\-story)\s+([A-Za-z0-9_.]+)/i);
  if(!m) return ctx.reply('❗Format: .igst <username>');
  await ctx.reply('⏳ Mengambil story IG...');
  const { data:j } = await axios.get(`${API_BASE}/downloader/igdl-story?username=${encodeURIComponent(m[2])}`, {timeout:25000});
  const urls=[];
  const v=findUrlDeep(j,['.mp4']); if(v) urls.push(['video',v]);
  const i=findUrlDeep(j,['.jpg','.jpeg','.png']); if(i) urls.push(['image',i]);
  if(!urls.length) return ctx.reply('❌ Story tidak ditemukan.');
  for(const [t,u] of urls.slice(0,5)){
    if(t==='video') await ctx.client.sendMessage(ctx.from,{video:{url:u}});
    else await ctx.client.sendMessage(ctx.from,{image:{url:u}});
  }
}
handler.command=/^[.!](igst|igdl\-story)\b/i;
handler.role='all';handler.scope='all';handler.enabled=true;
handler.key='igst';handler.tags=['downloader'];handler.cost=2;
handler.help=['.igst <username>'];
module.exports=handler;