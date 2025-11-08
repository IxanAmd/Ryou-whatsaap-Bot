const axios = require('axios')

const SEARCH_API = 'https://api-ai-hoshino.vercel.app/search/npm?q='
const SSWEB_API = 'https://api-ai-hoshino.vercel.app/tools/ssweb?url='

function tryParseJson(x) {
  if (x && typeof x === 'object') return x
  const s = String(x || '').trim()
  if (!s) return null
  try { return JSON.parse(s) } catch {}
  return null
}

async function fetchJsonAny(url) {
  const res = await axios.get(url, {
    timeout: 20000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  return tryParseJson(res.data) || {}
}

function firstItem(payload) {
  if (Array.isArray(payload)) return payload[0] || {}
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.result)) return payload.result[0] || {}
    if (Array.isArray(payload.data)) return payload.data[0] || {}
    if (Array.isArray(payload.results)) return payload.results[0] || {}
  }
  return payload || {}
}

function cleanRepo(u) {
  if (!u) return ''
  let s = String(u).trim()
  s = s.replace(/^git\+/, '')
  s = s.replace(/\.git(#.*)?$/, '')
  return s
}

function packageNameFromNpmUrl(u) {
  const m = String(u || '').match(/\/package\/([^/?#]+)/i)
  return m ? decodeURIComponent(m[1]) : ''
}

function previewCandidates(npmUrl) {
  const name = packageNameFromNpmUrl(npmUrl)
  if (!name) return [npmUrl].filter(Boolean)
  const n = encodeURIComponent(name)
  const list = [
    'https://www.npmmirror.com/package/' + n,
    'https://unpkg.com/browse/' + n + '/',
    'https://www.jsdelivr.com/package/npm/' + n,
    'https://bundlephobia.com/package/' + n,
    'https://yarnpkg.com/package/' + n,
    npmUrl
  ]
  return Array.from(new Set(list.filter(Boolean)))
}

function findAnyUrl(node) {
  const RX = /https?:\/\/[^\s"'<>\]}]+/i
  if (node == null) return null
  if (typeof node === 'string') { const m = node.match(RX); return m ? m[0] : null }
  if (Array.isArray(node)) { for (const v of node) { const h = findAnyUrl(v); if (h) return h } return null }
  if (typeof node === 'object') {
    const preferred = ['image','img','url','link','src','file','result','data']
    for (const k of preferred) if (k in node) { const h = findAnyUrl(node[k]); if (h) return h }
    for (const k of Object.keys(node)) { if (preferred.includes(k)) continue; const h = findAnyUrl(node[k]); if (h) return h }
  }
  return null
}

async function fetchSswebImage(pageUrl) {
  const ep = SSWEB_API + encodeURIComponent(pageUrl)
  const res = await axios.get(ep, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 3,
    validateStatus: s => s >= 200 && s < 500,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
  })
  const ct = String(res.headers['content-type'] || '').toLowerCase()
  if (ct.includes('image/')) return { buffer: Buffer.from(res.data), mime: ct.split(';')[0] }
  let text = ''
  try { text = Buffer.from(res.data).toString('utf8') } catch {}
  let json = null
  if (ct.includes('json')) { try { json = JSON.parse(text) } catch {} }
  let imgUrl = null
  if (json) imgUrl = findAnyUrl(json)
  if (!imgUrl && text) { const m = text.match(/https?:\/\/[^\s"'<>\]}]+/i); if (m) imgUrl = m[0] }
  if (!imgUrl) throw new Error('no-image-url-from-ssweb')
  const img = await axios.get(imgUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    validateStatus: s => s >= 200 && s < 400
  })
  const mime = String(img.headers['content-type'] || 'image/png').split(';')[0]
  return { buffer: Buffer.from(img.data), mime }
}

async function handler(ctx) {
  const txt = String(ctx.text || '').trim()
  if (!/^[.!](npm|npms|np)\b/i.test(txt)) return
  const q = txt.replace(/^[.!](npm|npms|np)\b/i, '').trim()
  if (!q) return ctx.reply('Format:\n- .npm <nama paket>')

  try {
    await ctx.reply('🔍 Mencari paket...')
    const raw = await fetchJsonAny(SEARCH_API + encodeURIComponent(q))
    const it = firstItem(raw)
    const title = it.title || '-'
    const author = it.author || '-'
    const update = it.update || '-'
    const links = it.links || {}
    const homepage = links.homepage || '-'
    const repo = cleanRepo(links.repository || '')
    const npmUrl = links.npm || ('https://www.npmjs.com/package/' + encodeURIComponent(q))

    const caption =
'📦 TITLE : ' + title + '\n' +
'👤 AUTHOR : ' + author + '\n' +
'🕒 UPDATE : ' + update + '\n' +
'🏠 HOMEPAGE : ' + homepage + '\n' +
'📂 REPOSITORY : ' + (repo || '-') + '\n' +
'🔗 NPM : ' + npmUrl

    const candidates = previewCandidates(npmUrl)
    let sent = null
    for (const url of candidates) {
      try {
        const shot = await fetchSswebImage(url)
        sent = await ctx.client.sendMessage(ctx.from, { image: shot.buffer, mimetype: shot.mime, caption }, { quoted: ctx.message })
        break
      } catch {}
    }
    if (!sent) await ctx.client.sendMessage(ctx.from, { text: caption }, { quoted: ctx.message })
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    await ctx.client.sendMessage(ctx.from, { text: 'Gagal mengambil data NPM.\nAlasan: ' + msg }, { quoted: ctx.message })
  }
}

handler.command = ctx => /^[.!](npm|npms|np)\b/i.test(String(ctx.text || ''))
handler.role = 'all'
handler.scope = 'all'
handler.enabled = true
handler.key = 'tools_npm_ssweb'
handler.tags = ['tools','web']
handler.cost = 0
handler.help = ['.npm <nama paket>']

module.exports = handler