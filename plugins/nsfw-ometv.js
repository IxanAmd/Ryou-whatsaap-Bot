// plugins/ometv.js
// ctx version — random ometv video sender

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const ometvVideos = [
  "https://i.top4top.io/m_2341xq9cq0.mp4",
  "https://k.top4top.io/m_2341fb4jm0.mp4",
  "https://k.top4top.io/m_2341jvbzy1.mp4",
  "https://h.top4top.io/m_2438kl6kw0.mp4",
  "https://i.top4top.io/m_2438k4cf70.mp4",
  "https://d.top4top.io/m_24387catm0.mp4",
  "https://h.top4top.io/m_2438l5utb0.mp4",
  "https://g.top4top.io/m_2438v1w7l0.mp4",
  "https://f.top4top.io/m_2341fihfn1.mp4",
  "https://j.top4top.io/m_2341jyxgq1.mp4",
  "https://d.top4top.io/m_23418161e1.mp4",
  "https://j.top4top.io/m_2341x8erk1.mp4",
  "https://j.top4top.io/m_2344852jl1.mp4"
];

async function handler(ctx) {
  // kirim reaksi
  await ctx.client.sendMessage(ctx.from, {
    react: { text: '🕒', key: ctx.key },
  });

  const senderName = ctx.pushName || 'Kamu';
  const video = pickRandom(ometvVideos);

  try {
    await ctx.replyVideo(
      video,
      `🎥 Nih video Ometv buat kamu, *${senderName}!* 😜`
    );
  } catch (err) {
    console.error('Ometv send error:', err.message);
    await ctx.reply('⚠️ Gagal mengirim video, coba lagi nanti.');
  }
}

// === Metadata ===
handler.command = (ctx) => /^[.!]ometv\b/i.test(ctx.text || '');
handler.role = 'all';
handler.scope = 'private';
handler.tags = ['fun', 'nsfw'];
handler.key = 'ometv';
handler.enabled = true;
handler.cost = 3; // misalnya potong 3 limit
handler.help = ['.ometv'];
handler.desc = 'Kirim random video ometv 😎';

module.exports = handler;