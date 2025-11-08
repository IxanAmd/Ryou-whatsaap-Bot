// plugins/ai_labs_free.js
// .aivideo / .aiimage — untuk user free
// Framework: single-ctx (ctx.client, ctx.reply, ctx.from, ctx.text)

const axios = require('axios');
const FormData = require('form-data');

// ========== API wrapper (sama persis) ==========
const aiLabs = {
  api: {
    base: 'https://text2video.aritek.app',
    endpoints: { text2img: '/text2img', generate: '/txt2videov3', video: '/video' },
  },
  headers: {
    'user-agent': 'NB Android/1.0.0',
    'accept-encoding': 'gzip',
    'content-type': 'application/json',
    authorization: '',
  },
  state: { token: null },

  setup: {
    cipher: 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW',
    shiftValue: 3,
    dec(t, s) {
      return [...t].map(c =>
        /[a-z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 97 - s + 26) % 26 + 97)
        : /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 - s + 26) % 26 + 65)
        : c
      ).join('');
    },
    async decrypt() {
      if (aiLabs.state.token) return aiLabs.state.token;
      const tok = this.dec(this.cipher, this.shiftValue);
      aiLabs.state.token = tok;
      aiLabs.headers.authorization = tok;
      return tok;
    }
  },

  deviceId() {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  },

  async text2img(prompt) {
    if (!prompt?.trim()) return { success: false, code: 400, result: { error: 'Prompt kosong.' } };
    await this.setup.decrypt();

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('token', this.state.token);

    const url = this.api.base + this.api.endpoints.text2img;
    try {
      const res = await axios.post(url, form, {
        headers: { ...this.headers, ...form.getHeaders() },
        timeout: 30_000,
      });
      const { code, url: imageUrl } = res.data || {};
      if (code !== 0 || !imageUrl)
        return { success: false, code: res.status || 500, result: { error: 'Gagal generate image.' } };

      return { success: true, code: res.status, result: { url: String(imageUrl).trim(), prompt } };
    } catch (e) {
      return { success: false, code: e.response?.status || 500, result: { error: e.message || 'Error' } };
    }
  },

  async generate({ prompt = '', type = 'video', isPremium = 0 } = {}) {
    if (!prompt?.trim()) return { success: false, code: 400, result: { error: 'Prompt kosong.' } };
    if (!/^(image|video)$/i.test(type)) return { success: false, code: 400, result: { error: 'Tipe harus image atau video.' } };
    if (/^image$/i.test(type)) return this.text2img(prompt);

    await this.setup.decrypt();
    const payload = { deviceID: this.deviceId(), isPremium, prompt, used: [], versionCode: 59 };

    try {
      const res = await axios.post(this.api.base + this.api.endpoints.generate, payload, {
        headers: this.headers, timeout: 30_000,
      });
      const { code, key } = res.data || {};
      if (code !== 0 || !key) return { success: false, code: res.status || 500, result: { error: 'Gagal mendapatkan key video.' } };
      return this.video(key);
    } catch (e) {
      return { success: false, code: e.response?.status || 500, result: { error: e.message || 'Error' } };
    }
  },

  async video(key) {
    if (!key) return { success: false, code: 400, result: { error: 'Key tidak valid.' } };
    await this.setup.decrypt();

    const url = this.api.base + this.api.endpoints.video;
    const payload = { keys: [key] };
    const maxAttempts = 100;
    const delay = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await axios.post(url, payload, {
          headers: this.headers, timeout: 15_000, validateStatus: () => true,
        });
        const { code, datas } = res.data || {};
        if (code === 0 && Array.isArray(datas) && datas.length) {
          const d = datas[0];
          if (d?.url) return { success: true, code: res.status, result: { url: String(d.url).trim(), key: d.key, progress: '100%' } };
        }
      } catch { /* retry */ }
      await new Promise(r => setTimeout(r, delay));
    }
    return { success: false, code: 504, result: { error: 'Timeout menunggu video.' } };
  },
};

// ========== Handler ==========
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](aivideo|aiimage)\s+([\s\S]+)/i);
if (!m) {
  return ctx.reply('❌ Prompt wajib diisi!\nContoh: .aiimage pemandangan gunung\nContoh: .aivideo gunung terbang');
}
  const cmd = m[1].toLowerCase();
  const prompt = m[2].trim();

  try {
    await ctx.reply('⏳ Proses AI...');
    if (cmd === 'aiimage') {
      const r = await aiLabs.text2img(prompt);
      if (!r.success) return ctx.reply(`❌ ${r.result.error || 'Gagal generate gambar.'}`);
      await ctx.client.sendMessage(ctx.from, { image: { url: r.result.url }, caption: '✅ Selesai.' }, { quoted: ctx.message });
    } else {
      const r = await aiLabs.generate({ prompt, type: 'video', isPremium: 0 });
      if (!r.success) return ctx.reply(`❌ ${r.result.error || 'Gagal generate video.'}`);
      await ctx.client.sendMessage(ctx.from, { video: { url: r.result.url }, caption: '✅ Selesai.' }, { quoted: ctx.message });
    }
  } catch (e) {
    await ctx.reply(`❌ Error: ${e?.message || e}`);
  }
}

// ===== Metadata untuk free =====
handler.command  = (ctx) => /^[.!](aivideo|aiimage)\b/i.test(ctx.text || '');
handler.role     = 'all';      // free
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_labs_free';
handler.tags     = ['ai'];
handler.cost     = 4;          // misal 4 limit saja
handler.help     = ['.aiimage <prompt>', '.aivideo <prompt>'];

module.exports = handler;