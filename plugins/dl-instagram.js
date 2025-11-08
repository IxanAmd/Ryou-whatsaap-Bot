const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';

const ok=s=>typeof s==='string'&&/^https?:\/\//i.test(s);
function findUrlDeep(o,exts=[]){const u=[],st=[o];while(st.length){const c=st.pop();if(!c)continue;
if(Array.isArray(c))st.push(...c);else if(typeof c==='object')st.push(...Object.values(c));
else if(typeof c==='string'&&ok(c))u.push(c);} if(exts.length){const p=u.find(x=>exts.some(e=>x.toLowerCase().includes(e))); if(p)return p;} return u[0]||null;}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](dlig|igdl)\s+(\S+)/i);
  if(!m) return ctx.reply('❗Format: .dlig <url>');
  await ctx.reply('⏳ Mengambil media Instagram...');
  const { data:j } = await axios.get(`${API_BASE}/downloader/dlig?url=${encodeURIComponent(m[2])}`, {timeout:25000});
  const v=findUrlDeep(j,['.mp4']); const img=v?null:findUrlDeep(j,['.jpg','.jpeg','.png']);
  if(v) await ctx.client.sendMessage(ctx.from,{video:{url:v},caption:'《 Instagram DL 》\n- Selesai'});
  else if(img) await ctx.client.sendMessage(ctx.from,{image:{url:img},caption:'《 Instagram DL 》\n- Selesai'});
  else return ctx.reply('❌ Media tidak ditemukan.');
}
handler.command=/^[.!](dlig|igdl)\b/i;
handler.role='all';handler.scope='all';handler.enabled=true;
handler.key='dlig';handler.tags=['downloader'];handler.cost=2;
handler.help=['.dlig <url>'];
module.exports=handler;