const axios = require('axios')

const { URL } = require('url')

const API_BASE = 'https://api-ai-hoshino.vercel.app/tools/ssweb?url='

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

    const preferred = ['image', 'screenshot', 'file', 'url', 'link', 'result', 'result_url', 'data', 'src']

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

async function fetchImageBuffer(url) {

  const res = await axios.get(url, {

    responseType: 'arraybuffer',

    timeout: 30000,

    maxRedirects: 3,

    validateStatus: s => s >= 200 && s < 400,

    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }

  })

  const mime = String(res.headers['content-type'] || 'image/png').split(';')[0]

  return { buffer: Buffer.from(res.data), mime }

}

async function requestSsweb(targetUrl) {

  const endpoint = API_BASE + encodeURIComponent(targetUrl)

  const res = await axios.get(endpoint, {

    responseType: 'arraybuffer',

    timeout: 45000,

    maxRedirects: 3,

    validateStatus: s => s >= 200 && s < 500,

    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }

  })

  const ctype = String(res.headers['content-type'] || '').toLowerCase()

  if (ctype.includes('image/')) {

    return { kind: 'image', mime: ctype.split(';')[0] || 'image/png', buffer: Buffer.from(res.data) }

  }

  if (ctype.includes('application/json') || ctype.includes('text/json') || ctype.includes('text/plain') || ctype.includes('text/html')) {

    let body = res.data

    let text = ''

    try { text = Buffer.from(body).toString('utf8') } catch { text = '' }

    let json = null

    if (ctype.includes('json')) {

      try { json = JSON.parse(text) } catch {}

    }

    if (json) {

      const urlInJson = findAnyUrl(json)

      if (urlInJson) {

        const img = await fetchImageBuffer(urlInJson)

        return { kind: 'image', mime: img.mime, buffer: img.buffer }

      }

      return { kind: 'json', json }

    } else {

      const m = text.match(/https?:\/\/[^\s"'<>\]}]+/i)

      if (m) {

        const img = await fetchImageBuffer(m[0])

        return { kind: 'image', mime: img.mime, buffer: img.buffer }

      }

      return { kind: 'unknown', note: 'no-url-in-body' }

    }

  }

  return { kind: 'unknown', note: 'unsupported-content-type ' + ctype }

}

async function handler(ctx) {

  const txt = String(ctx.text || '').trim()

  if (!/^[.!](ssweb|ss|screenshot)\b/i.test(txt)) return

  const arg = txt.replace(/^[.!](ssweb|ss|screenshot)\b/i, '').trim()

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

    return ctx.reply('Format:\n- .ssweb <url>\n- atau reply pesan yang mengandung URL lalu ketik .ssweb')

  }

  try {

    await ctx.reply('Mengambil screenshot...')

    const result = await requestSsweb(finalUrl)

    if (result.kind === 'image') {

      await ctx.client.sendMessage(ctx.from, { image: result.buffer, caption: 'Screenshot\n' + finalUrl, mimetype: result.mime, fileName: 'ssweb.png' }, { quoted: ctx.message })

      return

    }

    if (result.kind === 'json') {

      const safe = JSON.stringify(result.json, null, 2).slice(0, 3500)

      await ctx.client.sendMessage(ctx.from, { text: 'API mengembalikan JSON:\n```json\n' + safe + '\n```' }, { quoted: ctx.message })

      return

    }

    await ctx.client.sendMessage(ctx.from, { text: 'Tidak menerima gambar dari API.\nDetail: ' + (result.note || 'unknown') + '\nURL: ' + finalUrl }, { quoted: ctx.message })

  } catch (e) {

    const msg = e && e.message ? e.message : String(e)

    await ctx.client.sendMessage(ctx.from, { text: 'Gagal mengambil screenshot.\nAlasan: ' + msg + '\nURL: ' + finalUrl }, { quoted: ctx.message })

  }

}

handler.command = function (ctx) { return /^[.!](ssweb|ss|screenshot)\b/i.test(String(ctx.text || '')) }

handler.role = 'all'

handler.scope = 'all'

handler.enabled = true

handler.key = 'tools_ssweb'

handler.tags = ['tools', 'web']

handler.cost = 1

handler.help = ['.ssweb <url>', '.ss <url>', '.screenshot <url>', '(bisa reply pesan yang berisi URL)']

module.exports = handler