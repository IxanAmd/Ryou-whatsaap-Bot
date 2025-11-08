const axios = require('axios')
const { URL } = require('url')

const API_BASE = 'https://api-ai-hoshino.vercel.app/tools/tinyurl?url='

function extractUrlFromText(text) {
  const rx = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/i
  const m = String(text || '').match(rx)
  return m ? m[0] : null
}

function normalizeUrl(raw) {
  if (!raw) return null
  let u = String(raw).trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try { return new URL(u).toString() } catch { return null }
}

function findAnyUrl(node) {
  const RX = /https?:\/\/[^\s"'<>\]}]+/i
  if (node == null) return null
  if (typeof node === 'string') {
    const m = node.match(RX)
    return m ? m[0] : null
  }
  if (Array.isArray(node)) {
    for (const v of node) {
      const hit = findAnyUrl(v)
      if (hit) return hit
    }
    return null
  }
  if (typeof node === 'object') {
    const preferred = ['short', 'short_url', 'result_url', 'tinyurl', 'tiny_url', 'url', 'link']
    for (const k of preferred) {
      if (k in node) {
        const hit = findAnyUrl(node[k])
        if (hit) return hit
      }
    }
    for (const k of Object.keys(node)) {
      if (preferred.includes(k)) continue
      const hit = findAnyUrl(node[k])
      if (hit) return hit
    }
  }
  return null
}

async function shortenViaHoshino(longUrl) {
  const endpoint = API_BASE + encodeURIComponent(longUrl)
  const res = await axios.get(endpoint, {
    timeout: 20000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  const ctype = String(res.headers['content-type'] || '').toLowerCase()
  if (ctype.includes('text/plain')) {
    const txt = String(res.data || '')
    const m = txt.match(/https?:\/\/[^\s"'<>\]}]+/i)
    if (m) return m[0]
  }
  let data = res.data
  if (typeof data === 'string' && ctype.includes('application/json')) {
    try { data = JSON.parse(data) } catch {}
  }
  if (typeof data === 'object' && data) {
    const found = findAnyUrl(data)
    if (found) return found
  }
  if (typeof res.data === 'string') {
    const m = res.data.match(/https?:\/\/[^\s"'<>\]}]+/i)
    if (m) return m[0]
  }
  throw new Error('Unexpected response from API (status=' + res.status + ')')
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim()
  if (!/^[.!](short|tiny|sl|s)\b/i.test(txt)) return
  const arg = txt.replace(/^[.!](short|tiny|sl|s)\b/i, '').trim()
  let target = extractUrlFromText(arg)
  if (!target) {
    const root = (ctx.message && ctx.message.message) || {}
    const quoted = root.extendedTextMessage && root.extendedTextMessage.contextInfo && root.extendedTextMessage.contextInfo.quotedMessage
    const qText = quoted && ((quoted.extendedTextMessage && quoted.extendedTextMessage.text) || quoted.conversation || null)
    if (qText) target = extractUrlFromText(qText)
  }
  if (!target) target = extractUrlFromText(txt)
  const finalUrl = normalizeUrl(target)
  if (!finalUrl) {
    return ctx.reply('Format:\n- .short <url>\n- atau reply pesan yang berisi URL lalu ketik .short')
  }
  try {
    await ctx.reply('Memproses short link...')
    const shortUrl = await shortenViaHoshino(finalUrl)
    const out = 'Short Link\nOriginal: ' + finalUrl + '\nShort:    ' + shortUrl
    await ctx.client.sendMessage(ctx.from, { text: out }, { quoted: ctx.message })
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    await ctx.client.sendMessage(ctx.from, { text: 'Gagal membuat short link.\nAlasan: ' + msg + '\nURL: ' + finalUrl }, { quoted: ctx.message })
  }
}

handler.command = function (ctx) { return /^[.!](short|tiny|sl|s)\b/i.test(String(ctx.text || '')) }
handler.role = 'all'
handler.scope = 'all'
handler.enabled = true
handler.key = 'tools_shorten_hoshino'
handler.tags = ['tools', 'url']
handler.cost = 1
handler.help = ['.short <url>', '.tiny <url>', '(bisa reply pesan yang berisi URL)']

module.exports = handler