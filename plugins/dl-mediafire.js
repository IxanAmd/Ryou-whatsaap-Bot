const axios = require('axios');
const API_BASE = 'https://www.apis-anomaki.zone.id';

const ok = s => typeof s === 'string' && /^https?:\/\//i.test(s);
function findUrlDeep(o){const u=[],st=[o];while(st.length){const c=st.pop();if(!c)continue;
if(Array.isArray(c))st.push(...c);else if(typeof c==='object')st.push(...Object.values(c));
else if(typeof c==='string'&&ok(c))u.push(c);}return u[0]||null;}

async function handler(ctx){
  const m = ctx.text.match(/^[.!](mfdl|mediafire|mediafiredl)\s+(\S+)/i);
  if(!m) return ctx.reply('❗Format: .mfdl <url>');
  await ctx.reply('⏳ Mengurai link MediaFire...');
  const { data:j } = await axios.get(`${API_BASE}/downloader/mediafire?url=${encodeURIComponent(m[2])}`, {timeout:25000});
  const dl = j?.link || j?.download || findUrlDeep(j);
  const name = j?.filename || j?.name || 'file'; const size = j?.filesize || j?.size || '-';
  if(!dl) return ctx.reply('❌ Direct link tidak ditemukan.');
  await ctx.client.sendMessage(ctx.from, {
    document:{url:dl}, fileName:name, mimetype:'application/octet-stream',
    caption:`《 MediaFire 》\n- Nama : ${name}\n- Ukuran : ${size}`
  });
}
handler.command=/^[.!](mfdl|mediafire|mediafiredl)\b/i;
handler.role='all';handler.scope='all';handler.enabled=true;
handler.key='mediafire';handler.tags=['downloader'];handler.cost=2;
handler.help=['.mfdl <url>'];
module.exports=handler;