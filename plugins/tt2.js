/*
📌 Name: ssstik.io - TikTok Download
🏷️ Type : Plugin ESM
🔗 Base url : https://ssstik.io
👤 Creator : Hazel
🔧 Convert & Fix : Hamm
*/

import axios from 'axios'

function clean(str = '') {
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function pick(html, regex) {
  return clean(html.match(regex)?.[1] || '')
}

function formatNumber(num = '') {
  if (!num) return '-'
  const n = Number(String(num).replace(/[^\d]/g, ''))
  if (!n) return clean(num)
  return n.toLocaleString('id-ID')
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function ssstik(url) {
  if (!url) throw new Error('URL TikTok wajib diisi.')

  try {
    await axios.get('https://ssstik.io/cdn-cgi/trace', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const form = new URLSearchParams()
    form.append('id', url)
    form.append('locale', 'id')
    form.append('tt', 'dHVmeFcy')
    form.append('debug', 'ab=0&loc=ID')

    const { data } = await axios.post(
      'https://ssstik.io/abc?url=dl',
      form.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'HX-Request': 'true',
          'HX-Trigger': '_gcaptcha_pt',
          'HX-Target': 'target',
          'HX-Current-URL': 'https://ssstik.io/id',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 30000
      }
    )

    const html = String(data)

    const video =
      html.match(/href="(https:\/\/[^"]+)"[^>]*without_watermark/i)?.[1] ||
      html.match(/href="(https:\/\/[^"]+)"[^>]*download_link/i)?.[1]

    const audio =
      html.match(/href="(https:\/\/[^"]+)"[^>]*music/i)?.[1] ||
      html.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/i)?.[1]

    const images = [...html.matchAll(/<img[^>]+src="(https:\/\/[^"]+)"/gi)]
      .map(v => v[1])
      .filter(v =>
        /ssstik|tikcdn|tiktokcdn|muscdn|byte/i.test(v) &&
        !/avatar|profile|logo/i.test(v)
      )

    const title =
      pick(html, /<p[^>]*class="[^"]*maintext[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      pick(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i)

    const uploader =
      pick(html, /<h2[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) ||
      pick(html, /@([a-zA-Z0-9._]+)/i)

    const duration =
      pick(html, /duration<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
      pick(html, /Durasi\s*:?\s*([^<\n]+)/i)

    const views =
      pick(html, /views?<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
      pick(html, /Views?\s*:?\s*([^<\n]+)/i) ||
      pick(html, /👀\s*([^<\n]+)/i)

    const likes =
      pick(html, /likes?<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
      pick(html, /Likes?\s*:?\s*([^<\n]+)/i) ||
      pick(html, /❤\s*([^<\n]+)/i)

    const uniqueImages = [...new Set(images)]

    if (!video && !audio && uniqueImages.length < 1) {
      throw new Error('Media tidak ditemukan.')
    }

    return {
      status: true,
      isVideo: !!video,
      isPhoto: !video && uniqueImages.length > 0,
      video,
      audio,
      images: uniqueImages,
      title,
      uploader,
      duration,
      views,
      likes
    }
  } catch (e) {
    return {
      status: false,
      error: e?.message || String(e)
    }
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    await m.react?.('✨')

    const input = m.quoted?.text || text

    if (!input) {
      return m.reply(
        `Contoh:\n` +
        `${usedPrefix + command} https://vt.tiktok.com/xxxx`
      )
    }

    const regex = /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/photo\/\d+)/
    const url = input.match(regex)?.[0]

    if (!url) return m.reply('❌ URL TikTok tidak valid.')

    const res = await ssstik(url)

    if (!res.status) {
      await m.react?.('❌')
      return m.reply(`❌ Gagal mengambil data TikTok.\n\n${res.error}`)
    }

    if (res.isPhoto) {
      for (let i = 0; i < res.images.length; i++) {
        await conn.sendMessage(
          m.chat,
          {
            image: { url: res.images[i] },
            caption:
              i === 0
                ? `🎌 *TIKTOK PHOTO*

> *Judul*: ${res.title || '-'}
> *Uploader*: ${res.uploader || '-'}
> *Total Foto*: ${res.images.length}
> *Views*: ${formatNumber(res.views)}
> *Likes*: ${formatNumber(res.likes)}`
                : ''
          },
          { quoted: m }
        )

        await delay(3000)
      }

      if (res.audio) {
        await conn.sendMessage(
          m.chat,
          {
            audio: { url: res.audio },
            mimetype: 'audio/mpeg',
            fileName: `${res.title || 'tiktok-photo'}.mp3`
          },
          { quoted: m }
        )
      }
    } else if (res.isVideo) {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: res.video },
          caption: `🎌 *TIKTOK VIDEO*

> *Judul*: ${res.title || '-'}
> *Uploader*: ${res.uploader || '-'}
> *Durasi*: ${res.duration || '-'}
> *Views*: ${formatNumber(res.views)}
> *Likes*: ${formatNumber(res.likes)}`
        },
        { quoted: m }
      )

      if (res.audio) {
        await conn.sendMessage(
          m.chat,
          {
            audio: { url: res.audio },
            mimetype: 'audio/mpeg',
            fileName: `${res.title || 'tiktok-video'}.mp3`
          },
          { quoted: m }
        )
      }
    } else if (res.audio) {
      await conn.sendMessage(
        m.chat,
        {
          audio: { url: res.audio },
          mimetype: 'audio/mpeg',
          fileName: `${res.title || 'tiktok-audio'}.mp3`
        },
        { quoted: m }
      )
    }

    await m.react?.('✅')
  } catch (e) {
    console.error(e)
    await m.react?.('❌')
    m.reply('❌ Terjadi kesalahan.')
  }
}

handler.help = ['ssstik <url>', 'ttss <url>', 'tiktokss <url>']
handler.tags = ['downloader']
handler.command = /^(tt2|ttss|tiktokss)$/i
handler.limit = true

export default handler