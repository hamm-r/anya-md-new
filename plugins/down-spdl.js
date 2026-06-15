/*
  fungsi : download audio dari spotify
  type   : plugin esm
  by     : wolep
  fixed  : Hamm
*/

import sharp from 'sharp'
import { prepareWAMessageMedia } from '@itsliaaa/baileys'

const FALLBACK_THUMB = 'https://u.pone.rs/corryafj.jpg'

const sdown = {
  _tools: {
    async hit(desc, url, options = {}, returnType = 'text') {
      try {
        const response = await fetch(url, options)

        if (!response.ok) {
          const txt = await response.text().catch(() => '')
          throw new Error(
            `${response.status} ${response.statusText} ${(txt || '(body kosong)').slice(0, 100)}`
          )
        }

        if (returnType === 'json') return { data: await response.json(), response }
        if (returnType === 'text') return { data: await response.text(), response }

        throw new Error('returnType harus text/json')
      } catch (e) {
        throw new Error(`gagal hit ${desc}\n${e.message}`)
      }
    },

    validateString(desc, value) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${desc} kosong`)
      }
    }
  },

  get baseHeaders() {
    return {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
    }
  },

  get baseUrl() {
    return 'https://spotidown.app/'
  },

  async getCookieAndToken() {
    const { data: html, response } = await this._tools.hit('homepage', this.baseUrl, {
      headers: this.baseHeaders
    })

    const tokenName = html.match(/input name="(.+?)"/)?.[1]
    const tokenValue = html.match(/type="hidden" value="(.+?)"/)?.[1]

    let cookie = ''

    if (typeof response.headers.getSetCookie === 'function') {
      cookie = response.headers.getSetCookie()?.[0]?.split(';')?.[0] || ''
    }

    if (!cookie) {
      cookie = response.headers.get('set-cookie')?.split(';')?.[0] || ''
    }

    if (!tokenName || !tokenValue || !cookie) {
      throw new Error('token/cookie tidak ditemukan')
    }

    return { tokenName, tokenValue, cookie }
  },

  async action(trackUrl, gcatObject) {
    const { cookie, tokenName, tokenValue } = gcatObject

    const headers = {
      ...this.baseHeaders,
      referer: this.baseUrl,
      cookie
    }

    const body = new URLSearchParams()
    body.append('url', trackUrl)
    body.append(tokenName, tokenValue)
    body.append('g-recaptcha-response', '')

    const api = new URL('/action', this.baseUrl)

    const { data: json } = await this._tools.hit(
      'action',
      api.href,
      {
        method: 'POST',
        headers,
        body
      },
      'json'
    )

    if (json.error) {
      throw new Error(JSON.stringify(json, null, 2))
    }

    const html = json.data || ''

    const image = html.match(/<img src="(.+?)"/)?.[1]
    const data = html.match(/name="data" value=(?:"|')(.+?)(?:"|')/)?.[1]
    const base = html.match(/name="base" value="(.+?)"/)?.[1]
    const token = html.match(/name="token" value="(.+?)"/)?.[1]

    if (!data || !base || !token) {
      throw new Error('data/base/token tidak ditemukan')
    }

    return { image, data, base, token, headers }
  },

  async track(aObject) {
    const { data, base, token, image, headers } = aObject

    const body = new URLSearchParams({ data, base, token })
    const api = new URL('/action/track', this.baseUrl)

    const { data: json } = await this._tools.hit(
      'track',
      api.href,
      {
        method: 'POST',
        headers,
        body
      },
      'json'
    )

    if (json.error) {
      throw new Error(JSON.stringify(json, null, 2))
    }

    const html = json.data || ''

    const title = html.match(/title="(.+?)">/)?.[1] || 'Unknown Title'
    const artist = html.match(/<span>(.+?)<\/span>/)?.[1] || 'Unknown Artist'
    const audioUrl = html.match(/href="(.+?)" class="abutton is-success is-fullwidth /)?.[1]
    const albumArtUrl = html.match(/href="(.+?)"(?:.+?)Download Cover \[HD\]/s)?.[1]

    if (!audioUrl) throw new Error('audioUrl tidak ditemukan')

    return {
      title: decodeHtml(title),
      artist: decodeHtml(artist),
      audioUrl,
      albumArtUrl: albumArtUrl || image || FALLBACK_THUMB
    }
  },

  async download(trackUrl) {
    this._tools.validateString('url spotify track', trackUrl)

    if (!/open\.spotify\.com\/track/i.test(trackUrl)) {
      throw new Error('link harus track Spotify')
    }

    const gcatObject = await this.getCookieAndToken()
    const aObject = await this.action(trackUrl, gcatObject)
    return await this.track(aObject)
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Contoh:\n${usedPrefix + command} https://open.spotify.com/track/26KhLgFuPymkm1uiZkc6Rv`
  }

  await m.react('🎧')

  const spotifyUrl = text.trim()

  try {
    const result = await sdown.download(spotifyUrl)

    const thumb = await getThumb(result.albumArtUrl || FALLBACK_THUMB)
    const highQualityThumbnail = await createHighQualityThumbnail(conn, thumb)

    const invisible = '\u200B'.repeat(400)

    const caption = `
┈─ ◦ spotify audio ◦ ─┈

🎵 ${result.title}

👤 ${result.artist}

⏳ sedang mengirim audio...
`.trim()

    await conn.sendMessage(
      m.chat,
      {
        text: `${spotifyUrl}${invisible}

${caption}`,

        linkPreview: {
          'matched-text': spotifyUrl,
          matchedText: spotifyUrl,
          canonicalUrl: spotifyUrl,
          title: result.title,
          description: `🎧 Anya MD • ${result.artist}`,
          previewType: 0,
          jpegThumbnail: thumb,
          highQualityThumbnail,
          thumbnailUrl: result.albumArtUrl || FALLBACK_THUMB,
          linkPreviewMetadata: {
            linkMediaDuration: 0,
            socialMediaPostType: 4
          }
        },

        favicon: {
          url: result.albumArtUrl || FALLBACK_THUMB
        }
      },
      {
        quoted: global.fmeta || m
      }
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: {
          url: result.audioUrl
        },
        mimetype: 'audio/mpeg',
        fileName: `${safeFileName(result.title)}.mp3`,
        ptt: false
      },
      {
        quoted: global.fmeta || m
      }
    )

    await m.react('✅')
  } catch (e) {
    console.error(e)

    await m.react('❌')

    await conn.sendMessage(
      m.chat,
      {
        text: `❌ Audio Spotify gagal diambil.\n\n${e.message || e}`
      },
      {
        quoted: global.fmeta || m
      }
    )
  }
}

