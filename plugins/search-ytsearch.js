const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';
const ok=s=>typeof s==='string'&&/^https?:\/\//i.test(s);

function findUrlDeep(o){const u=[],st=[o];while(st.length){const c=st.pop();if(!c)continue;
if(Array.isArray(c))st.push(...c);else if(typeof c==='object')st.push(...Object.values(c));
else if(typeof c==='string'&&ok(c))u.push(c);}return u[0]||null;}

function box(title, lines=[]) {
  return `《 ${title} 》\n${lines.map(l=>`- ${l}`).join('\n')}`;
}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](ytsearch|yts)\s+(.+)/i);
  if(!m) return ctx.reply('❗Format: .ytsearch <query>');
  await ctx.reply('🔎 Mencari di YouTube...');
  const { data:j } = await axios.get(`${API_BASE}/search/ytsearch?query=${encodeURIComponent(m[2])}`, {timeout:25000});
  const items = (j?.result || j?.data || j || []).slice?.(0,5) || [];
  if(!items.length) return ctx.reply('❌ Tidak ada hasil.');
  const lines = items.map((it,i)=>{
    const t = it.title || it?.video?.title || `Hasil ${i+1}`;
    const u = it.url || it.link || it?.video?.url || it?.video?.link || findUrlDeep(it) || '-';
    return `${i+1}. ${t}\n  ${u}`;
  });
  await ctx.reply(box('YouTube Search', lines));
}
handler.command=/^[.!](ytsearch|yts)\b/i;
handler.role='all';
handler.scope='all';
handler.enabled=true;
handler.key='ytsearch';
handler.tags=['search'];
handler.cost=1;
handler.help=['.ytsearch <query>'];
module.exports=handler;