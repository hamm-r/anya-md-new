/**
 * YTMP3 & YTMP4 Downloader
 * Type    : Plugins ESM
 * creator : Hilman
 * fixed   : Hamm
 */

import axios from 'axios'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

const qualityvideo = ['144', '240', '360', '720', '1080']
const qualityaudio = ['128', '320']

const MAX_VIDEO_DURATION = 5 * 60 // 5 menit
const MAX_UPLOAD_MB = 80 // ubah kalau mau
const MAX_UPLOAD_SIZE = MAX_UPLOAD_MB * 1024 * 1024

const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': '*/*',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Origin': 'https://iframe.y2meta-uk.com',
  'Referer': 'https://iframe.y2meta-uk.com/'
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function cleanName(name = 'file') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatSize(bytes = 0) {
  if (!bytes) return 'Unknown'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function ekstrakid(url) {
  const str = String(url)

  const p = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*?(?:v=)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ]

  for (const r of p) {
    const m = str.match(r)
    if (m) return m[1]
  }

  throw 'URL YouTube tidak valid'
}

async function search(query) {
  const r = await axios.get(
    `https://wwd.mp3juice.blog/search.php?q=${encodeURIComponent(query)}`,
    { headers }
  )

  if (!r.data?.items?.length) throw 'Lagu tidak ditemukan'
  return r.data.items[0].id
}

async function metadata(videoId) {
  const r = await axios.get(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  )

  return {
    title: r.data.title || 'YouTube',
    author: r.data.author_name || 'Unknown',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/0.jpg`
  }
}

async function getDuration(videoId) {
  try {
    const r = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const match = r.data.match(/"lengthSeconds":"(\d+)"/)
    return match ? Number(match[1]) : 0
  } catch {
    return 0
  }
}

async function getkey() {
  const r = await axios.get('https://cnv.cx/v2/sanity/key', { headers })
  if (!r.data?.key) throw 'Gagal mengambil key'
  return r.data.key
}

async function createjob(id, format, quality) {
  const key = await getkey()
  const isVideo = format === 'mp4'
  const q = String(quality || (isVideo ? '720' : '320'))

  const audio = isVideo ? '128' : qualityaudio.includes(q) ? q : '320'
  const video = isVideo ? qualityvideo.includes(q) ? q : '720' : '720'

  const r = await axios.post(
    'https://cnv.cx/v2/converter',
    new URLSearchParams({
      link: `https://youtu.be/${id}`,
      format,
      audioBitrate: String(audio),
      videoQuality: String(video),
      filenameStyle: 'pretty',
      vCodec: 'h264'
    }),
    {
      headers: {
        ...headers,
        key
      }
    }
  )

  return r.data
}

async function getJob(jobId) {
  const r = await axios.get(`https://cnv.cx/v2/status/${jobId}`, { headers })
  return r.data
}

async function poll(jobId, format, quality, meta) {
  for (let i = 0; i < 30; i++) {
    await sleep(2000)

    const s = await getJob(jobId)

    if (s.status === 'completed' && s.url) {
      return {
        ...meta,
        format,
        quality,
        download: s.url,
        filename: s.filename || `${cleanName(meta.title)}.${format}`
      }
    }

    if (s.status === 'error') throw s.message || 'Convert error'
  }

  throw 'Timeout saat convert'
}

async function y2mate(input, format = 'mp3', quality = null) {
  const isUrl = /(youtu\.be|youtube\.com)/i.test(input)
  const id = isUrl ? ekstrakid(input) : await search(input)

  const meta = await metadata(id)
  const duration = await getDuration(id)
  const job = await createjob(id, format, quality)

  if (job.status === 'tunnel' && job.url) {
    return {
      ...meta,
      duration,
      format,
      quality,
      download: job.url,
      filename: job.filename || `${cleanName(meta.title)}.${format}`
    }
  }

  if (job.status === 'processing' && job.jobId) {
    return await poll(job.jobId, format, quality, { ...meta, duration })
  }

  throw 'Gagal membuat link download'
}

async function getFileSize(url) {
  try {
    const r = await axios.head(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://cnv.cx/'
      }
    })

    return Number(r.headers['content-length'] || 0)
  } catch {
    return 0
  }
}

async function downloadBuffer(url) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Referer': 'https://cnv.cx/'
    },
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })

  return Buffer.from(r.data)
}

async function fixVideoForWA(buffer) {
  const input = path.join(os.tmpdir(), `yt-in-${Date.now()}.mp4`)
  const output = path.join(os.tmpdir(), `yt-out-${Date.now()}.mp4`)

  fs.writeFileSync(input, buffer)

  try {
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i', input,
        '-c', 'copy',
        '-movflags', '+faststart',
        output
      ])

      let err = ''

      ffmpeg.stderr.on('data', data => {
        err += data.toString()
      })

      ffmpeg.on('error', () => {
        reject(new Error('FFmpeg tidak ditemukan / belum terinstall'))
      })

      ffmpeg.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(err || 'FFmpeg gagal memproses video'))
      })
    })

    return fs.readFileSync(output)
  } finally {
    try { fs.unlinkSync(input) } catch {}
    try { fs.unlinkSync(output) } catch {}
  }
}

let handler = async (m, { conn, text, command }) => {
  if (!text) {
    return m.reply(
      `Masukkan judul atau URL YouTube\n\nContoh:\n.ytmp3 night changes\n.ytmp4 https://youtu.be/xxxx 720`
    )
  }

  await m.reply('_✨ otw..._')

  try {
    const isVideo = /^(ytv|ytmp4)$/i.test(command)
    const format = isVideo ? 'mp4' : 'mp3'

    let args = text.trim().split(/\s+/)
    let last = args[args.length - 1]
    let quality = /^\d+$/.test(last) ? last : null

    if (quality) args.pop()

    const query = args.join(' ')
    if (!query) throw 'Query kosong'

    const res = await y2mate(query, format, quality)

    if (!res?.download) throw 'Link download tidak ditemukan'

    const size = await getFileSize(res.download)

    if (format === 'mp4') {
      if (res.duration > MAX_VIDEO_DURATION || size > MAX_UPLOAD_SIZE) {
        return m.reply(
          `乂 *YTMP4 - LINK DOWNLOAD*

🎬 *Judul:* ${res.title}
👤 *Author:* ${res.author}
⏱️ *Durasi:* ${res.duration ? Math.floor(res.duration / 60) + ':' + String(res.duration % 60).padStart(2, '0') : 'Unknown'}
📦 *Size:* ${formatSize(size)}
🎞️ *Quality:* ${res.quality || 'Default'}

⚠️ Video terlalu panjang / besar untuk dikirim langsung.
🔗 *Download:* ${res.download}`
        )
      }
    } else {
      if (size > MAX_UPLOAD_SIZE) {
        return m.reply(
          `乂 *YTMP3 - LINK DOWNLOAD*

🎵 *Judul:* ${res.title}
👤 *Author:* ${res.author}
📦 *Size:* ${formatSize(size)}
🎧 *Quality:* ${res.quality || 'Default'}

⚠️ Audio terlalu besar untuk dikirim langsung.
🔗 *Download:* ${res.download}`
        )
      }
    }

    if (format === 'mp3') {
      const audio = await downloadBuffer(res.download)

      await conn.sendMessage(
        m.chat,
        {
          audio,
          mimetype: 'audio/mpeg',
          fileName: res.filename || `${cleanName(res.title)}.mp3`
        },
        { quoted: m }
      )
    } else {
      const rawVideo = await downloadBuffer(res.download)
      const video = await fixVideoForWA(rawVideo)

      await conn.sendMessage(
        m.chat,
        {
          video,
          mimetype: 'video/mp4',
          fileName: res.filename || `${cleanName(res.title)}.mp4`,
          caption: `🎬 *${res.title}*\n👤 ${res.author}`
        },
        { quoted: m }
      )
    }

  } catch (e) {
    m.reply('❌ Gagal: ' + (e?.message || e))
  }
}

handler.help = ['yta', 'ytmp3', 'ytv', 'ytmp4']
handler.tags = ['downloader']
handler.command = /^(yta|ytmp3|ytv|ytmp4)$/i
handler.limit = true

export default handler