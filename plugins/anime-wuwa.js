// plugins/wuwa.js
// 🔎 Wuthering Waves Character Search — auto list & fuzzy search (ctx-style)

const BASE = 'https://api.resonance.rest';

// === util helpers ===
function norm(s = '') { return String(s).toLowerCase().replace(/[\s_\-]+/g, ''); }
function capital(s = '') { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function uniq(arr = []) { return [...new Set(arr.filter(Boolean))]; }

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let score = 0;
  if (b.startsWith(a) || a.startsWith(b)) score += 0.4;
  if (b.includes(a) || a.includes(b)) score += 0.3;
  const bigrams = (s) => Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s[i] + s[i + 1]);
  const A = bigrams(a), B = bigrams(b);
  if (A.length && B.length) {
    const setB = new Map(); for (const x of B) setB.set(x, (setB.get(x) || 0) + 1);
    let inter = 0; for (const x of A) { const c = setB.get(x); if (c) { inter++; setB.set(x, c - 1); } }
    const dice = (2 * inter) / (A.length + B.length);
    score += 0.6 * dice;
  }
  return Math.min(1, score);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchCharacterList() {
  const tries = [
    `${BASE}/characters`,
    `${BASE}/characters/list`,
    `${BASE}/characters?list=1`,
  ];
  for (const u of tries) {
    try {
      const j = await fetchJson(u);
      let arr = [];
      if (Array.isArray(j)) arr = j;
      else if (Array.isArray(j?.characters)) arr = j.characters;
      else if (Array.isArray(j?.data)) arr = j.data;
      if (arr.length && typeof arr[0] === 'object') arr = arr.map(x => x?.name);
      if (arr.length) return uniq(arr.map(String));
    } catch {}
  }
  return null;
}

const LOCAL_LIST = [
  'Calcharo','Encore','Jianxin','Jiyan','Lingyang','Rover','Verina','Yinlin',
  'Aalto','Baizhi','Chixia','Danjin','Mortefi','Sanhua','Taoqi','Yangyang','Yuanwu'
];

// === handler ===
async function handler(ctx) {
  const txt = String(ctx.text || '').trim();
  const m = txt.match(/^[.!](wuwa|wuthering)\b(?:\s+(.+))?/i);
  if (!m) return;
  const query = (m[2] || '').trim();

  // tanpa argumen
  if (!query) {
    return ctx.reply(`*• Example:* .wuwa <nama>\n*• Atau:* .wuwa list`);
  }

  // mode list
  if (/^list$/i.test(query)) {
    await ctx.reply('📜 Mengambil daftar karakter...');
    let list = await fetchCharacterList();
    if (!list || !list.length) list = LOCAL_LIST;
    const sorted = list.sort((a,b)=>a.localeCompare(b));
    const chunk = (arr,n)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,i*n+n));
    const pages = chunk(sorted,40).map((pg,i)=>`*[LIST ${i+1}]*\n${pg.map(s=>'• '+s).join('\n')}`);
    return ctx.reply(`*Wuthering Waves — Characters*\n\n${pages.join('\n\n')}`);
  }

  // mode search
  await ctx.reply('🔍 Mencari data karakter...');
  let list = await fetchCharacterList();
  if (!list || !list.length) list = LOCAL_LIST;

  const qn = norm(query);
  let best = null, bestScore = -1;
  for (const name of list) {
    const s = similarity(qn, name);
    if (s > bestScore) { best = name; bestScore = s; }
    if (s >= 0.999) break;
  }

  if (!best || bestScore < 0.35) {
    const sug = list.map(n=>[n,similarity(qn,n)]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(a=>a[0]);
    return ctx.reply(`❌ Karakter *"${query}"* tidak ditemukan.\n\n*Saran:*\n${sug.map(s=>'• '+s).join('\n')}`);
  }

  const name = best, proper = capital(name);
  let characters;
  try { characters = await fetchJson(`${BASE}/characters/${proper}`); }
  catch { return ctx.reply(`Gagal ambil data karakter *${name}*.`); }

  if (!characters || !characters.weapon) {
    return ctx.reply(`Data karakter *${name}* tidak tersedia lengkap.`);
  }

  // ambil weapon detail
  let weaponInfo = [];
  try {
    const listW = await fetchJson(`${BASE}/weapons/${characters.weapon}`);
    if (Array.isArray(listW?.weapons)) {
      for (const i of listW.weapons) {
        try {
          const d = await fetchJson(`${BASE}/weapons/${characters.weapon}/${i}`);
          if (d && d.name) weaponInfo.push(d);
        } catch {}
      }
    }
  } catch {}

  const hasil = weaponInfo.map(a=>{
    const stats = a?.stats?.atk
      ? `• Stats:\n  • ATK: ${a.stats.atk}\n  • Substats: ${a?.stats?.substat?.name || '-'} [${a?.stats?.substat?.value || '-'}]`
      : '';
    const skill = a?.skill?.name
      ? `• Skill:\n  • ${a.skill.name}\n  • ${a.skill.description || '-'}`
      : '';
    return `• Name: ${a.name}\n• Type: ${a.type}\n• Rarity: ${a.rarity}\n${stats}\n${skill}`;
  }).join('\n\n');

  const cap =
`*[ WUTHERING - CHARACTER INFO ]*
*• Name :* ${characters.name}
*• Quote :* ${characters.quote}
*• Attribute :* ${characters.attribute}
*• Weapon :* ${characters.weapon}
*• Rarity :* ${characters.rarity}
*• Class :* ${characters.class}
*• Birth Place :* ${characters.birthplace}
*• Birthday :* ${characters.birthday}

*[ ${String(characters.weapon || '').toUpperCase()} INFO ]*
${hasil || '(No weapon data)'}`;

  try {
    await ctx.client.sendMessage(ctx.from, {
      image: { url: `${BASE}/characters/${proper}/portrait` },
      caption: cap
    });
  } catch {
    await ctx.reply(cap);
  }
}

handler.command  = (ctx) => /^[.!](wuwa|wuthering)\b/i.test(String(ctx.text||'')));
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['anime','game'];
handler.key      = 'wuwa';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.wuwa <nama>', '.wuwa list'];

module.exports = handler;