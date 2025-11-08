const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';

const ok=s=>typeof s==='string'&&/^https?:\/\//i.test(s);
function findUrlDeep(o,exts=[]){const u=[],st=[o];while(st.length){const c=st.pop();if(!c)continue;
if(Array.isArray(c))st.push(...c);else if(typeof c==='object')st.push(...Object.values(c));
else if(typeof c==='string'&&ok(c))u.push(c);} if(exts.length){const p=u.find(x=>exts.some(e=>x.toLowerCase().includes(e))); if(p)return p;} return u[0]||null;}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](fbdl|fb|facebook)\s+(\S+)/i);
  if(!m) return ctx.reply('❗Format: .fbdl <url>');
  await ctx.reply('⏳ Mengambil video Facebook...');
  const { data:j } = await axios.get(`${API_BASE}/downloader/fbdl?url=${encodeURIComponent(m[2])}`, {timeout:25000});
  const v = findUrlDeep(j,['.mp4']);
  if(!v) return ctx.reply('❌ Video tidak ditemukan.');
  await ctx.client.sendMessage(ctx.from,{ video:{url:v}, caption:'《 Facebook DL 》\n- Selesai' });
}
handler.command=/^[.!](fbdl|fb|facebook)\b/i;
handler.role='all';handler.scope='all';handler.enabled=true;
handler.key='fbdl';handler.tags=['downloader'];handler.cost=2;
handler.help=['.fbdl <url>'];
module.exports=handler;