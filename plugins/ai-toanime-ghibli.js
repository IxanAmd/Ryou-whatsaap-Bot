// plugins/ai-toanime.js
// .toanime / .toghibli — Colorize (anime) dari ColorifyAI
// CommonJS + Baileys compatible + limit cost = 10

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ——— API wrapper ————————————————————————————————————————————————
const colorifyai = {
  baseHeaders: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua-platform': '"Android"',
    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'sec-ch-ua-mobile': '?1',
    'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
    'fp': 'ce5c3d02ca3f6126691dc3f031bf8696',
    'origin': 'https://colorifyai.art',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://colorifyai.art/',
    'accept-language': 'en-SG,en;q=0.9,id-ID;q=0.8,id;q=0.7,en-US;q=0.6',
    'priority': 'u=1, i'
  },
  baseUrl: 'https://api.colorifyai.art',
  imageBaseUrl: 'https://temp.colorifyai.art',

  async uploadImage(imagePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    form.append('fn_name', 'demo-auto-coloring');
    form.append('request_from', '10');
    form.append('origin_from', '6d3782f244d64cf8');

    const { data: response } = await axios.post(
      `${this.baseUrl}/aitools/upload-img`,
      form,
      {
        headers: {
          ...this.baseHeaders,
          ...form.getHeaders(),
          'fp1': 'o6Mwa5XX5Un1ErcZHeaPw/Vx9akkKttB1H5u+IyolDFz4IZQaNmueXYbgLo93OFc',
          'x-code': Date.now().toString(),
          'x-guide': 'IiwOF4ammzJHUX/J61hjo/n6td0itKczUIRls3wBSa5BUgImXX6bhCpeFBVhC3BdA8Elw3rPoWZIr9kiHeq1wbCT9FL4xZA3aLV01dNM69meuQzfUWR90nDp/Zp45SWHg7QJkcToY6lDB+WPjjwrWNLte6wPipRYxQ+X78jAkuo='
        }
      }
    );
    return response;
  },

  async createTask(imagePath, prompt = '(masterpiece), best quality', useGhibliStyle = true) {
    const lora = useGhibliStyle ? ['ghibli_style_offset:0.8'] : [];
    const { data } = await axios.post(
      `${this.baseUrl}/aitools/of/create`,
      {
        fn_name: 'demo-auto-coloring',
        call_type: 3,
        input: { source_image: imagePath, prompt, request_from: 10, lora },
        request_from: 10,
        origin_from: '6d3782f244d64cf8'
      },
      {
        headers: {
          ...this.baseHeaders,
          'Content-Type': 'application/json',
          'fp1': 'TepQNTen0uDhLJ1z3LD/u+tD90vX7RDQpiPcqGy521zeTvgS6h/JUcLY0pFJUoDQ',
          'x-code': Date.now().toString(),
          'x-guide': 'Vtn8hbYI0x1w6BpTTkxrU1qK4Y/LPcOA2JNUSS6+UFk4uRXPLIL3x+ws40hmnqhSy1l4bxjM61KMRfaENnIsSJ7YCOlyKlL3/gvBQPVbBZi02c89yStvrnCvpRblyCy/vnX8ifY6rrhJJAJ2kdgw0pa5SZKOEA7UaDCdaroELzg='
        }
      }
    );
    return data;
  },

  async checkStatus(taskId) {
    const { data } = await axios.post(
      `${this.baseUrl}/aitools/of/check-status`,
      {
        task_id: taskId,
        fn_name: 'demo-auto-coloring',
        call_type: 3,
        request_from: 10,
        origin_from: '6d3782f244d64cf8'
      },
      {
        headers: {
          ...this.baseHeaders,
          'Content-Type': 'application/json',
          'fp1': 'pqRqSazlVNrkwA0D4OH9Q9+VNfnQidPWxDZkHLohBzg7CRVY8Z4DuMSnl1LldC8I',
          'x-code': Date.now().toString(),
          'x-guide': 'qLTaK9uy0jedbN7EO3gSm0zgKF+5OTZ5UL3BleB1ksqhkteHSWqpnZBSCIHo9finX7Qlz4I8oAFEB1wyClNgwlbbuzuEGBezjibch0EUhhrRUW8OSLInN5+DrOouCj2ppoq2YM90NLfKdqCazLKx17gm6ykG3YOYSpQDBGETDAM='
        }
      }
    );
    return data;
  },

  getImageUrl(imagePath) {
    return `${this.imageBaseUrl}/${imagePath}`;
  },

  async create(imagePath, prompt = '(masterpiece), best quality', useGhibliStyle = true, maxAttempts = 30) {
    const up = await this.uploadImage(imagePath);
    if (up.code !== 200) throw new Error('Upload failed: ' + (up.message || 'unknown'));

    const uploadedPath = up.data?.path;
    const task = await this.createTask(uploadedPath, prompt, useGhibliStyle);
    if (task.code !== 200) throw new Error('Task creation failed: ' + (task.message || 'unknown'));

    const taskId = task.data?.task_id;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const st = await this.checkStatus(taskId);
      if (st.code !== 200) throw new Error('Status check failed: ' + (st.message || 'unknown'));
      if (Number(st.data?.status) === 2) {
        const resultImagePath = st.data?.result_image;
        return {
          success: true,
          imageUrl: this.getImageUrl(resultImagePath),
          imagePath: resultImagePath,
          taskId,
          ghibliStyle: useGhibliStyle
        };
      }
      attempt++;
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('Task timeout - maximum attempts reached');
  }
};