handler.help = ['spotifydl <url>', 'spotify <url>', 'sdown <url>']
handler.tags = ['downloader']
handler.command = /^(spotifydl|spotify|sdown|spdl)$/i
handler.limit = true

export default handler

async function getThumb(url) {
  try {
    const res = await fetch(url || FALLBACK_THUMB, {
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })

    if (!res.ok) throw new Error('Thumbnail gagal diambil')

    const raw = Buffer.from(await res.arrayBuffer())

    return await sharp(raw)
      .resize(1280, 720, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 90
      })
      .toBuffer()
  } catch (e) {
    console.error('Thumb Error:', e)

    try {
      const res = await fetch(FALLBACK_THUMB)
      const raw = Buffer.from(await res.arrayBuffer())

      return await sharp(raw)
        .resize(1280, 720, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 90
        })
        .toBuffer()
    } catch {
      return Buffer.alloc(0)
    }
  }
}

async function createHighQualityThumbnail(conn, thumb) {
  try {
    if (!thumb?.length) return null

    const { imageMessage } = await prepareWAMessageMedia(
      {
        image: thumb
      },
      {
        upload: conn.waUploadToServer,
        mediaTypeOverride: 'thumbnail-link'
      }
    )

    imageMessage.width = 1280
    imageMessage.height = 720

    return imageMessage
  } catch (e) {
    console.error('HQ Thumb Error:', e)
    return null
  }
}

function safeFileName(name = 'spotify') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'spotify'
}

function decodeHtml(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}