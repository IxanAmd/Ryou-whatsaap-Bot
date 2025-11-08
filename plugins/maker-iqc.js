// plugins/maker-iqc.js
// .iqc <pesan> — Generate screenshot chat iPhone (quoted)
// Field API lengkap: time, messageText, carrierName, batteryPercentage, signalStrength, emojiStyle
// Limit cost = 2

async function handler(ctx) {
  const text = (ctx.text || '').trim();
  const m = text.match(/^[.!]iqc\s+(.+)/i);
  if (!m) return ctx.reply('⚠️ Contoh:\n.iqc Biji ayam');

  const messageText = m[1].trim();

  try {
    // Jam otomatis WIB
    const time = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    // Nilai default yang valid untuk API
    const battery = Math.floor(Math.random() * 81) + 20; // 20..100
    const signal  = 4;                                  // 0..4 (paling penuh)
    const carrier = 'INDOSAT OOREDOO';
    const emoji   = 'apple';                            // apple | google | twitter | ...
    
    const qs = new URLSearchParams({
      time,
      messageText,
      carrierName: carrier,
      batteryPercentage: String(battery),
      signalStrength: String(signal),
      emojiStyle: emoji,
    }).toString();

    const url = `https://brat.siputzx.my.id/iphone-quoted?${qs}`;

    await ctx.client.sendMessage(
      ctx.from,
      { image: { url }, caption: `📱 iPhone Quote\n⏰ WIB: ${time}\n🔋 ${battery}% • 📶 ${signal}/4 • ${carrier}` }
    );
  } catch (e) {
    await ctx.reply(`❌ Gagal buat gambar: ${e?.message || e}`);
  }
}

// ── metadata (sesuai handler kamu) ─────────────────────────
handler.command  = (ctx) => /^[.!]iqc\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'maker_iqc';
handler.tags     = ['maker'];
handler.cost     = 2; // pakai 2 limit per pemakaian
handler.help     = ['.iqc <pesan>'];

module.exports = handler;