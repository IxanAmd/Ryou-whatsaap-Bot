const axios = require('axios')

const API_BASE = 'https://api-ai-hoshino.vercel.app/download/ytmp3?url='
const MAX_BYTES = 25 * 1024 * 1024

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

function tryParseJson(x) {
  if (x && typeof x === 'object') return x
  const s = String(x || '').trim()
  if (!s) return null
  try { return JSON.parse(s) } catch {}
  return null
}

async function fetchJsonAny(url) {
  const res = await axios.get(url, {
    timeout: 25000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  return tryParseJson(res.data) || {}
}

function bytesFromSize(str) {
  if (!str) return null
  const m = String(str).trim().match(/^([\d.]+)\s*(kb|mb|gb|b)?/i)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = (m[2] || 'b').toLowerCase()
  if (unit === 'gb') return Math.round(n * 1024 * 1024 * 1024)
  if (unit === 'mb') return Math.round(n * 1024 * 1024)
  if (unit === 'kb') return Math.round(n * 1024)
  return Math.round(n)
}

function findAudioLinks(node) {
  const out = []
  function push(u, br, sz, mime, title, dur) {
    if (!u) return
    const s = String(u)
    if (!/^https?:\/\//i.test(s)) return
    out.push({
      url: s,
      bitrate: br != null ? Number(br) : null,
      sizeText: sz || '',
      sizeBytes: bytesFromSize(sz) || null,
      mime: mime || '',
      title: title || '',
      duration: dur || ''
    })
  }
  function walk(n) {
    if (!n) return
    if (typeof n === 'string') {
      if (/^https?:\/\//i.test(n)) push(n)
      return
    }
    if (Array.isArray(n)) { for (const v of n) walk(v); return }
    if (typeof n === 'object') {
      const u = n.audio || n.mp3 || n.url || n.download_url || n.link || n.dl || n.href
      const br = n.bitrate || n.kbps || n.quality || n.q
      const sz = n.size || n.filesize || n.fileSize
      const mime = n.mime || n.type || ''
      const title = n.title || n.filename || n.name
      const dur = n.duration || n.length || n.time
      if (u) push(u, br, sz, mime, title, dur)
      if (Array.isArray(n.result)) for (const v of n.result) walk(v)
      if (Array.isArray(n.data)) for (const v of n.data) walk(v)
      if (Array.isArray(n.links)) for (const v of n.links) walk(v)
      for (const k of Object.keys(n)) {
        if (['audio','mp3','url','download_url','link','dl','href','bitrate','kbps','quality','q','size','filesize','fileSize','mime','type','title','filename','name','duration','length','time','result','data','links'].includes(k)) continue
        walk(n[k])
      }
    }
  }
  walk(node)
  return out
}

function preferBestAudio(arr) {
  const onlyAudio = arr.filter(x => /\.(mp3|m4a|aac|opus)(\?|$)/i.test(x.url) || /audio/i.test(x.mime))
  const list = onlyAudio.length ? onlyAudio : arr
  list.sort((a, b) => {
    const ba = a.bitrate || 0
    const bb = b.bitrate || 0
    if (bb !== ba) return bb - ba
    const sa = a.sizeBytes || 0
    const sb = b.sizeBytes || 0
    return sb - sa
  })
  return list[0] || null
}

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
    validateStatus: s => s >= 200 && s < 400,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  const mime = String(res.headers['content-type'] || 'audio/mpeg').split(';')[0]
  const buf = Buffer.from(res.data)
  return { buffer: buf, mime }
}

function buildCaption(meta, src) {
  const rows = []
  const t = meta.title || '-'
  const d = meta.duration || '-'
  const q = meta.bitrate ? String(meta.bitrate) + ' kbps' : '-'
  const s = meta.sizeText || (meta.sizeBytes ? Math.round(meta.sizeBytes / (1024 * 1024)) + ' MB' : '-')
  rows.push('Title: ' + t)
  rows.push('Duration: ' + d)
  rows.push('Bitrate: ' + q)
  rows.push('Size: ' + s)
  rows.push('Source: ' + src)
  return rows.join('\n')
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim()
  if (!/^[.!](ytmp3|mp3|yta|song)\b/i.test(txt)) return
  const arg = txt.replace(/^[.!](ytmp3|mp3|yta|song)\b/i, '').trim()
  let target = extractUrlFromText(arg)
  if (!target) {
    const root = (ctx.message && ctx.message.message) || {}
    const quoted = root.extendedTextMessage && root.extendedTextMessage.contextInfo && root.extendedTextMessage.contextInfo.quotedMessage
    const qText = quoted && ((quoted.extendedTextMessage && quoted.extendedTextMessage.text) || quoted.conversation || null)
    if (qText) target = extractUrlFromText(qText)
  }
  if (!target) target = extractUrlFromText(txt)
  const finalUrl = normalizeUrl(target)
  if (!finalUrl) return ctx.reply('Format:\n- .mp3 <url YouTube>\n- atau reply pesan berisi URL lalu ketik .mp3')

  try {
    await ctx.reply('Mengambil link audio...')
    const payload = await fetchJsonAny(API_BASE + encodeURIComponent(finalUrl))
    const links = findAudioLinks(payload)
    if (!links.length) {
      const rawInfo = typeof payload === 'object' ? JSON.stringify(payload).slice(0, 300) : String(payload).slice(0, 300)
      await ctx.client.sendMessage(ctx.from, { text: 'Tidak menemukan link audio.\nCuplikan respons:\n' + rawInfo }, { quoted: ctx.message })
      return
    }
    const best = preferBestAudio(links)
    if (!best) {
      const list = links.slice(0, 6).map(x => (x.bitrate ? x.bitrate + 'kbps - ' : '') + (x.sizeText || '') + ' ' + x.url).join('\n')
      await ctx.client.sendMessage(ctx.from, { text: 'Pilih salah satu link:\n' + list }, { quoted: ctx.message })
      return
    }
    const caption = buildCaption(best, finalUrl)
    try {
      if (best.sizeBytes && best.sizeBytes > MAX_BYTES) throw new Error('file-too-large')
      const file = await downloadBuffer(best.url)
      if (file.buffer.length > MAX_BYTES) throw new Error('file-too-large')
      const extName = /\.(m4a|aac|opus|mp3)(\?|$)/i.exec(best.url)
      const name = (best.title ? best.title.replace(/[^\w\- .()[\]]+/g, '_') : 'audio') + '.' + (extName ? extName[1].toLowerCase() : 'mp3')
      await ctx.client.sendMessage(
        ctx.from,
        { audio: file.buffer, mimetype: file.mime || 'audio/mpeg', ptt: false, fileName: name, caption },
        { quoted: ctx.message }
      )
    } catch (e) {
      const lines = ['Tidak bisa mengirim audio langsung.', caption, 'Unduh lewat link:', best.url]
      await ctx.client.sendMessage(ctx.from, { text: lines.join('\n') }, { quoted: ctx.message })
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    await ctx.client.sendMessage(ctx.from, { text: 'Gagal memproses YTMP3.\nAlasan: ' + msg }, { quoted: ctx.message })
  }
}

handler.command = function (ctx) { return /^[.!](ytmp3|mp3|yta|song)\b/i.test(String(ctx.text || '')) }
handler.role = 'all'
handler.scope = 'all'
handler.enabled = true
handler.key = 'tools_ytmp3'
handler.tags = ['tools','download','music']
handler.cost = 0
handler.help = ['.mp3 <url youtube>', '.ytmp3 <url>']

module.exports = handler