// ——— Utilities ————————————————————————————————————————————————
async function getQuotedOrOwnImageBuffer(ctx) {
  // Cari image di pesan saat ini
  const root = ctx.message?.message || {};
  const quoted = root?.extendedTextMessage?.contextInfo?.quotedMessage || null;

  const targetImage =
    quoted?.imageMessage ||
    root?.imageMessage ||
    null;

  if (!targetImage) return null;

  const stream = await downloadContentFromMessage(targetImage, 'image');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function ensureTmp() {
  const dir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ——— Handler ————————————————————————————————————————————————
async function handler(ctx) {
  const txt = (ctx.text || '').trim();
  const m = txt.match(/^[.!](toanime|toghibli)\b/i);
  if (!m) return;

  try {
    const buf = await getQuotedOrOwnImageBuffer(ctx);
    if (!buf) return ctx.reply('Kirim gambar dengan caption *.toanime* / *.toghibli* atau *reply* gambar dengan perintah tersebut.');

    await ctx.reply('🎨 Memproses gambar, mohon tunggu...');

    const tmpDir = ensureTmp();
    const tmpPath = path.join(tmpDir, `${Date.now()}.jpg`);
    fs.writeFileSync(tmpPath, buf);

    const useGhibli = /^\.?toghibli/i.test(txt);
    const result = await colorifyai.create(tmpPath, '(masterpiece), best quality', useGhibli);

    // hapus temp
    try { fs.unlinkSync(tmpPath); } catch {}

    await ctx.client.sendMessage(ctx.from, {
      image: { url: result.imageUrl },
      caption: `✅ Selesai.\nMode: ${useGhibli ? 'Ghibli' : 'Anime'}`
    });
  } catch (e) {
    await ctx.reply(`❌ Gagal proses: ${e?.message || e}`);
  }
}

// Properti agar cocok dengan handler kamu
handler.command  = (ctx) => /^[.!](toanime|toghibli)\b/i.test(ctx.text || '');
handler.role     = 'all';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'ai_toanime';
handler.tags     = ['ai'];
handler.cost     = 10;       // ← potong 10 limit per pakai
handler.help     = ['.toanime (reply/kirim gambar)', '.toghibli (reply/kirim gambar)'];

module.exports = handler;