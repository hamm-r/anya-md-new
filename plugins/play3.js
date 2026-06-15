import yts from 'yt-search'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
} from '@itsliaaa/baileys'

const execPromise = promisify(exec)

function cleanName(name = 'file') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function pickFile(tmpDir, id) {
  return fs.readdirSync(tmpDir).find(v => v.startsWith(String(id)))
}

async function getThumb(input) {
  try {
    let buffer

    if (Buffer.isBuffer(input)) {
      buffer = input
    } else if (typeof input === 'string' && /^https?:\/\//i.test(input)) {
      const res = await fetch(input)
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      const res = await fetch('https://u.pone.rs/arpqzmrr.jpg')
      buffer = Buffer.from(await res.arrayBuffer())
    }

    return await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer()
  } catch {
    return Buffer.alloc(0)
  }
}

async function downloadYt(url, type, id, tmpDir) {
  const output = path.join(tmpDir, `${id}.%(ext)s`)

  const format = type === 'mp4'
    ? 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best'
    : 'bestaudio[ext=m4a]/bestaudio/best'

  const cmd = [
    'yt-dlp',
    '--no-update',
    fs.existsSync('cookies.txt') ? '--cookies cookies.txt' : '',
    '--extractor-args "youtube:player_client=android,ios"',
    '-f', `"${format}"`,
    type === 'mp4' ? '--merge-output-format mp4' : '',
    '--no-playlist',
    '-o', `"${output}"`,
    `"${url}"`
  ].filter(Boolean).join(' ')

  await execPromise(cmd, {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 50
  })

  const result = pickFile(tmpDir, id)
  if (!result) throw `File ${type.toUpperCase()} tidak ditemukan.`

  return path.join(tmpDir, result)
}

async function sendNativePlay(conn, m, thumb, videos, usedPrefix, command, query) {
  const top = videos[0]

  const media = await prepareWAMessageMedia(
    { image: thumb },
    { upload: conn.waUploadToServer }
  )

  const sections = videos.slice(0, 10).map((v, i) => ({
    title: `#${i + 1}. ${v.title}`.slice(0, 99),
    highlight_label: v.timestamp || '-',
    rows: [
      {
        title: 'Download Audio/M4A 🎵',
        description: 'Audio biasa',
        id: `${usedPrefix + command} ${v.url} mp3`
      },
      {
        title: 'Download Video/MP4 📹',
        description: 'Video 480p',
        id: `${usedPrefix + command} ${v.url} mp4`
      },
      {
        title: 'Download Audio/MP3 💽',
        description: 'Audio dokumen',
        id: `.ytmp3 ${v.url}`
      },
      {
        title: 'Download Voice Note 🎙️',
        description: 'Kirim sebagai VN',
        id: `.playvn ${v.url}`
      }
    ]
  }))

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create({
              title: '',
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            }),
            body: proto.Message.InteractiveMessage.Body.create({
              text:
`🔍 *YouTube Search*

${top.title}`
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text:
`👤 Channel: ${top.author?.name || '-'}
⏱ Duration: ${top.timestamp || '-'}
📅 Rilis: ${top.ago || '-'}
👁️ Views: ${top.views?.toLocaleString() || '-'}
🔗 ${top.url}`
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: [
                {
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: '🔎 Pilih hasil / format download',
                    sections
                  })
                }
              ]
            }),
            contextInfo: {
              mentionedJid: [m.sender],
              stanzaId: m.key?.id,
              participant: m.sender,
              quotedMessage: m.message
            }
          })
        }
      }
    },
    { quoted: m }
  )

  await conn.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id
  })
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Masukkan judul lagu/video!\n\nContoh:\n${usedPrefix + command} night changes`
  }

  await m.react('🕒')

  const args = text.trim().split(/\s+/)
  const last = args[args.length - 1].toLowerCase()

  let type = ''
  if (['mp3', 'audio', 'm4a'].includes(last)) {
    type = 'mp3'
    args.pop()
  } else if (['mp4', 'video'].includes(last)) {
    type = 'mp4'
    args.pop()
  }

  let query = args.join(' ').trim()
  if (!query) throw 'Masukkan judulnya juga.'

  let data

  if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
    const search = await yts({ videoId: query.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1] })
    data = search
  } else {
    const search = await yts(query)
    const videos = search.videos || []

    if (!videos.length) throw 'Video tidak ditemukan.'

    const thumb = await getThumb(videos[0].thumbnail || global.thumb)

    if (!type) {
      await sendNativePlay(conn, m, thumb, videos, usedPrefix, command, query)
      await m.react('✅')
      return
    }

    data = videos[0]
  }

  if (!data?.url) throw 'Video tidak ditemukan.'

  const thumb = await getThumb(data.thumbnail || global.thumb)

  await conn.sendMessage(m.chat, {
    image: thumb,
    caption:
`🕒 *DOWNLOAD ${type.toUpperCase()}*

❀ Title:
${data.title}

❀ Duration : ${data.timestamp || '-'}
❀ Quality  : ${type === 'mp4' ? '480p' : 'Audio'}
❀ Status   : Sedang diproses...`
  }, { quoted: m })

  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const id = Date.now()
  let filePath = ''

  try {
    filePath = await downloadYt(data.url, type, id, tmpDir)

    if (type === 'mp3') {
      await conn.sendMessage(m.chat, {
        audio: fs.readFileSync(filePath),
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `${cleanName(data.title)}.m4a`
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: fs.readFileSync(filePath),
        mimetype: 'video/mp4',
        fileName: `${cleanName(data.title)}.mp4`,
        caption: `✅ ${data.title}`
      }, { quoted: m })
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await m.react('✅')
  } catch (e) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)

    console.log(e)
    await m.react('❌')

    throw `Gagal download ${type.toUpperCase()}.

${e.message || e}

Coba update yt-dlp:
pip install -U yt-dlp`
  }
}

handler.help = ['play3 <judul>']
handler.tags = ['downloader']
handler.command = /^(play3|ytplay)$/i
handler.limit = true
handler.register = false

export default handler