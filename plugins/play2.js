import yts from 'yt-search'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

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
    ? '"bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best"'
    : '"bestaudio[ext=m4a]/bestaudio/best"'

  const cmd = [
    'yt-dlp',
    '--no-update',
    '--cookies', 'cookies.txt',
    '--extractor-args', '"youtube:player_client=android,ios"',
    '-f', format,
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

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Masukkan judul lagu/video!\n\nContoh:\n${usedPrefix + command} night changes`
  }

  await m.react('🕒')

  const args = text.trim().split(/\s+/)
  const last = args[args.length - 1].toLowerCase()

  let type = ''
  if (['mp3', 'audio'].includes(last)) {
    type = 'mp3'
    args.pop()
  } else if (['mp4', 'video'].includes(last)) {
    type = 'mp4'
    args.pop()
  }

  const query = args.join(' ').trim()
  if (!query) throw 'Masukkan judulnya juga.'

  const search = await yts(query)
  const data = search.videos[0]
  if (!data) throw 'Video tidak ditemukan.'

  const thumb = await getThumb(data.thumbnail || global.thumb)

  if (!type) {
    await conn.relayMessage(
      m.chat,
      {
        buttonsMessage: {
          locationMessage: {
            degreesLatitude: 0,
            degreesLongitude: 0,
            name: data.title,
            address: data.author.name,
            jpegThumbnail: thumb
          },

          contentText:
`🌸 「 PLAY YOUTUBE 」 🌸

❀ Title :
${data.title}

❀ Duration : ${data.timestamp}
❀ Views    : ${data.views.toLocaleString()}
❀ Author   : ${data.author.name}

❀ Url :
${data.url}

Pilih format download di bawah ini.`,

          footerText: global.wm || '❀ ᴀɴʏᴀ ᴍᴅ ❀',

          buttons: [
            {
              buttonId: `${usedPrefix + command} ${query} mp3`,
              buttonText: {
                displayText: '🎧 MP3'
              },
              type: 1
            },
            {
              buttonId: `${usedPrefix + command} ${query} mp4`,
              buttonText: {
                displayText: '🎬 MP4'
              },
              type: 1
            }
          ],

          headerType: 6
        }
      },
      {}
    )

    await m.react('✅')
    return
  }

  await conn.relayMessage(
    m.chat,
    {
      buttonsMessage: {
        locationMessage: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: data.title,
          address: `${type.toUpperCase()} Downloader`,
          jpegThumbnail: thumb
        },

        contentText:
`🕒 「 DOWNLOAD ${type.toUpperCase()} 」 🕒

❀ Title :
${data.title}

❀ Duration : ${data.timestamp}
❀ Quality  : ${type === 'mp4' ? '480p' : 'Audio'}
❀ Status   : Sedang diproses...`,

        footerText: global.wm || '❀ ᴀɴʏᴀ ᴍᴅ ❀',

        buttons: [
          {
            buttonId: '.menu',
            buttonText: {
              displayText: '📋 Menu'
            },
            type: 1
          }
        ],

        headerType: 6
      }
    },
    {}
  )

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

handler.help = ['play2 <judul>']
handler.tags = ['downloader']
handler.command = /^(play2|ytplay)$/i
handler.limit = true
handler.register = false

export default handler