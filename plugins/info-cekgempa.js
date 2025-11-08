const axios = require('axios')

const API_URL = 'https://api-ai-hoshino.vercel.app/tools/cekgempa'

function toNum(x, d = 0) {
  const n = Number(x)
  return Number.isFinite(n) ? n : d
}

function parseTime(s) {
  if (!s) return null
  const t = Date.parse(s)
  if (!isNaN(t)) return new Date(t)
  const m = String(s).match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/)
  if (m) {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), toNum(m[1]), toNum(m[2]), toNum(m[3], 0))
    return d
  }
  const m2 = String(s).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m2) {
    return new Date(toNum(m2[1]), toNum(m2[2]) - 1, toNum(m2[3]), toNum(m2[4], 0), toNum(m2[5], 0), toNum(m2[6], 0))
  }
  return null
}

function normalizeItem(x) {
  const o = x || {}
  const mag = o.magnitude || o.mag || o.magnitudo || o.M || o.Magnitude || null
  const depth = o.depth || o.kedalaman || o.kedalaman_km || o.D || null
  const lat = o.latitude || o.lat || (o.coords && o.coords.lat) || null
  const lon = o.longitude || o.lon || o.lng || (o.coords && o.coords.lon) || null
  const loc = o.lokasi || o.location || o.wilayah || o.place || o.dirasa || o.area || null
  const img = o.shakemap || o.map || o.image || o.img || (o.data && o.data.shakemap) || null
  const t1 = o.waktu || o.time || o.tanggal || o.datetime || o.jam || o.date || null
  const t2 = o.updated_at || o.update || o.published_at || o.publish || null
  const epoch = o.epoch || o.timestamp || null
  let dt = null
  if (epoch) {
    const e = toNum(epoch)
    if (e > 0) dt = new Date(e > 1e12 ? e : e * 1000)
  }
  if (!dt) dt = parseTime(t1) || parseTime(t2)
  return {
    magnitude: typeof mag === 'string' ? mag : (mag != null ? String(mag) : null),
    depth: typeof depth === 'string' ? depth : (depth != null ? String(depth) : null),
    latitude: lat != null ? Number(lat) : null,
    longitude: lon != null ? Number(lon) : null,
    location: loc || '',
    image: img || '',
    time: dt
  }
}

function pickLatest(payload) {
  const arr = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.result) ? payload.result : null))
  if (arr && arr.length) {
    const norm = arr.map(normalizeItem)
    norm.sort((a, b) => {
      const ta = a.time ? a.time.getTime() : 0
      const tb = b.time ? b.time.getTime() : 0
      return tb - ta
    })
    return norm[0]
  }
  return normalizeItem(payload?.data || payload?.result || payload)
}

function fmtDate(d) {
  if (!d) return '-'
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

async function fetchGempa() {
  const res = await axios.get(API_URL, {
    timeout: 20000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' }
  })
  const ctype = String(res.headers['content-type'] || '').toLowerCase()
  let data = res.data
  if (typeof data === 'string' && ctype.includes('application/json')) {
    try { data = JSON.parse(data) } catch {}
  }
  const item = pickLatest(data)
  return item
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim()
  if (!/^[.!](gempa|cekgempa|gempabmkg)\b/i.test(txt)) return
  try {
    await ctx.reply('Mengambil data gempa...')
    const it = await fetchGempa()
    const lines = []
    lines.push('Info Gempa Terkini')
    lines.push('Waktu: ' + fmtDate(it.time))
    if (it.location) lines.push('Lokasi: ' + it.location)
    if (it.magnitude) lines.push('Magnitudo: ' + it.magnitude)
    if (it.depth) lines.push('Kedalaman: ' + it.depth)
    if (Number.isFinite(it.latitude) && Number.isFinite(it.longitude)) {
      lines.push('Koordinat: ' + it.latitude + ', ' + it.longitude)
    }
    const caption = lines.join('\n')
    if (it.image && /^https?:\/\//i.test(it.image)) {
      try {
        const img = await axios.get(it.image, { responseType: 'arraybuffer', timeout: 20000, validateStatus: s => s >= 200 && s < 400 })
        await ctx.client.sendMessage(ctx.from, { image: Buffer.from(img.data), mimetype: String(img.headers['content-type'] || 'image/png').split(';')[0], caption }, { quoted: ctx.message })
        return
      } catch {}
    }
    await ctx.client.sendMessage(ctx.from, { text: caption }, { quoted: ctx.message })
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    await ctx.client.sendMessage(ctx.from, { text: 'Gagal mengambil data gempa.\nAlasan: ' + msg }, { quoted: ctx.message })
  }
}

handler.command = function (ctx) { return /^[.!](gempa|cekgempa|gempabmkg)\b/i.test(String(ctx.text || '')) }
handler.role = 'all'
handler.scope = 'all'
handler.enabled = true
handler.key = 'tools_cekgempa_hoshino'
handler.tags = ['tools', 'info']
handler.cost = 0
handler.help = ['.gempa', '.cekgempa']

module.exports = handler