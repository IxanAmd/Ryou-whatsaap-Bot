const axios = require('axios')

const API_BASE = 'https://api-ai-hoshino.vercel.app/download/facebook?url='
const MAX_BYTES = 45 * 1024 * 1024

function extractUrlFromText(text) {
  const rx = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/i
  const m = String(text || '').match(rx)
  return m ? m[0] : null
}

function normalizeUrl(raw) {
  if (!raw) return null
  let u = String(raw).trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u
}

function findLinks(node) {
  const out = []
  function push(u, q, t) {
    if (!u) return
    const s = String(u)
    if (!/^https?:\/\//i.test(s)) return
    out.push({ url: s, quality: q || '', type: t || '' })
  }
  function walk(n) {
    if (!n) return
    if (typeof n === 'string') {
      if (/^https?:\/\//i.test(n)) push(n)
      return
    }
    if (Array.isArray(n)) { for (const v of n) walk(v); return }
    if (typeof n === 'object') {
      const keys = Object.keys(n)
      const u = n.url || n.link || n.download_url || n.play || n.href
      const q = n.quality || n.resolution || n.label || n.q
      const t = n.type || n.mime || n.format || ''
      if (u) push(u, q, t)
      if (n.sd || n.hd) {
        if (n.sd && typeof n.sd === 'string') push(n.sd, 'SD', t)
        if (n.hd && typeof n.hd === 'string') push(n.hd, 'HD', t)
      }
      if (n.result && typeof n.result === 'string') push(n.result, q, t)
      if (n.data && typeof n.data === 'string') push(n.data, q, t)
      if (Array.isArray(n.result)) for (const v of n.result) walk(v)
      if (Array.isArray(n.data)) for (const v of n.data) walk(v)
      if (Array.isArray(n.links)) for (const v of n.links) walk(v)
      for (const k of keys) if (!['url','link','download_url','play','href','sd','hd','result','data','links','quality','resolution','label','q','type','mime','format'].includes(k)) walk(n[k])
    }
  }
  walk(node)
  return out
}

function preferVideo(links) {
  const vids = links.filter(x => /\.(mp4|mov|m4v)(\?|$)/i.test(x.url) || /video/i.test(x.type))
  if (!vids.length) return links[0] || null
  const hd = vids.find(x => /1080|720|hd/i.test(x.quality))
  return hd || vids[0]
}

async function fetchJsonAny(url) {
  const res = await axios.get(url, {
    timeout: 25000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  if (res.data && typeof res.data === 'object') return res.data
  try { return JSON.parse(String(res.data)) } catch { return { raw: String(res.data || '') } }
}

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
    validateStatus: s => s >= 200 && s < 400,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  const mime = String(res.headers['content-type'] || 'video/mp4').split(';')[0]
  const buf = Buffer.from(res.data)
  return { buffer: buf, mime }
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim()
  if (!/^[.!](fb|fbdl|facebook|fbvid|fbdown)\b/i.test(txt)) return
  const arg = txt.replace(/^[.!](fb|fbdl|facebook|fbvid|fbdown)\b/i, '').trim()
  let target = extractUrlFromText(arg)
  if (!target) {
    const root = (ctx.message && ctx.message.message) || {}
    const quoted = root.extendedTextMessage && root.extendedTextMessage.contextInfo && root.extendedTextMessage.contextInfo.quotedMessage
    const qText = quoted && ((quoted.extendedTextMessage && quoted.extendedTextMessage.text) || quoted.conversation || null)
    if (qText) target = extractUrlFromText(qText)
  }
  if (!target) target = extractUrlFromText(txt)
  const finalUrl = normalizeUrl(target)
  if (!finalUrl) return ctx.reply('Format:\n- .fb <url video Facebook>\n- atau reply pesan berisi URL lalu ketik .fb')
  try {
    await ctx.reply('Mengambil link unduhan...')
    const payload = await fetchJsonAny(API_BASE + encodeURIComponent(finalUrl))
    const links = findLinks(payload)
    if (!links.length) {
      const rawInfo = typeof payload === 'object' ? JSON.stringify(payload).slice(0, 300) : String(payload).slice(0, 300)
      await ctx.client.sendMessage(ctx.from, { text: 'Tidak menemukan link unduhan.\nCuplikan respons:\n' + rawInfo }, { quoted: ctx.message })
      return
    }
    const best = preferVideo(links)
    if (!best) {
      const list = links.slice(0, 6).map(x => (x.quality ? x.quality + ' - ' : '') + x.url).join('\n')
      await ctx.client.sendMessage(ctx.from, { text: 'Pilih salah satu link:\n' + list }, { quoted: ctx.message })
      return
    }
    const info = 'Quality: ' + (best.quality || '-') + '\nSource: ' + finalUrl
    try {
      const file = await downloadBuffer(best.url)
      if (file.buffer.length > MAX_BYTES) {
        const lines = ['File terlalu besar untuk dikirim langsung.', info, 'Unduh via link berikut:', best.url]
        await ctx.client.sendMessage(ctx.from, { text: lines.join('\n') }, { quoted: ctx.message })
        return
      }
      await ctx.client.sendMessage(
        ctx.from,
        { video: file.buffer, mimetype: file.mime, caption: info, fileName: 'facebook.mp4' },
        { quoted: ctx.message }
      )
    } catch (e) {
      const lines = ['Gagal mengunduh langsung.', info, 'Link langsung:', best.url]
      await ctx.client.sendMessage(ctx.from, { text: lines.join('\n') }, { quoted: ctx.message })
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    await ctx.client.sendMessage(ctx.from, { text: 'Gagal memproses permintaan.\nAlasan: ' + msg }, { quoted: ctx.message })
  }
}

handler.command = function (ctx) { return /^[.!](fb|fbdl|facebook|fbvid|fbdown)\b/i.test(String(ctx.text || '')) }
handler.role = 'all'
handler.scope = 'all'
handler.enabled = true
handler.key = 'tools_facebook_dl'
handler.tags = ['tools','download']
handler.cost = 0
handler.help = ['.fb <url video facebook>', '.fbdl <url>']

module.exports = handler