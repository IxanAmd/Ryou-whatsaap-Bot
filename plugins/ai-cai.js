const axios = require('axios');

async function handler(ctx) {
  ctx.client.cai = ctx.client.cai || {};
  const txt = (ctx.text || '').trim();
  if (!txt)
    return ctx.reply(`*• Example:* .cai [on/off]\n*• Example search Chara:* .cai search [character name]`);

  const [keyword, ...rest] = txt.split(' ');
  const data = rest.join(' ').trim();

  switch (keyword.toLowerCase()) {
    case 'search': {
      if (!data) return ctx.reply(`*• Example:* .cai search Hutao`);
      await ctx.reply(`_🔍 Searching data... *[ ${data} ]*_`);

      const search = await axios.get(`https://api.apigratis.site/cai/search_characters?query=${encodeURIComponent(data)}`);
      const chars = search.data?.result?.characters || [];

      if (!chars.length) return ctx.reply('⚠️ Tidak ada karakter ditemukan.');

      const list = chars
        .map((a, i) =>
          `*[ ${i + 1}. ${a.participant__name} ]*\n*• Greeting:* \`${a.greeting}\`\n*• Visibility:* ${a.visibility}\n*• Creator:* ${a.user__username}`
        )
        .join('\n\n');

      const first = chars[0];
      await ctx.client.sendMessage(ctx.from, {
        text: list,
        contextInfo: {
          externalAdReply: {
            title: first.participant__name,
            body: first.greeting,
            thumbnailUrl: first.avatar_file_name,
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      });

      await ctx.reply(
        `*[ KETIK ANGKA 1 SAMPAI ${chars.length} ]*\n> • _Gunakan perintah_ *.cai set (nomor urut)* _untuk memilih karakter._`
      );

      ctx.client.cai[ctx.sender] = { pilih: chars };
      break;
    }

    case 'set': {
      const store = ctx.client.cai[ctx.sender];
      if (!store || !store.pilih)
        return ctx.reply(`*[ KAMU BELUM MENCARI CHARACTER ]*\n> _Ketik *.cai search* untuk mencari karakter favoritmu._`);

      if (!data) return ctx.reply(`*• Example:* .cai set 1`);

      const idx = parseInt(data) - 1;
      const pilihan = store.pilih[idx];
      if (!pilihan) return ctx.reply('⚠️ Nomor tidak valid.');

      const info = await axios.get(
        `https://api.apigratis.site/cai/character_info?external_id=${pilihan.external_id}`
      );

      const caption = `*[ INFO CHARACTER ${data} ]*
*• Name:* ${pilihan.participant__name}
*• Greeting:* \`${pilihan.greeting}\`
*• Visibility:* ${pilihan.visibility}
*• Description:* ${info.data?.result?.character?.description || '-'}`;

      await ctx.client.sendMessage(ctx.from, {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: pilihan.participant__name,
            body: pilihan.greeting,
            thumbnailUrl: pilihan.avatar_file_name,
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      });

      ctx.client.cai[ctx.sender] = {
        isChats: false,
        id: pilihan.external_id,
        thumb: pilihan.avatar_file_name,
        name: pilihan.participant__name
      };
      break;
    }

    case 'on': {
      const store = ctx.client.cai[ctx.sender];
      if (!store) return ctx.reply(`⚠️ Kamu belum memilih karakter.\n> Ketik *.cai search* untuk memulai.`);
      store.isChats = true;
      await ctx.reply(`_*[ ✓ ] Room chat berhasil dibuat*_`);
      break;
    }

    case 'off': {
      const store = ctx.client.cai[ctx.sender];
      if (!store) return ctx.reply(`⚠️ Kamu belum memilih karakter.`);
      store.isChats = false;
      await ctx.reply(`_*[ ✓ ] Berhasil keluar dari Room chat*_`);
      break;
    }

    default:
      return ctx.reply(`⚠️ Perintah tidak dikenal.\nGunakan *.cai search* atau *.cai on/off*.`);
  }
}

// === Auto Chat Handler ===
handler.before = async (ctx) => {
  ctx.client.cai = ctx.client.cai || {};
  const store = ctx.client.cai[ctx.sender];
  if (!store || !store.isChats) return;
  if (!ctx.text || /^[.!]/.test(ctx.text)) return; // jangan respon command

  try {
    const { data } = await axios.post('https://api.apigratis.site/cai/send_message', {
      external_id: store.id,
      message: ctx.text
    });

    const replyText = data?.result?.replies?.[0]?.text?.replace(/surya/gi, ctx.pushName || 'Kamu') || '...';
    await ctx.client.sendMessage(ctx.from, {
      text: replyText,
      contextInfo: {
        externalAdReply: {
          title: store.name,
          thumbnailUrl: store.thumb,
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    });
  } catch (err) {
    await ctx.reply(`⚠️ Gagal merespons dari Character AI.\n${err.message}`);
  }
};

handler.command  = (ctx) => /^[.!/]cai\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.tags     = ['ai'];
handler.key      = 'cai';
handler.nolimit  = true;
handler.register = false;
handler.help     = ['.cai [search|set|on|off]'];

module.exports = handler;