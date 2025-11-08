// plugins/charagi.js
// .charagi <nama karakter> — ambil info karakter Genshin dari genshin-db (ctx-style)

const { characters } = require('genshin-db');

function titleCase(s = '') {
  return String(s).replace(/\b\w/g, c => c.toUpperCase());
}

function buildAscendLines(costs = {}) {
  const parts = [];
  for (let i = 1; i <= 6; i++) {
    const key = 'ascend' + i;
    const arr = Array.isArray(costs[key]) ? costs[key] : null;
    if (!arr || !arr.length) continue;
    const line = arr
      .map(a => `\n*${a?.name || '-'}* • *ID:* ${a?.id ?? '-'} • *Count:* ${a?.count ?? '-'}`)
      .join(' ');
    parts.push(`* *Ascend [ ${i} ] :* ${line}`);
  }
  return parts.join('\n\n');
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim();
  const m = txt.match(/^[.!](charagi)\b(?:\s+(.+))?/i);
  if (!m) return;

  const query = (m[2] || '').trim();
  if (!query) {
    return ctx.reply(`*• Example:*  .charagi *[Chara Name]*\nContoh: .charagi Furina`);
  }

  try {
    await ctx.reply('⏳ Mengambil data karakter...');
    // genshin-db characters biasanya synchronous; tapi aman kalau tetap pakai await
    let gh = characters(query) || characters(titleCase(query));

    // Jika tidak ketemu, coba sedikit longgar: hilangkan spasi/strip
    if (!gh) {
      const loose = query.replace(/[-_]+/g, ' ').trim();
      gh = characters(loose) || characters(titleCase(loose));
    }

    if (!gh) {
      return ctx.reply(`❌ Karakter "${query}" tidak ditemukan di genshin-db.`);
    }

    // Ambil gambar icon kalau ada
    const photoUrl =
      gh?.images?.icon ||
      gh?.images?.iconRoute ||
      gh?.images?.sideIcon ||
      gh?.images?.portrait ||
      null;

    const caption =
`*[ CHARA GENSHIN INFO ]*
*• Name:* ${gh.name}${gh.title ? ` *[ ${gh.title} ]*` : ''}
*• Gender:* ${gh.gender || '-'}
*• Element:* ${gh.elementText || gh.element || '-'}
*• Region:* ${gh.region || '-'}
*• Birthday:* ${gh.birthday || '-'}
*• Description:* ${gh.description || '-'}

*• Weapon Type:* ${gh.weaponType || '-'}
*• Weapon Name:* ${gh.weaponText || '-'}

*• CHARA VOICES:*
* *Korean:* ${gh?.cv?.korean || 'Nothing'}
* *English:* ${gh?.cv?.english || 'Nothing'}
* *Japanese:* ${gh?.cv?.japanese || 'Nothing'}
* *Chinese:* ${gh?.cv?.chinese || 'Nothing'}

*• COSTS:*
${buildAscendLines(gh.costs || {})}
`.trim();

    if (photoUrl) {
      try {
        await ctx.client.sendMessage(ctx.from, {
          image: { url: photoUrl },
          caption
        });
        return;
      } catch {
        // kalau gagal kirim gambar (403/timeout), jatuhkan ke teks saja
      }
    }

    await ctx.reply(caption);
  } catch (e) {
    const msg = e?.message || String(e);
    await ctx.reply(`❌ Terjadi kesalahan.\n${msg}`);
  }
}

handler.command  = (ctx) => /^[.!](charagi)\b/i.test(String(ctx.text || ''));
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'charagi';
handler.tags     = ['anime','game'];
handler.nolimit  = true;      // tidak potong limit
handler.register = false;     // boleh dipakai tanpa daftar
handler.help     = ['.charagi <nama>'];

module.exports = handler;